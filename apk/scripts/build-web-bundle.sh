#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APK_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="$(cd "$APK_DIR/.." && pwd)"
WEB_UI_DIR="$WORKSPACE_DIR/web-ui"
NODE_MODULES_DIR="$WORKSPACE_DIR/node_modules"
ASSET_DIR="$APK_DIR/app/src/main/assets/www"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sanskriti-mobile-web.XXXXXX")"

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

mkdir -p "$TEMP_DIR/web-ui"
rsync -a \
  --exclude '.next' \
  --exclude 'out' \
  --exclude 'node_modules' \
  --exclude 'app/api' \
  "$WEB_UI_DIR/" "$TEMP_DIR/web-ui/"
ln -s "$NODE_MODULES_DIR" "$TEMP_DIR/web-ui/node_modules"

(
  cd "$TEMP_DIR/web-ui"
  SANSKRITI_MOBILE_BUNDLE=1 "$NODE_MODULES_DIR/.bin/next" build
)

rm -rf "$ASSET_DIR"
mkdir -p "$ASSET_DIR"
rsync -a "$TEMP_DIR/web-ui/out/" "$ASSET_DIR/"

echo "Bundled web UI written to $ASSET_DIR"
