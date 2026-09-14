# Local MVP configuration

For temporary physical-device testing, add these environment variables to the Xcode scheme under **Product → Scheme → Edit Scheme → Run → Arguments → Environment Variables**:

```text
NVIDIA_API_KEY=<copy the value from apk/ui/.env.local>
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
```

The iOS MVP uses the NVIDIA key directly when `NVIDIA_API_KEY` is present and falls back to the protected `/api/chat` server route otherwise. Never commit the key, put it in `Info.plist`, or paste it into source files. Direct client keys are temporary MVP-only testing configuration because they can be extracted from a device build.
