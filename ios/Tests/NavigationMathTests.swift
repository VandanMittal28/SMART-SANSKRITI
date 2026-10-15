import XCTest
@testable import SanskritiAI

/// The Explore HUD renders whichever implementation produced its state, so the
/// Swift maths must agree with `ArNavigationMath.java` and `lib/arNavigation.ts`.
final class NavigationMathTests: XCTestCase {
    func testDistanceUsesGreatCircleMeters() {
        let distance = ARNavigationMath.distanceMeters(
            fromLatitude: 0, fromLongitude: 0, toLatitude: 0.001, toLongitude: 0)
        XCTAssertEqual(distance, 111.195, accuracy: 0.05)
    }

    func testBearingUsesClockwiseDegreesFromNorth() {
        XCTAssertEqual(ARNavigationMath.bearingDegrees(fromLatitude: 0, fromLongitude: 0, toLatitude: 1, toLongitude: 0), 0, accuracy: 0.0001)
        XCTAssertEqual(ARNavigationMath.bearingDegrees(fromLatitude: 0, fromLongitude: 0, toLatitude: 0, toLongitude: 1), 90, accuracy: 0.0001)
        XCTAssertEqual(ARNavigationMath.bearingDegrees(fromLatitude: 0, fromLongitude: 0, toLatitude: -1, toLongitude: 0), 180, accuracy: 0.0001)
        XCTAssertEqual(ARNavigationMath.bearingDegrees(fromLatitude: 0, fromLongitude: 0, toLatitude: 0, toLongitude: -1), 270, accuracy: 0.0001)
    }

    func testAngleDifferenceFoldsIntoSignedHalfTurn() {
        XCTAssertEqual(ARNavigationMath.angleDifferenceDegrees(10, 350), 20, accuracy: 0.0001)
        XCTAssertEqual(ARNavigationMath.angleDifferenceDegrees(350, 10), -20, accuracy: 0.0001)
    }

    func testWaypointProjectsAcrossTheFieldOfView() {
        let centred = ARNavigationMath.projectWaypoint(bearingDegrees: 90, headingDegrees: 90, cameraFovDegrees: 60)
        XCTAssertTrue(centred.visible)
        XCTAssertEqual(centred.screenX ?? .nan, 0, accuracy: 0.0001)

        let rightEdge = ARNavigationMath.projectWaypoint(bearingDegrees: 120, headingDegrees: 90, cameraFovDegrees: 60)
        XCTAssertTrue(rightEdge.visible)
        XCTAssertEqual(rightEdge.screenX ?? .nan, 1, accuracy: 0.0001)

        let offScreen = ARNavigationMath.projectWaypoint(bearingDegrees: 180, headingDegrees: 90, cameraFovDegrees: 60)
        XCTAssertFalse(offScreen.visible)
        XCTAssertNil(offScreen.screenX)
        XCTAssertEqual(offScreen.edgeDirection, "right")
    }

    func testGeofenceHonoursRadiusAndGrace() {
        // ~111 m north of the origin.
        XCTAssertFalse(ARNavigationMath.isInsideGeofence(
            userLatitude: 0.001, userLongitude: 0, zoneLatitude: 0, zoneLongitude: 0,
            radiusMeters: 50, graceMeters: 0))
        XCTAssertTrue(ARNavigationMath.isInsideGeofence(
            userLatitude: 0.001, userLongitude: 0, zoneLatitude: 0, zoneLongitude: 0,
            radiusMeters: 50, graceMeters: 70))
    }
}
