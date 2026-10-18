#!/usr/bin/env bash
# Build, apply Terraform and publish the three frontends to one site for one environment.
# Usage: infra/scripts/deploy.sh <env> <aws-profile> [--yes]   e.g. infra/scripts/deploy.sh dev javesonpersonal
# --yes skips both confirmations (account and plan) for shells that cannot answer prompts.
# Needs gitignored infra/terraform/envs/<env>/terraform.tfvars and backend.hcl (copy the .example files).
set -euo pipefail

ENV_NAME="${1:-}"
PROFILE="${2:-}"
ASSUME_YES="${3:-}"
if [[ -z "$ENV_NAME" || -z "$PROFILE" || (-n "$ASSUME_YES" && "$ASSUME_YES" != "--yes") ]]; then
  echo "Usage: $0 <env> <aws-profile> [--yes]" >&2
  exit 64
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$ROOT/infra/terraform/envs/$ENV_NAME"
PLAN_FILE="$ROOT/infra/terraform/build/$ENV_NAME.tfplan"
ASSET_CACHE="public,max-age=31536000,immutable"
SHELL_CACHE="no-cache"

confirm() {
  if [[ "$ASSUME_YES" == "--yes" ]]; then
    echo "$1 yes (--yes)"
    return 0
  fi
  read -r -p "$1 [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]]
}

# Upload one built app under a bucket prefix ("" for the root, otherwise ending in "/").
# Extra arguments are additional excludes for the shell sync.
publish_app() {
  local dist="$1" prefix="$2"
  shift 2
  if [[ ! -d "$dist" ]]; then
    echo "Missing build output $dist (the frontend build did not produce it)." >&2
    exit 1
  fi
  echo "Publishing $dist to s3://$BUCKET/$prefix..."
  # Hashed assets never change, so browsers may keep them for a year.
  if [[ -d "$dist/assets" ]]; then
    aws s3 sync "$dist/assets" "s3://$BUCKET/${prefix}assets" --cache-control "$ASSET_CACHE" --profile "$PROFILE" --region "$REGION"
  fi
  # The app shell, service worker and manifest must always be revalidated so new releases reach installed PWAs.
  aws s3 sync "$dist" "s3://$BUCKET/$prefix" --delete --exclude "assets/*" "$@" --cache-control "$SHELL_CACHE" --profile "$PROFILE" --region "$REGION"
  if [[ -f "$dist/manifest.webmanifest" ]]; then
    aws s3 cp "$dist/manifest.webmanifest" "s3://$BUCKET/${prefix}manifest.webmanifest" --content-type "application/manifest+json" --cache-control "$SHELL_CACHE" --profile "$PROFILE" --region "$REGION"
  fi
}

for file in terraform.tfvars backend.hcl; do
  if [[ ! -f "$TF_DIR/$file" ]]; then
    echo "Missing $TF_DIR/$file (copy $file.example and fill it in)." >&2
    exit 1
  fi
done

echo "AWS identity for profile $PROFILE:"
aws sts get-caller-identity --profile "$PROFILE" --query '[Account, Arn]' --output text
confirm "Deploy $ENV_NAME to this account?" || exit 1

echo "Building the API..."
(cd "$ROOT" && pnpm install --frozen-lockfile && pnpm --filter @sdh/api build)

echo "Planning $ENV_NAME..."
mkdir -p "$(dirname "$PLAN_FILE")"
terraform -chdir="$TF_DIR" init -input=false -backend-config=backend.hcl
terraform -chdir="$TF_DIR" plan -input=false -var "aws_profile=$PROFILE" -out="$PLAN_FILE"
confirm "Apply this plan?" || exit 1
terraform -chdir="$TF_DIR" apply -input=false "$PLAN_FILE"
rm -f "$PLAN_FILE"

REGION="$(terraform -chdir="$TF_DIR" output -raw aws_region)"
COGNITO_USER_POOL_ID="$(terraform -chdir="$TF_DIR" output -raw cognito_user_pool_id)"
COGNITO_CLIENT_ID="$(terraform -chdir="$TF_DIR" output -raw cognito_client_id)"
SITE="$(terraform -chdir="$TF_DIR" output -json site | node -e '
const site = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(site.bucket_name, site.distribution_id, site.domain_name);
')"
read -r BUCKET DISTRIBUTION DOMAIN <<< "$SITE"

# Cognito ids are public client settings; they are baked into each build.
echo "Building the frontends..."
(
  cd "$ROOT"
  export VITE_COGNITO_REGION="$REGION"
  export VITE_COGNITO_USER_POOL_ID="$COGNITO_USER_POOL_ID"
  export VITE_COGNITO_CLIENT_ID="$COGNITO_CLIENT_ID"
  export VITE_DEMO_SIGN_IN=false
  pnpm --filter @sdh/portal --filter @sdh/elderly-web --filter @sdh/web build
)

# The root sync must not delete the two apps that live under their own prefixes.
publish_app "$ROOT/apps/portal/dist" "" --exclude "elder/*" --exclude "volunteer/*"
publish_app "$ROOT/apps/elderly-web/dist" "elder/"
publish_app "$ROOT/apps/web/dist" "volunteer/"

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/*" --profile "$PROFILE" --region "$REGION" --query 'Invalidation.Id' --output text

echo "Done. CloudFront may take a few minutes to serve the new build everywhere."
echo "Sign in:   https://$DOMAIN/"
echo "Elderly:   https://$DOMAIN/elder/"
echo "Volunteer: https://$DOMAIN/volunteer/"
