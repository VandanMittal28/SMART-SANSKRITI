import SwiftUI
import UIKit
import WebKit

/// The shell's share of the design tokens in `apk/ui/app/globals.css`.
///
/// Only the few colours that are painted by UIKit rather than by the page:
/// what shows behind and around the web content, and the load progress bar.
/// Keep these in step with `--background` (`html.light` / `html.dark`) and
/// `--primary`, or the frame around the page will disagree with the page.
enum Palette {
    /// `--background` on `html.light` — #F2F2F4.
    static let light = UIColor(red: 242/255, green: 242/255, blue: 244/255, alpha: 1)
    /// `--background` on `html.dark` — #121410.
    static let dark = UIColor(red: 18/255, green: 20/255, blue: 16/255, alpha: 1)
    /// `--primary` — #F6C00A.
    static let amber = UIColor(red: 246/255, green: 192/255, blue: 10/255, alpha: 1)
}

/// Hosts the bundled visitor UI and wires it to the native services.
///
/// This is the iOS counterpart of `MainActivity` on Android: full-screen web
/// surface, native bridge, camera/microphone/location prompts, external link
/// handling, back navigation and a readable failure screen.
final class SanskritiViewController: UIViewController {
    private var webView: WKWebView!
    private var server: BundledUIServer?
    private let bridge = NativeBridge()
    private var progressObservation: NSKeyValueObservation?
    private let progressBar = UIProgressView(progressViewStyle: .bar)

    // MARK: - Lifecycle

    override func loadView() {
        let container = UIView(frame: .zero)
        container.backgroundColor = Palette.light
        view = container

        webView = makeWebView()
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isOpaque = false
        webView.backgroundColor = container.backgroundColor
        webView.scrollView.backgroundColor = container.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        // The bundled UI is a fixed-width mobile layout with a pinned bottom
        // nav; zooming it only breaks the layout and advertises the web view.
        // The viewport meta in apk/ui/app/layout.tsx already asks for this —
        // these four lines mean a stray page-level override cannot undo it,
        // and they match what Android does in MainActivity.
        webView.scrollView.minimumZoomScale = 1
        webView.scrollView.maximumZoomScale = 1
        webView.scrollView.bouncesZoom = false
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        // Matches Android's back gesture through the bundled routes.
        webView.allowsBackForwardNavigationGestures = true
        container.addSubview(webView)

        progressBar.translatesAutoresizingMaskIntoConstraints = false
        progressBar.progressTintColor = Palette.amber
        progressBar.trackTintColor = .clear
        progressBar.alpha = 0
        container.addSubview(progressBar)

        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            webView.topAnchor.constraint(equalTo: container.topAnchor),
            webView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            progressBar.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            progressBar.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            progressBar.topAnchor.constraint(equalTo: container.safeAreaLayoutGuide.topAnchor),
            progressBar.heightAnchor.constraint(equalToConstant: 3),
        ])
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        edgesForExtendedLayout = .all
        additionalSafeAreaInsets = .zero
        bridge.attach(to: webView)
        bridge.onThemeChange = { [weak self] light in
            self?.applyTheme(light: light)
        }
        observeProgress()
        startServerAndLoad()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { statusBarStyle }
    private var statusBarStyle: UIStatusBarStyle = .lightContent

    deinit {
        progressObservation?.invalidate()
        webView?.configuration.userContentController
            .removeScriptMessageHandler(forName: NativeBridge.messageHandlerName)
        server?.stop()
    }

    // MARK: - Configuration

    private func makeWebView() -> WKWebView {
        let controller = WKUserContentController()
        controller.add(bridge, name: NativeBridge.messageHandlerName)
        controller.addUserScript(bridge.bridgeUserScript())
        controller.addUserScript(bridge.shimUserScript())

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        // The AR view and the audio guides both need to play without a tap.
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.allowsAirPlayForMediaPlayback = true

        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = preferences

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        if #available(iOS 16.4, *) {
            // Safari Web Inspector, debug builds only.
            #if DEBUG
            webView.isInspectable = true
            #endif
        }
        return webView
    }

    private func observeProgress() {
        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] webView, _ in
            guard let self else { return }
            let progress = Float(webView.estimatedProgress)
            self.progressBar.setProgress(progress, animated: true)
            let finished = progress >= 0.99
            UIView.animate(withDuration: 0.2) { self.progressBar.alpha = finished ? 0 : 1 }
            if finished { self.progressBar.setProgress(0, animated: false) }
        }
    }

    private func applyTheme(light: Bool) {
        let background = light ? Palette.light : Palette.dark
        view.backgroundColor = background
        webView.backgroundColor = background
        webView.scrollView.backgroundColor = background
        statusBarStyle = light ? .darkContent : .lightContent
        setNeedsStatusBarAppearanceUpdate()
    }

    // MARK: - Loading

    private func startServerAndLoad() {
        guard let server = BundledUIServer() else {
            showFailure(
                title: "The app interface is missing",
                detail: "This build has no bundled UI. In Xcode, run the \"Bundle visitor UI\" phase, or build the Android bundle first with apk/scripts/build-mobile-ui.sh."
            )
            return
        }
        self.server = server
        server.start(ready: { [weak self] url in
            DispatchQueue.main.async {
                self?.webView.load(URLRequest(url: url))
            }
        }, failed: { [weak self] reason in
            DispatchQueue.main.async {
                self?.showFailure(
                    title: "Sanskriti could not start",
                    detail: "The app could not open its local interface server: \(reason)"
                )
            }
        })
    }

    private func showFailure(title: String, detail: String) {
        let escapedTitle = title.replacingOccurrences(of: "<", with: "&lt;")
        let escapedDetail = detail.replacingOccurrences(of: "<", with: "&lt;")
        let html = """
        <!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
        <body style="margin:0;background:#070a16;color:#f5e6d3;font-family:-apple-system,system-ui,sans-serif;padding:40px 28px">
        <h1 style="font-size:22px;margin:0 0 12px">\(escapedTitle)</h1>
        <p style="font-size:15px;line-height:1.6;color:#aeb6c8;margin:0">\(escapedDetail)</p>
        </body>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }

    /// Requests from our own loopback server stay inside the app; anything else
    /// is a real website and belongs in Safari, as on Android.
    private func isInternal(_ url: URL?) -> Bool {
        guard let url, let host = url.host else { return false }
        return host == "127.0.0.1" || host == "localhost"
    }
}

// MARK: - Navigation

extension SanskritiViewController: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        let url = navigationAction.request.url
        guard let url else { decisionHandler(.allow); return }

        if isInternal(url) || url.scheme == "about" || url.scheme == "data" {
            decisionHandler(.allow)
            return
        }

        // Ticket links, maps and payment pages open outside the app.
        if navigationAction.targetFrame == nil || navigationAction.navigationType == .linkActivated {
            decisionHandler(.cancel)
            UIApplication.shared.open(url)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard isInternal(webView.url) else { return }
        // The AR controller is only meaningful on Explore; leaving the screen
        // releases GPS and the compass, matching Android's page-start check.
        webView.evaluateJavaScript("window.location.pathname") { [weak self] value, _ in
            guard let path = value as? String else { return }
            if !path.hasPrefix("/explore") {
                self?.bridge.arNavigation.stop()
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        presentLoadFailure(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        presentLoadFailure(error)
    }

    private func presentLoadFailure(_ error: Error) {
        let code = (error as NSError).code
        // -999 is a cancelled load, which happens on every fast re-navigation.
        guard code != NSURLErrorCancelled else { return }
        showFailure(
            title: "Sanskriti could not open",
            detail: "The bundled interface failed to load: \(error.localizedDescription)"
        )
    }
}

// MARK: - UI delegate

extension SanskritiViewController: WKUIDelegate {
    /// Without this, `getUserMedia` is refused outright and both the AR camera
    /// and Heritage Watch stay dark. The system still shows its own
    /// camera/microphone prompt the first time.
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        // Only our own bundled origin may reach the camera or microphone.
        let host = origin.host
        decisionHandler(host == "127.0.0.1" || host == "localhost" ? .prompt : .deny)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        // target="_blank" has no window to open into; send it to Safari.
        if let url = navigationAction.request.url, !isInternal(url) {
            UIApplication.shared.open(url)
        }
        return nil
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak alert] _ in
            completionHandler(alert?.textFields?.first?.text)
        })
        present(alert, animated: true)
    }
}

// MARK: - SwiftUI wrapper

struct SanskritiWebView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> SanskritiViewController {
        SanskritiViewController()
    }

    func updateUIViewController(_ viewController: SanskritiViewController, context: Context) {}
}
