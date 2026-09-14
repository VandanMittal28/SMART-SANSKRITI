import XCTest
import CoreLocation

final class NavigationMathTests: XCTestCase {
    func testBearingNorth() { XCTAssertEqual(CLLocationCoordinate2D(latitude: 0, longitude: 0).bearing(to: .init(latitude: 1, longitude: 0)), 0, accuracy: 0.001) }
    func testBearingEast() { XCTAssertEqual(CLLocationCoordinate2D(latitude: 0, longitude: 0).bearing(to: .init(latitude: 0, longitude: 1)), 90, accuracy: 0.001) }
    func testDistanceAndArrivalThreshold() { let a = CLLocation(latitude: 27.1751, longitude: 78.0421); let b = CLLocation(latitude: 27.1752, longitude: 78.0421); XCTAssertLessThan(a.distance(from: b), 20) }
}
