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

confirm() {
  if [[ "$ASSUME_YES" == "--yes" ]]; then
    echo "$1 yes (--yes)"
    return 0
  fi
  read -r -p "$1 [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]]
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

"$ROOT/infra/scripts/publish-site.sh" "$BUCKET" "$REGION" "$PROFILE"

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/*" --profile "$PROFILE" --region "$REGION" --query 'Invalidation.Id' --output text

echo "Done. CloudFront may take a few minutes to serve the new build everywhere."
echo "Sign in:   https://$DOMAIN/"
echo "Elderly:   https://$DOMAIN/elder/"
echo "Volunteer: https://$DOMAIN/volunteer/"
