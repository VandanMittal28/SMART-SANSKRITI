import AVFoundation
import CoreLocation
import Foundation

/// Native AR navigation for Explore, mirroring `ArNavigationController.java`.
///
/// It owns permissions, GPS, device heading, bearing/distance maths, geofence
/// validation and waypoint projection. It deliberately knows nothing about XP,
/// routes or narration: the bundled Explore screen stays the sole owner of
/// those, exactly as on Android.
///
/// Heading note: Android derives the rear-camera direction from the rotation
/// matrix. Here we use `CLHeading.trueHeading` with `headingOrientation` fixed
/// to portrait, which is the direction the device's top edge points and, for a
/// phone held upright in AR posture, the direction the rear camera faces.
final class ARNavigationService: NSObject {
    struct Target {
        let latitude: Double
        let longitude: Double
        let radiusMeters: Double
        let cameraFovDegrees: Double
        let geofenceGraceMeters: Double
    }

    enum Mode: String {
        case idle, requesting, live, fallback
    }

    enum PermissionState: String {
        case unrequested, requesting, granted, denied, unavailable
    }

    /// Called on the main thread whenever the snapshot changes.
    var onState: ((ARNavigationService) -> Void)?

    private let manager = CLLocationManager()
    private var target: Target?
    private var compassReference: CLLocationCoordinate2D?

    private(set) var mode: Mode = .idle
    private(set) var cameraPermission: PermissionState = .unrequested
    private(set) var locationPermission: PermissionState = .unrequested
    private(set) var orientationPermission: PermissionState = .unrequested
    private(set) var fallbackReason: String?
    private(set) var location: CLLocation?
    private(set) var headingDegrees: Double?
    private(set) var tracking = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.headingFilter = 2
        manager.headingOrientation = .portrait
        refreshPermissionSnapshot()
    }

    // MARK: - Lifecycle

    func start(target: Target) {
        self.target = target
        self.compassReference = nil
        tracking = true
        mode = .requesting
        fallbackReason = nil
        refreshPermissionSnapshot()

        requestCameraAuthorizationIfNeeded()

        if locationPermission == .denied {
            enterFallback("Location access was denied.")
            return
        }
        if locationPermission == .unrequested {
            locationPermission = .requesting
            manager.requestWhenInUseAuthorization()
        }

        manager.startUpdatingLocation()
        startHeadingUpdates()
        publish()
    }

    /// Sensor-only compass for the synthetic Demo Camera walk: heading without
    /// GPS, referenced to a fixed anchor the UI supplies.
    func startDemoCompass(reference: CLLocationCoordinate2D) {
        target = nil
        compassReference = reference
        tracking = true
        fallbackReason = nil
        refreshPermissionSnapshot()
        requestCameraAuthorizationIfNeeded()
        startHeadingUpdates()
        mode = orientationPermission == .granted ? .live : .fallback
        if orientationPermission != .granted {
            fallbackReason = "This device has no compass sensor."
        }
        publish()
    }

    func retry() {
        if let target {
            start(target: target)
        } else if let compassReference {
            startDemoCompass(reference: compassReference)
        }
    }

    func stop() {
        manager.stopUpdatingLocation()
        manager.stopUpdatingHeading()
        target = nil
        compassReference = nil
        tracking = false
        mode = .idle
        fallbackReason = nil
        location = nil
        headingDegrees = nil
        publish()
    }

    // MARK: - Permissions

    private func startHeadingUpdates() {
        guard CLLocationManager.headingAvailable() else {
            orientationPermission = .unavailable
            return
        }
        orientationPermission = .granted
        manager.startUpdatingHeading()
    }

    /// The WebView asks for camera access itself through `getUserMedia`; this
    /// mirrors the resulting system state into the snapshot so the HUD can
    /// explain a refusal.
    private func requestCameraAuthorizationIfNeeded() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            cameraPermission = .granted
        case .denied:
            cameraPermission = .denied
        case .restricted:
            cameraPermission = .unavailable
        case .notDetermined:
            cameraPermission = .requesting
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    guard let self else { return }
                    self.cameraPermission = granted ? .granted : .denied
                    if !granted, self.tracking { self.enterFallback("Camera access was denied.") }
                    else { self.publish() }
                }
            }
        @unknown default:
            cameraPermission = .unavailable
        }
    }

    private func refreshPermissionSnapshot() {
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse: locationPermission = .granted
        case .denied: locationPermission = .denied
        case .restricted: locationPermission = .unavailable
        case .notDetermined: locationPermission = .unrequested
        @unknown default: locationPermission = .unavailable
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: cameraPermission = .granted
        case .denied: cameraPermission = .denied
        case .restricted: cameraPermission = .unavailable
        case .notDetermined: if cameraPermission != .requesting { cameraPermission = .unrequested }
        @unknown default: cameraPermission = .unavailable
        }
        if !CLLocationManager.headingAvailable() { orientationPermission = .unavailable }
    }

    private func enterFallback(_ reason: String) {
        mode = .fallback
        fallbackReason = reason
        manager.stopUpdatingLocation()
        publish()
    }

    // MARK: - Snapshot

    private func publish() {
        if Thread.isMainThread {
            onState?(self)
        } else {
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                self.onState?(self)
            }
        }
    }

    /// The exact shape `useARNavigation` parses. Keys and enum spellings must
    /// stay identical to `ArNavigationState.toJson()` on Android.
    func stateJSONObject() -> [String: Any] {
        var waypoint: [String: Any] = [
            "visible": false,
            "screenX": NSNull(),
            "edgeDirection": NSNull(),
            "relativeAngle": 0,
        ]

        var bearing: Double?
        var distance: Double?
        var arrivalUnlocked = false

        if let target, let location {
            let userLat = location.coordinate.latitude
            let userLng = location.coordinate.longitude
            bearing = ARNavigationMath.bearingDegrees(
                fromLatitude: userLat, fromLongitude: userLng,
                toLatitude: target.latitude, toLongitude: target.longitude)
            distance = ARNavigationMath.distanceMeters(
                fromLatitude: userLat, fromLongitude: userLng,
                toLatitude: target.latitude, toLongitude: target.longitude)
            arrivalUnlocked = ARNavigationMath.isInsideGeofence(
                userLatitude: userLat, userLongitude: userLng,
                zoneLatitude: target.latitude, zoneLongitude: target.longitude,
                radiusMeters: target.radiusMeters, graceMeters: target.geofenceGraceMeters)

            if let bearing, let heading = headingDegrees {
                let fov = target.cameraFovDegrees > 0
                    ? target.cameraFovDegrees
                    : ARNavigationMath.defaultCameraFovDegrees
                let projection = ARNavigationMath.projectWaypoint(
                    bearingDegrees: bearing, headingDegrees: heading, cameraFovDegrees: fov)
                waypoint = [
                    "visible": projection.visible,
                    "screenX": projection.screenX.map { $0 as Any } ?? NSNull(),
                    "edgeDirection": projection.edgeDirection.map { $0 as Any } ?? NSNull(),
                    "relativeAngle": projection.relativeAngleDegrees,
                ]
            }
        }

        var userPosition: Any = NSNull()
        if let location {
            userPosition = ["lat": location.coordinate.latitude, "lng": location.coordinate.longitude]
        } else if let compassReference {
            userPosition = ["lat": compassReference.latitude, "lng": compassReference.longitude]
        }

        return [
            "mode": mode.rawValue,
            "permissions": [
                "camera": cameraPermission.rawValue,
                "location": locationPermission.rawValue,
                "orientation": orientationPermission.rawValue,
            ],
            "fallbackReason": fallbackReason.map { $0 as Any } ?? NSNull(),
            "userPosition": userPosition,
            "headingDeg": headingDegrees.map { $0 as Any } ?? NSNull(),
            "bearingDeg": bearing.map { $0 as Any } ?? NSNull(),
            "distanceMeters": distance.map { $0 as Any } ?? NSNull(),
            "waypoint": waypoint,
            "arrivalUnlocked": arrivalUnlocked,
            "tracking": tracking,
            "updatedAt": Int(Date().timeIntervalSince1970 * 1000),
        ]
    }

    func stateJSONString() -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: stateJSONObject()),
              let text = String(data: data, encoding: .utf8) else { return "{}" }
        return text
    }
}

extension ARNavigationService: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let latest = locations.last else { return }
        location = latest
        if tracking, target != nil, mode != .live {
            mode = .live
            fallbackReason = nil
        }
        publish()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        // A negative accuracy means the reading is invalid, usually magnetic
        // interference; keeping the previous heading beats swinging the arrow.
        guard newHeading.headingAccuracy >= 0 else { return }
        headingDegrees = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        orientationPermission = .granted
        if tracking, compassReference != nil, mode != .live {
            mode = .live
            fallbackReason = nil
        }
        publish()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        refreshPermissionSnapshot()
        guard tracking else { publish(); return }

        switch locationPermission {
        case .granted:
            if target != nil { manager.startUpdatingLocation() }
            startHeadingUpdates()
            if mode == .requesting { mode = .live }
            fallbackReason = nil
            publish()
        case .denied:
            enterFallback("Location access was denied.")
        case .unavailable:
            enterFallback("Location services are unavailable.")
        default:
            publish()
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard tracking, target != nil else { return }
        // A transient fix failure is normal while indoors; only surface it when
        // we have nothing at all to show yet.
        if location == nil {
            enterFallback("Waiting for a location fix.")
        }
    }
}
