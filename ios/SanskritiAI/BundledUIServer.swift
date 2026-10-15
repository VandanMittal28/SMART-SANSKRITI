import Foundation
import Network

/// Serves the bundled visitor UI to the WKWebView over loopback HTTP.
///
/// Why a local server rather than a `WKURLSchemeHandler`: the bundled UI ships
/// ~16 MB of MP3 audio guides, and `<audio>` playback depends on byte-range
/// requests. A custom scheme has to reimplement that and historically has not
/// handled media elements reliably. A real HTTP origin also keeps
/// `localStorage`, cookies and CORS behaving exactly as they do on Android,
/// which the Supabase client and the auth flow both rely on.
///
/// The listener binds to 127.0.0.1 only. An earlier revision used
/// `NWListener(using: .tcp, on: .any)`, which published the whole app bundle to
/// every device on the same Wi-Fi.
final class BundledUIServer {
    /// Requests under this prefix are forwarded to the local operations
    /// console, so the web app can reach it same-origin instead of being
    /// blocked by its origin checks.
    private static let operationsPrefix = "/api/demo/"
    private static let operationsOrigin = "http://127.0.0.1:3100"
    private static let maxBodyBytes = 3_000_000

    private let listener: NWListener
    private let queue = DispatchQueue(label: "ai.sanskriti.bundled-ui", attributes: .concurrent)
    private let root: URL
    private let rootPath: String

    /// Fails only when the bundle has no `www` folder, which means the Xcode
    /// "Bundle visitor UI" phase did not run.
    init?() {
        let bundled = Bundle.main.bundleURL.appendingPathComponent("www", isDirectory: true)
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: bundled.path, isDirectory: &isDirectory),
              isDirectory.boolValue else { return nil }

        let parameters = NWParameters.tcp
        parameters.allowLocalEndpointReuse = true
        // Bind the listening socket to loopback; nothing off-device can reach it.
        parameters.requiredLocalEndpoint = NWEndpoint.hostPort(host: "127.0.0.1", port: .any)

        guard let listener = try? NWListener(using: parameters) else { return nil }
        self.listener = listener
        self.root = bundled.standardizedFileURL
        self.rootPath = bundled.standardizedFileURL.path
    }

    /// Calls `ready` with the base URL to load, or `failed` if the loopback
    /// socket could not be opened. Without the failure path a bind error left
    /// the app sitting on a blank screen with nothing in the log.
    func start(ready: @escaping (URL) -> Void, failed: ((String) -> Void)? = nil) {
        var announced = false
        listener.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            switch state {
            case .ready:
                guard let port = self.listener.port?.rawValue, !announced else { return }
                announced = true
                ready(URL(string: "http://127.0.0.1:\(port)/")!)
            case .failed(let error):
                failed?(error.localizedDescription)
            case .cancelled:
                break
            default:
                break
            }
        }
        listener.newConnectionHandler = { [weak self] connection in
            self?.accept(connection)
        }
        listener.start(queue: queue)
    }

    func stop() {
        listener.stateUpdateHandler = nil
        listener.newConnectionHandler = nil
        listener.cancel()
    }

    // MARK: - Connection handling

    private func accept(_ connection: NWConnection) {
        connection.start(queue: queue)
        receive(connection, buffer: Data())
    }

    /// Accumulates until the full request is in hand. A single `receive` is not
    /// enough: a request can arrive split across TCP segments, and a POST body
    /// routinely does.
    private func receive(_ connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] chunk, _, isComplete, error in
            guard let self else { connection.cancel(); return }
            if error != nil { connection.cancel(); return }

            var accumulated = buffer
            if let chunk { accumulated.append(chunk) }

            guard let request = HTTPRequest(raw: accumulated) else {
                if isComplete || accumulated.count > Self.maxBodyBytes + 64 * 1024 {
                    connection.cancel()
                } else {
                    self.receive(connection, buffer: accumulated)
                }
                return
            }

            self.respond(to: request, on: connection)
        }
    }

    private func respond(to request: HTTPRequest, on connection: NWConnection) {
        if request.path.hasPrefix(Self.operationsPrefix) {
            proxyToOperations(request, on: connection)
            return
        }
        send(fileResponse(for: request), on: connection)
    }

    // MARK: - Static files

    private func fileResponse(for request: HTTPRequest) -> HTTPResponse {
        guard request.method == "GET" || request.method == "HEAD" else {
            return HTTPResponse(status: 405, reason: "Method Not Allowed",
                                contentType: "text/plain; charset=utf-8",
                                body: Data("Method not allowed".utf8))
        }
        guard let url = resolve(path: request.path) else {
            return HTTPResponse(status: 404, reason: "Not Found",
                                contentType: "text/html; charset=utf-8",
                                body: Data("<!doctype html><meta name=viewport content=\"width=device-width\"><body style=\"background:#070a16;color:#f5e6d3;font-family:-apple-system,sans-serif;padding:32px\">This bundled screen was not found.</body>".utf8))
        }

        let type = Self.mimeType(for: url.pathExtension)
        guard let total = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue else {
            return HTTPResponse(status: 500, reason: "Internal Server Error",
                                contentType: "text/plain; charset=utf-8",
                                body: Data("Could not read the bundled file.".utf8))
        }

        // Byte ranges matter here: without them `<audio>` cannot seek, and the
        // monument audio guides are several megabytes each.
        if let range = request.byteRange(totalLength: total) {
            guard let slice = Self.read(url, offset: range.lowerBound, length: range.count) else {
                return HTTPResponse(status: 500, reason: "Internal Server Error",
                                    contentType: "text/plain; charset=utf-8",
                                    body: Data("Could not read the requested range.".utf8))
            }
            var response = HTTPResponse(status: 206, reason: "Partial Content",
                                        contentType: type,
                                        body: request.method == "HEAD" ? Data() : slice)
            response.headers["Content-Range"] = "bytes \(range.lowerBound)-\(range.upperBound - 1)/\(total)"
            response.headers["Accept-Ranges"] = "bytes"
            response.contentLengthOverride = slice.count
            return response
        }

        let body = (try? Data(contentsOf: url, options: .mappedIfSafe)) ?? Data()
        var response = HTTPResponse(status: 200, reason: "OK", contentType: type,
                                    body: request.method == "HEAD" ? Data() : body)
        response.headers["Accept-Ranges"] = "bytes"
        response.contentLengthOverride = body.count
        return response
    }

    /// Maps a URL path onto a file in the bundle, mirroring the Next.js export
    /// layout that Android serves: `/explore/` -> `explore/index.html`.
    private func resolve(path: String) -> URL? {
        let decoded = path.removingPercentEncoding ?? path
        let trimmed = decoded.trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        // Drop `.` and `..` outright, then re-verify the resolved path is still
        // inside the bundle before any read.
        let safeComponents = trimmed.split(separator: "/").filter { $0 != ".." && $0 != "." }
        let relative = safeComponents.joined(separator: "/")

        var candidates: [URL] = []
        if relative.isEmpty {
            candidates = [root.appendingPathComponent("index.html")]
        } else {
            let direct = root.appendingPathComponent(relative)
            candidates = [direct, direct.appendingPathComponent("index.html")]
        }

        for candidate in candidates {
            let standardized = candidate.standardizedFileURL
            guard standardized.path == rootPath || standardized.path.hasPrefix(rootPath + "/") else { continue }
            var isDirectory: ObjCBool = false
            if FileManager.default.fileExists(atPath: standardized.path, isDirectory: &isDirectory),
               !isDirectory.boolValue {
                return standardized
            }
        }
        return nil
    }

    private static func read(_ url: URL, offset: Int, length: Int) -> Data? {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return nil }
        defer { try? handle.close() }
        do {
            try handle.seek(toOffset: UInt64(offset))
            return try handle.read(upToCount: length) ?? Data()
        } catch {
            return nil
        }
    }

    // MARK: - Operations console proxy

    /// The console refuses cross-origin calls, and the web app's own origin is
    /// this server's port. Forwarding here keeps the request same-origin from
    /// the page's point of view, which is what the Android build achieves with
    /// its native `demoReportRequest` bridge method.
    private func proxyToOperations(_ request: HTTPRequest, on connection: NWConnection) {
        guard request.method == "GET" || request.method == "POST",
              request.body.count <= Self.maxBodyBytes,
              var components = URLComponents(string: Self.operationsOrigin) else {
            send(HTTPResponse.json(status: 400, object: ["error": "Demo request blocked"]), on: connection)
            return
        }
        components.path = request.path
        components.query = request.query

        guard let url = components.url else {
            send(HTTPResponse.json(status: 400, object: ["error": "Demo request blocked"]), on: connection)
            return
        }

        var proxied = URLRequest(url: url)
        proxied.httpMethod = request.method
        proxied.timeoutInterval = 12
        proxied.setValue("application/json", forHTTPHeaderField: "Accept")
        proxied.setValue(Self.operationsOrigin, forHTTPHeaderField: "Origin")
        if request.method == "POST" {
            proxied.setValue("application/json", forHTTPHeaderField: "Content-Type")
            proxied.httpBody = request.body
        }

        URLSession.shared.dataTask(with: proxied) { [weak self] data, response, error in
            guard let self else { return }
            if let error {
                self.send(HTTPResponse.json(status: 502, object: ["error": "Local MMS unavailable: \(error.localizedDescription)"]), on: connection)
                return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 502
            var result = HTTPResponse(status: status, reason: status < 400 ? "OK" : "Error",
                                      contentType: "application/json", body: data ?? Data())
            result.contentLengthOverride = (data ?? Data()).count
            self.send(result, on: connection)
        }.resume()
    }

    // MARK: - Writing

    private func send(_ response: HTTPResponse, on connection: NWConnection) {
        connection.send(content: response.serialized(), completion: .contentProcessed { _ in
            connection.cancel()
        })
    }

    static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "map": return "application/json; charset=utf-8"
        case "txt": return "text/plain; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "gif": return "image/gif"
        case "ico": return "image/x-icon"
        case "avif": return "image/avif"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "ttf": return "font/ttf"
        case "otf": return "font/otf"
        case "mp3": return "audio/mpeg"
        case "m4a": return "audio/mp4"
        case "wav": return "audio/wav"
        case "ogg": return "audio/ogg"
        case "mp4": return "video/mp4"
        case "webm": return "video/webm"
        case "wasm": return "application/wasm"
        default: return "application/octet-stream"
        }
    }
}
