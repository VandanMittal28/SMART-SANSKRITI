# Sanskriti AI Android APK

This folder is the complete Sanskriti AI Android project. Its mobile UI source
is kept internally in `ui/` and packaged as app assets during each APK build.

The APK uses Android's WebView only as its internal rendering engine; it does
not load the UI from Vercel or require a Mac development server. The native
integration supports camera scans, microphone access, location, file uploads,
downloads, persistent cookies/local storage, Android back navigation, and an
offline/retry screen. Android-native text-to-speech is bridged into the UI for
Yatrik, Chat, Audio Guide, Heritage Stories, and Hunt narration.

The APK also includes a native, presentation-neutral AR navigation controller
for Explore. It owns just-in-time camera/location permission state, live GPS,
device heading, bearing and distance math, geofence validation, waypoint
projection, edge-arrow state, fallback status, and activity lifecycle cleanup.
Its bridge contract is documented in [`docs/ar-navigation-controller.md`](docs/ar-navigation-controller.md).

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

`scripts/build-mobile-ui.sh` compiles the internal `ui/` source and writes it
to the generated Android asset folder. Gradle runs this automatically before
compiling the APK. There is no separate website project or server route bundle.

The app serves these files internally from:

`https://appassets.androidplatform.net/`

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

The mobile UI build reads `ui/.env.local`, while Android build settings can use
the project-level `.env.local`. Private env files remain ignored by Git.
