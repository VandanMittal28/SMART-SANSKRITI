import CoreLocation
import Foundation

/// Pure navigation math, mirroring `ArNavigationMath.java` on Android and
/// `lib/arNavigation.ts` in the shared UI. All three must agree, because the
/// Explore HUD renders whichever one produced the state.
enum ARNavigationMath {
    static let earthRadiusMeters = 6_371_000.0
    static let defaultCameraFovDegrees = 65.0

    static func distanceMeters(
        fromLatitude: Double, fromLongitude: Double,
        toLatitude: Double, toLongitude: Double
    ) -> Double {
        let deltaLatitude = (toLatitude - fromLatitude) * .pi / 180
        let deltaLongitude = (toLongitude - fromLongitude) * .pi / 180
        let latitude1 = fromLatitude * .pi / 180
        let latitude2 = toLatitude * .pi / 180
        let haversine = pow(sin(deltaLatitude / 2), 2)
            + cos(latitude1) * cos(latitude2) * pow(sin(deltaLongitude / 2), 2)
        let arc = 2 * atan2(sqrt(haversine), sqrt(1 - haversine))
        return earthRadiusMeters * arc
    }

    static func bearingDegrees(
        fromLatitude: Double, fromLongitude: Double,
        toLatitude: Double, toLongitude: Double
    ) -> Double {
        let deltaLongitude = (toLongitude - fromLongitude) * .pi / 180
        let latitude1 = fromLatitude * .pi / 180
        let latitude2 = toLatitude * .pi / 180
        let y = sin(deltaLongitude) * cos(latitude2)
        let x = cos(latitude1) * sin(latitude2)
            - sin(latitude1) * cos(latitude2) * cos(deltaLongitude)
        return normalizeDegrees(atan2(y, x) * 180 / .pi)
    }

    static func normalizeDegrees(_ degrees: Double) -> Double {
        let wrapped = degrees.truncatingRemainder(dividingBy: 360)
        return (wrapped + 360).truncatingRemainder(dividingBy: 360)
    }

    /// Signed difference (a - b) folded into -180...180.
    static func angleDifferenceDegrees(_ a: Double, _ b: Double) -> Double {
        let raw = (a - b + 540).truncatingRemainder(dividingBy: 360)
        return (raw + 360).truncatingRemainder(dividingBy: 360) - 180
    }

    /// Where the target falls across the camera's horizontal field of view.
    struct Projection {
        /// True when the target is inside the field of view.
        var visible: Bool
        /// -1 at the left edge, 0 centred, 1 at the right edge. Nil when off-screen.
        var screenX: Double?
        /// "left" or "right" for the off-screen edge arrow, else nil.
        var edgeDirection: String?
        /// Signed angle from where the phone points to the target, -180...180.
        var relativeAngleDegrees: Double
    }

    static func projectWaypoint(
        bearingDegrees bearing: Double,
        headingDegrees heading: Double,
        cameraFovDegrees fov: Double
    ) -> Projection {
        let relative = angleDifferenceDegrees(bearing, heading)
        let halfFov = fov / 2

        if abs(relative) <= halfFov, halfFov > 0 {
            return Projection(visible: true,
                              screenX: relative / halfFov,
                              edgeDirection: nil,
                              relativeAngleDegrees: relative)
        }
        return Projection(visible: false,
                          screenX: nil,
                          edgeDirection: relative > 0 ? "right" : "left",
                          relativeAngleDegrees: relative)
    }

    static func isInsideGeofence(
        userLatitude: Double, userLongitude: Double,
        zoneLatitude: Double, zoneLongitude: Double,
        radiusMeters: Double, graceMeters: Double
    ) -> Bool {
        distanceMeters(fromLatitude: userLatitude, fromLongitude: userLongitude,
                       toLatitude: zoneLatitude, toLongitude: zoneLongitude)
            <= radiusMeters + graceMeters
    }
}
