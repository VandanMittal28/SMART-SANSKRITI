#!/bin/sh
# Writes Sanskriti-Generated.plist into the app bundle from the same .env.local
# that Gradle reads for Android's BuildConfig, so both platforms are configured
# from one file.
#
# Only the server-side NVIDIA values go here. The Supabase values are already
# compiled into the web bundle by Next.js at export time.
#
# A key placed in an app bundle can be extracted from the device. This is for
# local MVP builds; production belongs behind the separate API server.
set -e

DEST_DIR="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
DEST="$DEST_DIR/Sanskriti-Generated.plist"
mkdir -p "$DEST_DIR"

ENV_FILE=""
for candidate in "$SRCROOT/../apk/.env.local" "$SRCROOT/../apk/ui/.env.local"; do
  if [ -f "$candidate" ]; then ENV_FILE="$candidate"; fi
done

/usr/libexec/PlistBuddy -c "Clear dict" "$DEST" >/dev/null 2>&1 \
  || /usr/libexec/PlistBuddy -c "Save" "$DEST" >/dev/null 2>&1 \
  || printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict/></plist>' > "$DEST"

if [ -z "$ENV_FILE" ]; then
  echo "warning: No .env.local found; AI features will use their local fallbacks."
  exit 0
fi

for KEY in NVIDIA_API_KEY NVIDIA_MODEL NVIDIA_VISION_MODEL NVIDIA_SPEECH_MODEL NVIDIA_TRANSLATION_MODEL; do
  # Last definition wins, matching dotenv; strip optional surrounding quotes.
  VALUE=$(grep -E "^[[:space:]]*$KEY=" "$ENV_FILE" | tail -n 1 | sed -E "s/^[[:space:]]*$KEY=//" | sed -E "s/^[\"']//" | sed -E "s/[\"']$//" || true)
  if [ -n "$VALUE" ]; then
    /usr/libexec/PlistBuddy -c "Add :$KEY string $VALUE" "$DEST" >/dev/null 2>&1 \
      || /usr/libexec/PlistBuddy -c "Set :$KEY $VALUE" "$DEST" >/dev/null 2>&1 || true
  fi
done

echo "Sanskriti config written from $ENV_FILE"
