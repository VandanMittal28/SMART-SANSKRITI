#!/bin/sh
# Copies the shared visitor UI into the app bundle and verifies the copy.
#
# The export itself is produced by apk/scripts/build-mobile-ui.sh (which Gradle
# runs automatically for Android). It is deliberately not committed, so a fresh
# clone has to build it once before the iOS target can package it.
set -e

SOURCE="$SRCROOT/../apk/app/src/main/assets/www"
DEST="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/www"

if [ ! -d "$SOURCE" ]; then
  echo "error: Bundled visitor UI not found at $SOURCE"
  echo "note: Run 'apk/scripts/build-mobile-ui.sh' once, or build the Android app, then build again."
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SOURCE/" "$DEST/"

# A half-copied bundle produces an app that launches to a blank WebView, which
# is a miserable thing to debug. Fail the build here instead.
if [ -x /usr/bin/python3 ] && [ -f "$SRCROOT/scripts/ui-manifest.py" ]; then
  /usr/bin/python3 "$SRCROOT/scripts/ui-manifest.py" --check --assets "$DEST" \
    || { echo "error: The copied visitor UI does not match its manifest."; exit 1; }
fi

if [ ! -f "$DEST/index.html" ]; then
  echo "error: The copied visitor UI has no index.html."
  exit 1
fi
