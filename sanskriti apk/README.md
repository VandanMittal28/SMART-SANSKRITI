# Sanskriti AI Android APK

This folder is an independent native Android project. It packages Sanskriti AI
as an Android application while keeping the existing Next.js folder untouched.

The APK uses Android's WebView as the presentation layer so every current page
and server-backed feature stays in sync with the main Sanskriti app. The native
integration adds support for camera scans, microphone access, location, file
uploads, downloads, persistent cookies/local storage, Android back navigation,
and an offline/retry screen.

## App URL

The build defaults to the public production app at
`https://smart-sanskriti.vercel.app`, so the prepared APK works on a connected
Android phone immediately.

For local development, add this to this folder's private `.env.local`:

```dotenv
SANSKRITI_APP_URL=http://10.0.2.2:3000
```

`10.0.2.2` is Android Emulator's address for a Next.js server running on the
Mac:

```bash
# In the original folder
npm run dev
```

To use another deployed server, add one of these lines to this folder's private
`.env.local`:

```dotenv
SANSKRITI_APP_URL=https://your-sanskriti-deployment.example
# or
NEXT_PUBLIC_APP_URL=https://your-sanskriti-deployment.example
```

Only the app URL is compiled into the APK. NVIDIA, ElevenLabs, Supabase, and
other private keys remain server-side and are deliberately not embedded in the
APK, where they could be extracted.

## Build

Open this folder in Android Studio and select **Build > Build APK(s)**, or run:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assembleDebug
```

The debug APK is written to:

`app/build/outputs/apk/debug/app-debug.apk`

This prepared folder also includes the latest successful build at
`Sanskriti-AI-debug.apk` for easy installation.

For a distributable release, create a signing key and configure a release
signing block in `app/build.gradle`; Android Studio's **Generate Signed Bundle /
APK** wizard can do this without storing the password in source control.

## Configuration safety

The web project's `.env.local`, `.env.production.local`, and `.env.example` are
mirrored into this folder. Private env files are ignored by this project's
`.gitignore`. Do not remove those ignore rules or commit secrets.
