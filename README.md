# Sanskriti AI

The repository is split into two independent applications:

- [`web-ui/`](web-ui/) — the Next.js web and PC application, including its API routes, assets, Supabase files, and local AI services.
- [`apk/`](apk/) — the native Android WebView wrapper and Gradle project.

## Run the web application

```bash
cd web-ui
npm install
npm run dev -- --port 3002
```

Copy `web-ui/.env.example` to `web-ui/.env.local` and fill in the required values.

## Build the Android APK

```bash
cd apk
./gradlew assembleDebug
```

The debug APK is written to `apk/app/build/outputs/apk/debug/app-debug.apk`.

The Android wrapper loads the deployed web application by default. For emulator
testing against the local web server, set `SANSKRITI_APP_URL=http://10.0.2.2:3002`
in `apk/.env.local`.
