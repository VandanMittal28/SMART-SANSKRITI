import Foundation

/// A parsed HTTP/1.1 request from the loopback UI server.
///
/// `init?(raw:)` returns nil while the request is still incomplete, so the
/// caller keeps reading. That matters for POSTs: the body routinely arrives in
/// a later TCP segment than the headers.
struct HTTPRequest {
    let method: String
    /// Path only, percent-encoded as received, without the query string.
    let path: String
    let query: String?
    let headers: [String: String]
    let body: Data

    init?(raw: Data) {
        guard let headerEnd = HTTPRequest.rangeOfHeaderTerminator(in: raw) else { return nil }

        let headerData = raw.subdata(in: raw.startIndex..<headerEnd.lowerBound)
        guard let headerText = String(data: headerData, encoding: .utf8) else { return nil }

        var lines = headerText.components(separatedBy: "\r\n")
        guard !lines.isEmpty else { return nil }
        let requestLine = lines.removeFirst().split(separator: " ", omittingEmptySubsequences: true)
        guard requestLine.count >= 2 else { return nil }

        self.method = String(requestLine[0]).uppercased()

        let target = String(requestLine[1])
        if let separator = target.firstIndex(of: "?") {
            self.path = String(target[target.startIndex..<separator])
            self.query = String(target[target.index(after: separator)...])
        } else {
            self.path = target
            self.query = nil
        }

        var parsed: [String: String] = [:]
        for line in lines where !line.isEmpty {
            guard let colon = line.firstIndex(of: ":") else { continue }
            let name = line[line.startIndex..<colon].trimmingCharacters(in: .whitespaces).lowercased()
            let value = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
            parsed[name] = value
        }
        self.headers = parsed

        let declaredLength = Int(parsed["content-length"] ?? "0") ?? 0
        let available = raw.count - (headerEnd.upperBound - raw.startIndex)
        // Still waiting on the rest of the body.
        if declaredLength > available { return nil }

        if declaredLength > 0 {
            let start = headerEnd.upperBound
            self.body = raw.subdata(in: start..<(start + declaredLength))
        } else {
            self.body = Data()
        }
    }

    /// Parsed `Range: bytes=…`, clamped to the file, as a half-open range.
    /// Returns nil when absent or unusable, which means "send the whole file".
    func byteRange(totalLength: Int) -> Range<Int>? {
        guard totalLength > 0, let header = headers["range"] else { return nil }
        guard header.lowercased().hasPrefix("bytes=") else { return nil }

        let spec = header.dropFirst("bytes=".count)
        // Multi-range requests are legal but rare; serving the whole file is a
        // valid response and avoids multipart encoding.
        guard !spec.contains(",") else { return nil }
        guard let dash = spec.firstIndex(of: "-") else { return nil }

        let startText = spec[spec.startIndex..<dash].trimmingCharacters(in: .whitespaces)
        let endText = spec[spec.index(after: dash)...].trimmingCharacters(in: .whitespaces)

        var start: Int
        var end: Int
        if startText.isEmpty {
            // Suffix form: the last N bytes.
            guard let suffix = Int(endText), suffix > 0 else { return nil }
            start = max(0, totalLength - suffix)
            end = totalLength - 1
        } else {
            guard let parsedStart = Int(startText) else { return nil }
            start = parsedStart
            end = endText.isEmpty ? totalLength - 1 : (Int(endText) ?? totalLength - 1)
        }

        guard start >= 0, start < totalLength else { return nil }
        end = min(end, totalLength - 1)
        guard end >= start else { return nil }
        return start..<(end + 1)
    }

    private static func rangeOfHeaderTerminator(in data: Data) -> Range<Data.Index>? {
        let terminator = Data("\r\n\r\n".utf8)
        return data.range(of: terminator)
    }
}

/// An HTTP/1.1 response written back over the loopback connection.
struct HTTPResponse {
    var status: Int
    var reason: String
    var contentType: String
    var body: Data
    var headers: [String: String] = [:]
    /// Content-Length to advertise. Set explicitly so a HEAD response can
    /// report the real size while sending an empty body.
    var contentLengthOverride: Int?

    func serialized() -> Data {
        var head = "HTTP/1.1 \(status) \(reason)\r\n"
        head += "Content-Type: \(contentType)\r\n"
        head += "Content-Length: \(contentLengthOverride ?? body.count)\r\n"
        // The bundle is regenerated on every build; caching it would serve
        // stale screens after an update.
        head += "Cache-Control: no-cache\r\n"
        head += "X-Content-Type-Options: nosniff\r\n"
        for (name, value) in headers {
            head += "\(name): \(value)\r\n"
        }
        head += "Connection: close\r\n\r\n"

        var payload = Data(head.utf8)
        payload.append(body)
        return payload
    }

    static func json(status: Int, object: [String: Any]) -> HTTPResponse {
        let data = (try? JSONSerialization.data(withJSONObject: object)) ?? Data("{}".utf8)
        var response = HTTPResponse(status: status,
                                    reason: status < 400 ? "OK" : "Error",
                                    contentType: "application/json; charset=utf-8",
                                    body: data)
        response.contentLengthOverride = data.count
        return response
    }
}
