import Foundation

/// Build-time configuration, mirroring Android's `BuildConfig` fields.
///
/// `Sanskriti-Generated.plist` is produced by the Xcode "Generate Sanskriti
/// config" phase from `apk/ui/.env.local`, the same file Gradle reads. The
/// environment fallback keeps `Product > Scheme > Run > Environment Variables`
/// working for quick local testing, as `ios/Config/README.md` describes.
///
/// A key compiled into an app bundle can be extracted from the device. This is
/// MVP-only; the long-term answer is the separate API server, exactly as the
/// Android README says.
enum AppConfig {
    private static let generated: [String: String] = {
        guard let url = Bundle.main.url(forResource: "Sanskriti-Generated", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(from: data, format: nil),
              let values = plist as? [String: String] else { return [:] }
        return values
    }()

    private static func value(_ key: String, default fallback: String = "") -> String {
        if let fromEnvironment = ProcessInfo.processInfo.environment[key], !fromEnvironment.isEmpty {
            return fromEnvironment
        }
        if let fromBundle = generated[key], !fromBundle.isEmpty { return fromBundle }
        return fallback
    }

    static var nvidiaAPIKey: String { value("NVIDIA_API_KEY") }
    static var chatModel: String { value("NVIDIA_MODEL", default: "nvidia/nemotron-3.5-lightning-30b-a3b") }
    static var visionModel: String { value("NVIDIA_VISION_MODEL", default: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning") }
    static var speechModel: String { value("NVIDIA_SPEECH_MODEL", default: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning") }
    static var translationModel: String { value("NVIDIA_TRANSLATION_MODEL", default: "nvidia/riva-translate-4b-instruct-v2") }

    /// Model name for a bridge task, matching `getNvidiaModel` on Android.
    static func model(forTask task: String) -> String {
        switch task {
        case "vision": return visionModel
        case "speech": return speechModel
        case "translation": return translationModel
        default: return chatModel
        }
    }
}

/// Proxies NVIDIA NIM calls for the bundled UI, so the key never reaches
/// JavaScript. Mirrors `executeNvidiaRequest` / `pollNvidiaResult` /
/// `executeNvidiaSpeechRequest` in `MainActivity.java`.
final class NvidiaService {
    private static let chatURL = URL(string: "https://integrate.api.nvidia.com/v1/chat/completions")!
    private static let statusURL = "https://integrate.api.nvidia.com/v1/status/"
    private static let ttsURL = URL(string: "https://877104f7-e885-42b9-8de8-f6e4c6303969.invocation.api.nvcf.nvidia.com/v1/audio/synthesize")!

    private let session: URLSession

    init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 60
        configuration.timeoutIntervalForResource = 120
        session = URLSession(configuration: configuration)
    }

    private struct PendingRequest: Error {}

    /// Chat/vision/transcription. `completion` receives the raw response body
    /// JSON, or an error message; the UI parses the body itself.
    func request(body: String, completion: @escaping (String, String) -> Void) {
        let key = AppConfig.nvidiaAPIKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            completion("", "NVIDIA API key is not configured in this build.")
            return
        }

        execute(url: Self.chatURL, method: "POST", body: Data(body.utf8), key: key) { [weak self] result in
            guard let self else { return }
            switch result {
            case .failure(let error):
                completion("", Self.describe(error))
            case .success(let text):
                // Hosted NVCF functions may answer with a requestId to poll.
                if let data = text.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let pendingId = json["requestId"] as? String,
                   json["choices"] == nil {
                    self.poll(requestId: pendingId, key: key, attempt: 0, completion: completion)
                } else {
                    completion(text, "")
                }
            }
        }
    }

    private func poll(requestId: String, key: String, attempt: Int, completion: @escaping (String, String) -> Void) {
        guard attempt < 30 else {
            completion("", "NVIDIA request timed out.")
            return
        }
        guard let url = URL(string: Self.statusURL + requestId) else {
            completion("", "NVIDIA returned an unusable request id.")
            return
        }
        DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 1) { [weak self] in
            guard let self else { return }
            self.execute(url: url, method: "GET", body: nil, key: key) { result in
                switch result {
                case .success(let text):
                    completion(text, "")
                case .failure(let error as PendingRequest):
                    _ = error
                    self.poll(requestId: requestId, key: key, attempt: attempt + 1, completion: completion)
                case .failure(let error):
                    completion("", Self.describe(error))
                }
            }
        }
    }

    /// Narration audio. Returns base64 WAV, matching the Android bridge.
    func synthesizeSpeech(
        text: String,
        language: String,
        voice: String,
        completion: @escaping (String, String) -> Void
    ) {
        let key = AppConfig.nvidiaAPIKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            completion("", "NVIDIA API key is not configured in this build.")
            return
        }

        let boundary = "----SanskritiNvidia\(Int(Date().timeIntervalSince1970 * 1000))"
        var payload = Data()
        func field(_ name: String, _ value: String) {
            payload.append(Data("--\(boundary)\r\n".utf8))
            payload.append(Data("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".utf8))
            payload.append(Data("\(value)\r\n".utf8))
        }
        field("text", text)
        field("language", language.isEmpty ? "en-US" : language)
        field("voice", voice)
        field("encoding", "LINEAR_PCM")
        field("sample_rate_hz", "22050")
        payload.append(Data("--\(boundary)--\r\n".utf8))

        var request = URLRequest(url: Self.ttsURL)
        request.httpMethod = "POST"
        request.setValue("audio/wav", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = payload

        session.dataTask(with: request) { data, response, error in
            if let error {
                completion("", error.localizedDescription)
                return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            guard (200..<300).contains(status), let data, !data.isEmpty else {
                let detail = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
                completion("", detail.isEmpty ? "NVIDIA narration returned HTTP \(status)." : String(detail.prefix(500)))
                return
            }
            completion(data.base64EncodedString(), "")
        }.resume()
    }

    // MARK: - Transport

    private func execute(
        url: URL,
        method: String,
        body: Data?,
        key: String,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }

        session.dataTask(with: request) { data, response, error in
            if let error {
                completion(.failure(error))
                return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let text = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""

            // 202 on a status poll means the hosted model is still working.
            if status == 202, method == "GET" {
                completion(.failure(PendingRequest()))
                return
            }
            if status == 202 {
                completion(.success(text))
                return
            }
            guard (200..<300).contains(status) else {
                let detail = text.isEmpty ? "NVIDIA returned HTTP \(status)." : text
                completion(.failure(NSError(domain: "Nvidia", code: status, userInfo: [
                    NSLocalizedDescriptionKey: String(detail.prefix(500)),
                ])))
                return
            }
            completion(.success(text))
        }.resume()
    }

    private static func describe(_ error: Error) -> String {
        if error is PendingRequest { return "NVIDIA request timed out." }
        let message = (error as NSError).localizedDescription
        return message.isEmpty ? "NVIDIA request failed." : message
    }
}
