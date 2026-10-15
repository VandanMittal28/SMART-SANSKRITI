# Sanskriti AI for iOS

The iPhone client. Like the Android app, it is a native shell around the shared
visitor UI in [`apk/ui/`](../apk/ui): the same screens run on both platforms,
and each shell supplies the native capability behind them.

## Prerequisites

The shared UI is compiled into a static export that both shells package. It is
not committed, so build it once before the first iOS build:

```sh
cd apk && ./scripts/build-mobile-ui.sh
```

Building the Android app does this automatically. The iOS "Bundle visitor UI"
phase copies the result and verifies it against `ui-manifest.json`, so a partial
copy fails the build instead of shipping a blank WebView.

## Open and run

1. Open `SanskritiAI.xcodeproj` (iOS 18+, Xcode 16+).
2. Select the `SanskritiAI` scheme and a simulator or your iPhone.
3. In **Signing & Capabilities**, choose your team and change the bundle
   identifier if `ai.sanskriti.ios` is taken.
4. Run. `⌘U` runs the navigation-maths tests.

## How it works

`SanskritiViewController` starts `BundledUIServer`, a loopback HTTP server
bound to `127.0.0.1`, and loads the bundled UI from it. HTTP rather than a
custom URL scheme because the audio guides need byte-range requests, and
because `localStorage`, cookies and CORS then behave exactly as they do on
Android.

`NativeBridge` injects `window.SanskritiAndroid` and `window.SanskritiAndroidAR`
with the same method signatures and the same `sanskriti-*` events the Android
shell provides, so the shared UI needs no iOS-specific branches.

| Capability | Provided by |
| --- | --- |
| Narration (Yatrik, Chat, Audio Guide, Stories, Hunt) | `SpeechService` via `AVSpeechSynthesizer`, behind a `window.speechSynthesis` shim |
| Voice questions | `MicrophoneService`, 16 kHz mono PCM-16 WAV, matching Android |
| Chat, recognition, translation, Heritage Watch | `NvidiaService`, including the hosted-function polling path |
| AR navigation in Explore | `ARNavigationService` (Core Location), emitting the same state JSON as `ArNavigationState.java` |
| Camera for AR and Heritage Watch | `getUserMedia` in WKWebView, granted per-origin by the UI delegate |
| Monument operations console | `/api/demo/*` proxied by `BundledUIServer` to `127.0.0.1:3100` |
| Light/dark theme | `setTheme` bridge method, applied to the native container |
| External links, tickets, maps | Opened in Safari by the navigation delegate |

### One deliberate difference from Android

Android's `@JavascriptInterface` methods are synchronous; WKWebView message
handlers are not. Three methods the shared UI calls synchronously are answered
in JavaScript from state the native side pushes into the page
(`isNativeApp`, `getNvidiaModel`, `getArNavigationState`). `demoReportRequest`
cannot be made synchronous at all, so iOS omits it and proxies those requests
through the bundled server instead.

Heading comes from `CLHeading.trueHeading` with the orientation pinned to
portrait, where Android derives it from the rotation matrix. Held upright for
AR the two agree; lying flat they can differ.

## Configuration

The "Generate Sanskriti config" phase reads the same `apk/ui/.env.local` that
Gradle reads and writes `Sanskriti-Generated.plist` into the app bundle.
Scheme environment variables still override it for quick local testing — see
[`Config/README.md`](Config/README.md).

Without a key the AI features fall back to curated local content, exactly as on
Android. A key placed in an app bundle can be extracted from the device, so
this is for local MVP builds only; production belongs behind the separate API
server.
