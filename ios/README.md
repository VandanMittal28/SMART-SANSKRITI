# Sanskriti AI iOS

Native SwiftUI client for the Sanskriti AI heritage guide. The app targets iOS 18+ and uses only Apple frameworks so it can be opened and built immediately in Xcode.

## Open and run

1. Open `SanskritiAI.xcodeproj` in Xcode.
2. Select the `SanskritiAI` scheme and your connected iPhone.
3. In **Signing & Capabilities**, select your personal Apple team and change the bundle identifier if needed.
4. Set `SANSKRITI_API_BASE_URL` and `SANSKRITI_SUPABASE_URL`/`SANSKRITI_SUPABASE_ANON_KEY` in the scheme environment, or use the built-in offline demo data.

The app deliberately keeps AI calls behind the existing server API. Do not put NVIDIA keys in the app.

The current Xcode scheme includes the native shell and service layer. Feature screens can be expanded from `Views.swift`; the existing Android/WebView routes remain the behavioral reference while native parity is completed.
