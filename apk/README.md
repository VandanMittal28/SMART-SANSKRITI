# Sanskriti AI Android APK

This folder is an independent Android project. It exports the Sanskriti web UI
as static files and packages those files inside the APK.

The APK uses Android's WebView only as its internal rendering engine; it does
not load the UI from Vercel or require a Mac development server. The native
integration supports camera scans, microphone access, location, file uploads,
downloads, persistent cookies/local storage, Android back navigation, and an
offline/retry screen. Android-native text-to-speech is bridged into the UI for
Yatrik, Chat, Audio Guide, Heritage Stories, and Hunt narration.

## Demo behavior

- This is an installable Android app with its own Sanskriti AI icon, launch
  screen, full-screen app surface, permissions, back navigation, and lifecycle.
- All current static Next.js routes and monument detail pages are bundled in
  the APK and open without a website deployment.
- Camera recognition, voice input, Yatrik narration, hunt location, file
  selection, ticket links, and downloads use Android-compatible integrations.
- Supabase-backed screens use the internet directly. Until the separate AI API
  server is connected, chat, quiz, itinerary, sustainability, narration, and
  recognition screens use curated local fallbacks instead of blocking the demo.
- Voice questions are recorded inside the app with the phone microphone and
  transcribed by the configured NVIDIA multimodal model. No Google speech
  dialog is opened. Android-native text-to-speech reads guide answers aloud.

## Bundled UI

`scripts/build-web-bundle.sh` creates a static mobile export from `../web-ui`
without its Next.js API routes, then writes it to the generated Android asset
folder. Gradle runs this script automatically before compiling the APK.

The app serves these files internally from:

`https://appassets.androidplatform.net/`

For temporary remote-development testing only, `.env.local` may override the
bundled URL:

```dotenv
SANSKRITI_APP_URL=http://10.0.2.2:3002
```

Do not add private production keys to the APK. Any value compiled into an APK
can be extracted. The future separate API server should hold private AI keys.

## Build

Open this folder in Android Studio and select **Build > Build APK(s)**, or run:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assembleDebug
```

The debug APK is written to:

`app/build/outputs/apk/debug/app-debug.apk`

The latest local demo copy is `Sanskriti-AI-debug.apk`. APK files and generated
web assets are ignored by Git intentionally; Gradle regenerates the assets from
source before every relevant build.

For a distributable release, create a signing key and configure a release
signing block in `app/build.gradle`; Android Studio's **Generate Signed Bundle /
APK** wizard can do this without storing the password in source control.

## Configuration safety

The static export reads the web project's `.env.local`. Only `NEXT_PUBLIC_*`
values can enter browser code. Private env files remain ignored by Git.
