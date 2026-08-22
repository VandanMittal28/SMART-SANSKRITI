# Sanskriti AI

This repository contains one self-contained Android application:

- [`apk/`](apk/) — the native Android project, Android integrations, and the
  mobile UI source bundled directly into every APK.

## Build

```bash
cd apk
./gradlew assembleDebug
```

The debug APK is written to `apk/app/build/outputs/apk/debug/app-debug.apk`.

The APK runs from files packaged inside the app and does not require a website,
Vercel deployment, or local development server.
