import SwiftUI
import AVFoundation
@preconcurrency import CoreLocation
@preconcurrency import CoreMotion

@MainActor final class HeadingLocationService: NSObject, ObservableObject, @preconcurrency CLLocationManagerDelegate {
    @Published var location: CLLocation?; @Published var heading: CLHeading?; @Published var authorization: CLAuthorizationStatus = .notDetermined
    private let manager = CLLocationManager()
    override init() { super.init(); manager.delegate = self; manager.desiredAccuracy = kCLLocationAccuracyBest; manager.headingFilter = 2 }
    func start() { manager.requestWhenInUseAuthorization(); manager.startUpdatingLocation(); if CLLocationManager.headingAvailable() { manager.startUpdatingHeading() } }
    func stop() { manager.stopUpdatingLocation(); manager.stopUpdatingHeading() }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) { location = locations.last }
    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) { heading = newHeading }
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) { authorization = manager.authorizationStatus }
}

@MainActor final class ARNavigationController: ObservableObject {
    @Published private(set) var state = NativeARState(); private let sensors = HeadingLocationService(); private var target: Monument?
    func start(target: Monument) { self.target = target; state.mode = .requesting; sensors.start(); state.mode = .live }
    func stop() { sensors.stop(); target = nil; state = .init() }
    func refresh() { guard let target, let current = sensors.location else { state.mode = .fallback; state.fallbackReason = "Waiting for a location fix."; return }; let destination = CLLocation(latitude: target.latitude, longitude: target.longitude); let distance = current.distance(from: destination); let bearing = current.coordinate.bearing(to: destination.coordinate); let heading = sensors.heading?.trueHeading ?? sensors.heading?.magneticHeading ?? 0; state.relativeAngle = (bearing - heading + 540).truncatingRemainder(dividingBy: 360) - 180; state.distance = distance; state.bearing = bearing; state.heading = heading; state.waypointVisible = true; state.arrivalUnlocked = distance <= 40 }
}

extension CLLocationCoordinate2D { func bearing(to other: CLLocationCoordinate2D) -> Double { let lat1 = latitude * .pi / 180, lat2 = other.latitude * .pi / 180, delta = (other.longitude - longitude) * .pi / 180; let value = atan2(sin(delta) * cos(lat2), cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(delta)) * 180 / .pi; return (value + 360).truncatingRemainder(dividingBy: 360) } }

struct CameraPreview: UIViewRepresentable {
    final class Coordinator { let session = AVCaptureSession() }
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> UIView { let view = UIView(); let session = context.coordinator.session; session.beginConfiguration(); guard let camera = AVCaptureDevice.default(for: .video), let input = try? AVCaptureDeviceInput(device: camera), session.canAddInput(input) else { return view }; session.addInput(input); let output = AVCaptureVideoPreviewLayer(session: session); output.videoGravity = .resizeAspectFill; output.frame = UIScreen.main.bounds; view.layer.addSublayer(output); session.commitConfiguration(); DispatchQueue.global(qos: .userInitiated).async { session.startRunning() }; return view }
    func updateUIView(_ uiView: UIView, context: Context) {}
}
