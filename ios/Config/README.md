# Local MVP configuration

The iOS build normally takes its configuration from the project's own
`apk/ui/.env.local`, the same file Gradle reads for Android. The
**Generate Sanskriti config** build phase copies the `NVIDIA_*` values into
`Sanskriti-Generated.plist` inside the app bundle. Nothing else is needed.

To override without touching that file — for example to try a different model
on a device — set the variables under **Product → Scheme → Edit Scheme → Run →
Arguments → Environment Variables**:

```text
NVIDIA_API_KEY=<copy the value from apk/ui/.env.local>
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_VISION_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
```

Environment variables win over the generated plist, and only apply when the app
is launched from Xcode.

Never commit a key, and never put one in `Info.plist`. Anything inside an app
bundle can be extracted from a device, so these are temporary MVP-only testing
credentials; the separate API server is where production keys belong.
