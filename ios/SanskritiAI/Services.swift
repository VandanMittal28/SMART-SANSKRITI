import Foundation

enum AppConfig {
    static let apiBaseURL = URL(string: ProcessInfo.processInfo.environment["SANSKRITI_API_BASE_URL"] ?? "")
    static let supabaseURL = ProcessInfo.processInfo.environment["SANSKRITI_SUPABASE_URL"] ?? ""
    static let supabaseAnonKey = ProcessInfo.processInfo.environment["SANSKRITI_SUPABASE_ANON_KEY"] ?? ""
    static let nvidiaAPIKey = ProcessInfo.processInfo.environment["NVIDIA_API_KEY"] ?? ""
    static let nvidiaModel = ProcessInfo.processInfo.environment["NVIDIA_MODEL"] ?? "nvidia/nemotron-3.5-lightning-30b-a3b"
}

actor NVIDIAClient {
    static let shared = NVIDIAClient()
    private let endpoint = URL(string: "https://integrate.api.nvidia.com/v1/chat/completions")!
    func chat(question: String, language: String) async throws -> String {
        guard !AppConfig.nvidiaAPIKey.isEmpty else { throw URLError(.userAuthenticationRequired) }
        var request = URLRequest(url: endpoint); request.httpMethod = "POST"; request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.setValue("Bearer \(AppConfig.nvidiaAPIKey)", forHTTPHeaderField: "Authorization")
        let responseLanguage = language == "hi" ? "Hindi" : "English"
        let system = "You are Yatrik, a concise Indian heritage guide. Answer only questions about monuments, heritage, archaeology, architecture, history, visitor etiquette, or sustainable tourism. Reply in \(responseLanguage). Prefer established facts and label legends."
        request.httpBody = try JSONSerialization.data(withJSONObject: ["model": AppConfig.nvidiaModel, "messages": [["role": "system", "content": system], ["role": "user", "content": question]], "temperature": 0.25, "max_tokens": 800, "stream": false])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode ?? 500 < 300 else { throw URLError(.badServerResponse) }
        struct Response: Decodable { struct Choice: Decodable { struct Message: Decodable { let content: String }; let message: Message }; let choices: [Choice] }
        let decoded = try JSONDecoder().decode(Response.self, from: data)
        guard let answer = decoded.choices.first?.message.content, !answer.isEmpty else { throw URLError(.cannotDecodeContentData) }
        return answer.replacingOccurrences(of: "</think>", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

actor APIClient {
    static let shared = APIClient()
    func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        guard let base = AppConfig.apiBaseURL else { throw URLError(.cannotConnectToHost) }
        var request = URLRequest(url: base.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))))
        request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode ?? 500 < 300 else { throw URLError(.badServerResponse) }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func chat(question: String, language: String, monumentID: String? = nil) async throws -> String {
        struct Reply: Decodable { let answer: String?; let response: String? }
        let reply: Reply = try await post("api/chat", body: ["question": question, "lang": language, "monument_id": monumentID ?? ""])
        return reply.answer ?? reply.response ?? HeritageData.fallback
    }
    func transcribe(audioBase64: String, language: String) async throws -> String {
        struct Reply: Decodable { let text: String }
        let reply: Reply = try await post("api/transcribe", body: ["audio_b64": audioBase64, "language": language]); return reply.text
    }
    func translate(directionHint: String, arrivalFact: String, miniFact: String, language: String) async throws -> [String: String] {
        try await post("api/explore-translate", body: ["directionHint": directionHint, "arrivalFact": arrivalFact, "miniFact": miniFact, "language": language])
    }
}

actor SupabaseClient {
    static let shared = SupabaseClient(); private(set) var accessToken: String?
    func signInAnonymously(username: String) async throws {
        guard let url = URL(string: AppConfig.supabaseURL + "/auth/v1/signup"), !AppConfig.supabaseAnonKey.isEmpty else { throw URLError(.badURL) }
        var request = URLRequest(url: url); request.httpMethod = "POST"; request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey"); request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = try JSONSerialization.data(withJSONObject: ["data": ["username": username, "full_name": username]])
        let (data, response) = try await URLSession.shared.data(for: request); guard (response as? HTTPURLResponse)?.statusCode ?? 500 < 300 else { throw URLError(.userAuthenticationRequired) }
        struct Session: Decodable { let access_token: String? }; accessToken = try JSONDecoder().decode(Session.self, from: data).access_token
    }
}

@MainActor final class AppStore: ObservableObject {
    @Published var profile = Profile(); @Published var messages: [ChatMessage] = []; @Published var selectedLanguage = "en"
    @Published var notice: String?
    init() { load() }
    func load() { if let data = UserDefaults.standard.data(forKey: "profile"), let value = try? JSONDecoder().decode(Profile.self, from: data) { profile = value }; selectedLanguage = profile.language }
    func save() { profile.language = selectedLanguage; if let data = try? JSONEncoder().encode(profile) { UserDefaults.standard.set(data, forKey: "profile") } }
    func ask(_ question: String) async {
        let user = ChatMessage(id: UUID(), text: question, isUser: true, createdAt: .now); messages.append(user)
        struct Reply: Decodable { let answer: String?; let response: String? }
        do { let answer: String
            if !AppConfig.nvidiaAPIKey.isEmpty { answer = try await NVIDIAClient.shared.chat(question: question, language: selectedLanguage) }
            else { answer = try await APIClient.shared.chat(question: question, language: selectedLanguage) }
            messages.append(.init(id: UUID(), text: answer, isUser: false, createdAt: .now)) }
        catch { messages.append(.init(id: UUID(), text: HeritageData.fallback, isUser: false, createdAt: .now)) }
    }
}
