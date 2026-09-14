import SwiftUI
import WebKit
import Network

final class SanskritiLocalServer {
    private let listener: NWListener
    private let queue = DispatchQueue(label: "ai.sanskriti.local-server")
    private let root: URL

    init?() {
        guard let root = Bundle.main.url(forResource: "www", withExtension: nil),
              let listener = try? NWListener(using: .tcp, on: .any) else { return nil }
        self.root = root
        self.listener = listener
    }

    func start(ready: @escaping (URL) -> Void) {
        listener.stateUpdateHandler = { [weak self] state in
            guard let self, state == .ready, let port = self.listener.port?.rawValue else { return }
            ready(URL(string: "http://127.0.0.1:\(port)/")!)
        }
        listener.newConnectionHandler = { [weak self] connection in
            self?.handle(connection)
        }
        listener.start(queue: queue)
    }

    func stop() { listener.cancel() }

    private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        connection.receive(minimumIncompleteLength: 1, maximumLength: 128 * 1024) { [weak self] data, _, _, _ in
            guard let self, let data, let request = String(data: data, encoding: .utf8) else { connection.cancel(); return }
            let firstLine = request.components(separatedBy: "\r\n").first ?? ""
            let rawPath = firstLine.split(separator: " ").dropFirst().first.map(String.init) ?? "/"
            let path = rawPath.split(separator: "?", maxSplits: 1).first.map(String.init) ?? "/"
            let (status, mime, body) = self.file(for: path)
            let header = "HTTP/1.1 \(status)\r\nContent-Type: \(mime)\r\nContent-Length: \(body.count)\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n"
            connection.send(content: header.data(using: .utf8)! + body, completion: .contentProcessed { _ in connection.cancel() })
        }
    }

    private func file(for path: String) -> (String, String, Data) {
        let clean = (path.removingPercentEncoding ?? path).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let safe = clean.split(separator: "/").filter { $0 != ".." }.joined(separator: "/")
        var url = root.appendingPathComponent(safe)
        var directory: ObjCBool = false
        if safe.isEmpty { url = root.appendingPathComponent("index.html") }
        else if FileManager.default.fileExists(atPath: url.path, isDirectory: &directory), directory.boolValue { url.appendPathComponent("index.html") }
        else if !FileManager.default.fileExists(atPath: url.path) {
            let route = root.appendingPathComponent(safe).appendingPathComponent("index.html")
            url = FileManager.default.fileExists(atPath: route.path) ? route : root.appendingPathComponent("404.html")
        }
        let body = (try? Data(contentsOf: url)) ?? Data("Not found".utf8)
        let status = url.lastPathComponent == "404.html" ? "404 Not Found" : "200 OK"
        return (status, mime(for: url.pathExtension), body)
    }

    private func mime(for ext: String) -> String { switch ext.lowercased() { case "html": return "text/html; charset=utf-8"; case "js": return "text/javascript"; case "css": return "text/css"; case "json": return "application/json"; case "svg": return "image/svg+xml"; case "png": return "image/png"; case "jpg", "jpeg": return "image/jpeg"; case "webp": return "image/webp"; case "woff", "woff2": return "font/woff2"; case "mp3": return "audio/mpeg"; default: return "application/octet-stream" } }
}

final class SanskritiSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start URLSchemeTask: WKURLSchemeTask) {
        guard let requestURL = URLSchemeTask.request.url else { return fail(URLSchemeTask) }
        let rawPath = requestURL.path.removingPercentEncoding ?? requestURL.path
        let relativePath = rawPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let bundleRoot = Bundle.main.bundleURL.appendingPathComponent("www", isDirectory: true)
        var fileURL = bundleRoot.appendingPathComponent(relativePath, isDirectory: false)
        var isDirectory: ObjCBool = false
        if FileManager.default.fileExists(atPath: fileURL.path, isDirectory: &isDirectory), isDirectory.boolValue {
            fileURL.appendPathComponent("index.html")
        } else if relativePath.isEmpty {
            fileURL = bundleRoot.appendingPathComponent("index.html")
        } else if !FileManager.default.fileExists(atPath: fileURL.path) {
            let routeIndex = bundleRoot.appendingPathComponent(relativePath, isDirectory: true).appendingPathComponent("index.html")
            if FileManager.default.fileExists(atPath: routeIndex.path) { fileURL = routeIndex } else { return fail(URLSchemeTask) }
        }
        guard let data = try? Data(contentsOf: fileURL) else { return fail(URLSchemeTask) }
        let contentType = mimeType(for: fileURL.pathExtension)
        let response = HTTPURLResponse(
            url: requestURL,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": contentType,
                "Content-Length": String(data.count),
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*",
            ]
        )!
        URLSchemeTask.didReceive(response)
        URLSchemeTask.didReceive(data)
        URLSchemeTask.didFinish()
    }
    func webView(_ webView: WKWebView, stop URLSchemeTask: WKURLSchemeTask) {}
    private func fail(_ task: WKURLSchemeTask) { task.didFailWithError(NSError(domain: "SanskritiBundle", code: 404, userInfo: [NSLocalizedDescriptionKey: "Bundled UI file not found"])) }
    private func mimeType(for ext: String) -> String { switch ext.lowercased() { case "html": return "text/html"; case "js": return "text/javascript"; case "css": return "text/css"; case "json": return "application/json"; case "svg": return "image/svg+xml"; case "png": return "image/png"; case "jpg", "jpeg": return "image/jpeg"; case "webp": return "image/webp"; case "woff", "woff2": return "font/woff2"; default: return "application/octet-stream" } }
}

final class SanskritiViewController: UIViewController {
    private let webView: WKWebView
    private var server: SanskritiLocalServer?

    init() {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(SanskritiSchemeHandler(), forURLScheme: "sanskriti")
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func loadView() {
        let container = UIView(frame: .zero)
        container.backgroundColor = .black
        view = container
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isOpaque = true
        webView.backgroundColor = .black
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        container.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            webView.topAnchor.constraint(equalTo: container.topAnchor),
            webView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        edgesForExtendedLayout = [.top, .bottom, .left, .right]
        additionalSafeAreaInsets = .zero
        guard let server = SanskritiLocalServer() else { return }
        self.server = server
        server.start { [weak self] url in
            print("Sanskriti local UI server ready: \(url.absoluteString)")
            DispatchQueue.main.async { self?.webView.load(URLRequest(url: url)) }
        }
    }

    deinit { server?.stop() }
}

struct SanskritiWebView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> SanskritiViewController {
        SanskritiViewController()
    }
    func updateUIViewController(_ viewController: SanskritiViewController, context: Context) {}
}
