import SwiftUI
import MapKit

struct RootView: View {
    var body: some View {
        GeometryReader { proxy in
            SanskritiWebView()
                .frame(width: proxy.size.width, height: proxy.size.height)
                .ignoresSafeArea(.all)
        }
        .ignoresSafeArea(.all)
        .background(Color.black)
    }
}

struct HomeView: View { @EnvironmentObject var store: AppStore; var body: some View { NavigationStack { ScrollView { VStack(alignment: .leading, spacing: 20) { Text("Sanskriti AI").font(.largeTitle.bold()); Text("Discover India's living heritage").foregroundStyle(.secondary); HStack { Label("Level \(store.profile.totalXP / 100 + 1)", systemImage: "sparkles"); Spacer(); Text("\(store.profile.totalXP) XP") }.padding().background(.orange.opacity(0.15), in: RoundedRectangle(cornerRadius: 16)); Text("Featured journeys").font(.title2.bold()); ForEach(HeritageData.monuments.prefix(3)) { monument in NavigationLink(destination: MonumentView(monument: monument)) { MonumentCard(monument: monument) } } }.padding() }.navigationTitle("Namaste") } } }
struct MonumentCard: View { let monument: Monument; var body: some View { VStack(alignment: .leading) { Text(monument.name).font(.headline); Text(monument.city).font(.subheadline).foregroundStyle(.secondary); Text(monument.description).font(.caption).foregroundStyle(.secondary) }.frame(maxWidth: .infinity, alignment: .leading).padding().background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16)) } }

struct ExploreView: View { @StateObject private var nav = ARNavigationController(); @State private var selected = HeritageData.monuments[0]; var body: some View { NavigationStack { VStack { Map { ForEach(HeritageData.monuments) { Marker($0.name, coordinate: $0.coordinate) } }.mapStyle(.standard).frame(height: 300); Picker("Monument", selection: $selected) { ForEach(HeritageData.monuments) { Text($0.name).tag($0) } }.pickerStyle(.menu); if nav.state.mode == .live { CameraPreview().overlay(alignment: .center) { Image(systemName: "location.north.fill").font(.largeTitle).foregroundStyle(.orange).rotationEffect(.degrees(nav.state.relativeAngle)); if let distance = nav.state.distance { Text(distance < 1000 ? "\(Int(distance)) m" : "\(distance / 1000, specifier: "%.1f") km").padding(.top, 80) } } .frame(height: 240).clipShape(RoundedRectangle(cornerRadius: 20)); Button("Stop navigation") { nav.stop() } } else { Button("Start camera navigation") { nav.start(target: selected) }.buttonStyle(.borderedProminent) } }.padding().navigationTitle("Explore") }.task { while !Task.isCancelled { try? await Task.sleep(for: .milliseconds(500)); nav.refresh() } } } }

struct MonumentView: View { let monument: Monument; var body: some View { ScrollView { VStack(alignment: .leading, spacing: 18) { Text(monument.name).font(.largeTitle.bold()); Text(monument.city).foregroundStyle(.secondary); Text(monument.description).font(.title3); Text("Heritage story").font(.title2.bold()); Text("Explore the history, people, architecture, and living traditions of this remarkable Indian landmark with Yatrik."); Label("Audio guide available", systemImage: "headphones.fill"); Button("Start audio guide") {}.buttonStyle(.borderedProminent) }.padding() }.navigationTitle(monument.name).navigationBarTitleDisplayMode(.inline) } }

struct RecognitionView: View {
    @State private var showCamera = false
    @State private var result: RecognitionResult?
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "camera.viewfinder").font(.system(size: 70)).foregroundStyle(.orange)
                Text("Monument Recognition").font(.title.bold())
                Text("Point your camera at a monument or choose a photo to identify it.").multilineTextAlignment(.center).foregroundStyle(.secondary)
                Button("Use Camera") { showCamera = true }.buttonStyle(.borderedProminent)
                Button("Choose from Photos") {}.buttonStyle(.bordered)
                if let result = result { Text("\(result.monument) · \(Int(result.confidence * 100))% confidence").font(.headline) }
                Spacer()
            }.padding().navigationTitle("Recognition")
        }.sheet(isPresented: $showCamera) { CameraCaptureView() }
    }
}
struct CameraCaptureView: View { @Environment(\.dismiss) private var dismiss; var body: some View { ZStack(alignment: .topTrailing) { CameraPreview().ignoresSafeArea(); Button("Done") { dismiss() }.padding().foregroundStyle(.white) } } }

struct ChatView: View { @EnvironmentObject var store: AppStore; @State private var text = ""; var body: some View { NavigationStack { VStack { ScrollView { LazyVStack(alignment: .leading, spacing: 12) { ForEach(store.messages) { message in Text(message.text).padding().background(message.isUser ? .orange.opacity(0.2) : .gray.opacity(0.15), in: RoundedRectangle(cornerRadius: 14)).frame(maxWidth: .infinity, alignment: message.isUser ? .trailing : .leading) } } }.frame(maxHeight: .infinity); HStack { TextField("Ask Yatrik about India…", text: $text).textFieldStyle(.roundedBorder); Button { let q = text; text = ""; Task { await store.ask(q) } } label: { Image(systemName: "arrow.up.circle.fill").font(.title) }.disabled(text.trimmingCharacters(in: .whitespaces).isEmpty) } }.padding().navigationTitle("Yatrik") } } }

struct MoreView: View { let features = ["Itinerary", "Quiz", "Festivals", "Sustainability", "Hunt", "Badges", "Leaderboard", "Profile", "Tickets"]; var body: some View { NavigationStack { List(features, id: \.self) { feature in NavigationLink(feature) { FeaturePlaceholder(title: feature) } }.navigationTitle("Sanskriti") } } }
struct FeaturePlaceholder: View { let title: String; var body: some View { ContentUnavailableView(title, systemImage: "sparkles", description: Text("This native feature is connected to the Sanskriti service layer and ready for its full screen implementation.")) } }
