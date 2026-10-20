#!/usr/bin/env bash
# Upload the three built frontends to one site bucket. Shared by deploy.sh and the deploy workflow.
# Usage: infra/scripts/publish-site.sh <bucket> <region> [aws-profile]   (no profile: use the ambient credentials)
set -euo pipefail

BUCKET="${1:-}"
REGION="${2:-}"
PROFILE="${3:-}"
if [[ -z "$BUCKET" || -z "$REGION" ]]; then
  echo "Usage: $0 <bucket> <region> [aws-profile]" >&2
  exit 64
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ASSET_CACHE="public,max-age=31536000,immutable"
SHELL_CACHE="no-cache"
AWS_ARGS=(--region "$REGION")
if [[ -n "$PROFILE" ]]; then AWS_ARGS+=(--profile "$PROFILE"); fi

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
    aws s3 sync "$dist/assets" "s3://$BUCKET/${prefix}assets" --cache-control "$ASSET_CACHE" "${AWS_ARGS[@]}"
  fi
  # The app shell, service worker and manifest must always be revalidated so new releases reach installed PWAs.
  aws s3 sync "$dist" "s3://$BUCKET/$prefix" --delete --exclude "assets/*" "$@" --cache-control "$SHELL_CACHE" "${AWS_ARGS[@]}"
  if [[ -f "$dist/manifest.webmanifest" ]]; then
    aws s3 cp "$dist/manifest.webmanifest" "s3://$BUCKET/${prefix}manifest.webmanifest" --content-type "application/manifest+json" --cache-control "$SHELL_CACHE" "${AWS_ARGS[@]}"
  fi
}

# The root sync must not delete the two apps that live under their own prefixes.
publish_app "$ROOT/apps/portal/dist" "" --exclude "elder/*" --exclude "volunteer/*"
publish_app "$ROOT/apps/elderly-web/dist" "elder/"
publish_app "$ROOT/apps/web/dist" "volunteer/"
