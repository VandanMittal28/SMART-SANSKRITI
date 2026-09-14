import Foundation
import CoreLocation

struct Monument: Identifiable, Codable, Hashable {
    let id: String; let name: String; let city: String; let description: String
    let latitude: Double; let longitude: Double
    var coordinate: CLLocationCoordinate2D { .init(latitude: latitude, longitude: longitude) }
}

struct ChatMessage: Identifiable, Codable, Hashable { let id: UUID; let text: String; let isUser: Bool; let createdAt: Date }
struct Profile: Codable { var username = "traveller"; var fullName = "Traveller"; var totalXP = 0; var visited: [String] = []; var badges: [String] = []; var language = "en" }
struct RecognitionResult: Codable { let monument: String; let confidence: Double; let description: String }
struct NativeARState: Equatable {
    enum Mode { case idle, requesting, live, fallback }
    var mode: Mode = .idle; var heading: Double?; var bearing: Double?; var distance: Double?; var relativeAngle = 0.0; var waypointVisible = false; var arrivalUnlocked = false; var fallbackReason: String?
}

enum HeritageData {
    static let monuments = [
        Monument(id: "taj-mahal", name: "Taj Mahal", city: "Agra, Uttar Pradesh", description: "UNESCO ivory-white marble mausoleum built by Shah Jahan", latitude: 27.1751, longitude: 78.0421),
        Monument(id: "red-fort", name: "Red Fort", city: "Delhi", description: "Massive Mughal fort and Independence Day landmark", latitude: 28.6562, longitude: 77.2410),
        Monument(id: "qutub-minar", name: "Qutub Minar", city: "Delhi", description: "World's tallest brick minaret", latitude: 28.5244, longitude: 77.1855),
        Monument(id: "hampi", name: "Hampi", city: "Karnataka", description: "Ruins of the Vijayanagara Empire capital", latitude: 15.3350, longitude: 76.4600),
        Monument(id: "hawa-mahal", name: "Hawa Mahal", city: "Jaipur, Rajasthan", description: "Palace of Winds with 953 latticed windows", latitude: 26.9239, longitude: 75.8267)
    ]
    static let fallback = "Sanskriti AI is ready with curated heritage knowledge. Connect the API server for live AI answers."
}
