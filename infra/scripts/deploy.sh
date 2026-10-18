#!/usr/bin/env bash
# Build, apply Terraform and publish both frontends for one environment.
# Usage: infra/scripts/deploy.sh <env> <aws-profile>   e.g. infra/scripts/deploy.sh dev javesonpersonal
# Needs gitignored infra/terraform/envs/<env>/terraform.tfvars and backend.hcl (copy the .example files).
set -euo pipefail

ENV_NAME="${1:-}"
PROFILE="${2:-}"
if [[ -z "$ENV_NAME" || -z "$PROFILE" ]]; then
  echo "Usage: $0 <env> <aws-profile>" >&2
  exit 64
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$ROOT/infra/terraform/envs/$ENV_NAME"
PLAN_FILE="$ROOT/infra/terraform/build/$ENV_NAME.tfplan"
ASSET_CACHE="public,max-age=31536000,immutable"
SHELL_CACHE="no-cache"

# Terraform site name to the frontend build it serves.
site_dist() {
  case "$1" in
    volunteer) echo "$ROOT/apps/web/dist" ;;
    elderly) echo "$ROOT/apps/elderly-web/dist" ;;
    *) return 1 ;;
  esac
}

confirm() {
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

echo "Building all packages..."
(cd "$ROOT" && pnpm install --frozen-lockfile && pnpm build)

echo "Planning $ENV_NAME..."
mkdir -p "$(dirname "$PLAN_FILE")"
terraform -chdir="$TF_DIR" init -input=false -backend-config=backend.hcl
terraform -chdir="$TF_DIR" plan -input=false -var "aws_profile=$PROFILE" -out="$PLAN_FILE"
confirm "Apply this plan?" || exit 1
terraform -chdir="$TF_DIR" apply -input=false "$PLAN_FILE"
rm -f "$PLAN_FILE"

REGION="$(terraform -chdir="$TF_DIR" output -raw aws_region)"
SITES="$(terraform -chdir="$TF_DIR" output -json sites | node -e '
const sites = JSON.parse(require("fs").readFileSync(0, "utf8"));
for (const [name, s] of Object.entries(sites)) console.log(name, s.bucket_name, s.distribution_id, s.domain_name);
')"

while read -r name bucket distribution domain; do
  dist="$(site_dist "$name")" || { echo "No build mapped for site $name" >&2; exit 1; }
  echo "Publishing $name from $dist to s3://$bucket..."
  # Hashed assets never change, so browsers may keep them for a year.
  if [[ -d "$dist/assets" ]]; then
    aws s3 sync "$dist/assets" "s3://$bucket/assets" --cache-control "$ASSET_CACHE" --profile "$PROFILE" --region "$REGION"
  fi
  # The app shell, service worker and manifest must always be revalidated so new releases reach installed PWAs.
  aws s3 sync "$dist" "s3://$bucket" --delete --exclude "assets/*" --cache-control "$SHELL_CACHE" --profile "$PROFILE" --region "$REGION"
  if [[ -f "$dist/manifest.webmanifest" ]]; then
    aws s3 cp "$dist/manifest.webmanifest" "s3://$bucket/manifest.webmanifest" --content-type "application/manifest+json" --cache-control "$SHELL_CACHE" --profile "$PROFILE" --region "$REGION"
  fi
  aws cloudfront create-invalidation --distribution-id "$distribution" --paths "/*" --profile "$PROFILE" --query 'Invalidation.Id' --output text
  echo "$name: https://$domain"
done <<< "$SITES"

echo "Done. CloudFront may take a few minutes to serve the new build everywhere."
