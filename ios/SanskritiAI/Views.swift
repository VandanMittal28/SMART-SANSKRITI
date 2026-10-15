import SwiftUI

/// The app is a single full-screen web surface, exactly like the Android
/// shell. Feature screens live in the shared bundled UI so both platforms stay
/// in step; native capability is provided through `NativeBridge` rather than
/// by reimplementing screens in SwiftUI.
struct RootView: View {
    var body: some View {
        SanskritiWebView()
            .ignoresSafeArea(.all)
            .background(Color.black)
    }
}
