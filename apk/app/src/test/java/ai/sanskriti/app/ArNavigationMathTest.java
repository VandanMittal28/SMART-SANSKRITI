package ai.sanskriti.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class ArNavigationMathTest {
    private static final double EPSILON = 0.0001;

    @Test
    public void distanceUsesGreatCircleMeters() {
        double distance = ArNavigationMath.distanceMeters(0.0, 0.0, 0.001, 0.0);
        assertEquals(111.195, distance, 0.05);
    }

    @Test
    public void bearingUsesClockwiseDegreesFromNorth() {
        assertEquals(0.0, ArNavigationMath.bearingDegrees(0.0, 0.0, 1.0, 0.0), EPSILON);
        assertEquals(90.0, ArNavigationMath.bearingDegrees(0.0, 0.0, 0.0, 1.0), EPSILON);
        assertEquals(180.0, ArNavigationMath.bearingDegrees(0.0, 0.0, -1.0, 0.0), EPSILON);
        assertEquals(270.0, ArNavigationMath.bearingDegrees(0.0, 0.0, 0.0, -1.0), EPSILON);
    }

    @Test
    public void cameraHeadingUsesTopEdgeWhilePhoneIsFlat() {
        assertEquals(0.0, ArNavigationMath.cameraHeadingDegrees(new float[]{
                1, 0, 0,
                0, 1, 0,
                0, 0, 1,
        }), EPSILON);
    }

    @Test
    public void cameraHeadingUsesRearCameraWhilePhoneIsUpright() {
        assertEquals(0.0, ArNavigationMath.cameraHeadingDegrees(new float[]{
                1, 0, 0,
                0, 0, -1,
                0, 1, 0,
        }), EPSILON);
        assertEquals(90.0, ArNavigationMath.cameraHeadingDegrees(new float[]{
                0, 0, -1,
                -1, 0, 0,
                0, 1, 0,
        }), EPSILON);
    }

    @Test
    public void angleDifferenceWrapsAcrossNorth() {
        assertEquals(20.0, ArNavigationMath.angleDifferenceDegrees(10.0, 350.0), EPSILON);
        assertEquals(-20.0, ArNavigationMath.angleDifferenceDegrees(350.0, 10.0), EPSILON);
        assertEquals(-180.0, ArNavigationMath.angleDifferenceDegrees(180.0, 0.0), EPSILON);
    }

    @Test
    public void projectionPlacesVisibleTargetInNormalizedScreenSpace() {
        ArNavigationMath.Projection projection = ArNavigationMath.projectWaypoint(20.0, 0.0, 60.0);
        assertTrue(projection.visible);
        assertEquals(2.0 / 3.0, projection.screenX, EPSILON);
        assertNull(projection.edgeDirection);
        assertEquals(20.0, projection.relativeAngleDegrees, EPSILON);
    }

    @Test
    public void projectionChoosesCorrectOffscreenEdgeAcrossWraparound() {
        ArNavigationMath.Projection right = ArNavigationMath.projectWaypoint(40.0, 350.0, 60.0);
        assertFalse(right.visible);
        assertNull(right.screenX);
        assertEquals(ArNavigationMath.EdgeDirection.RIGHT, right.edgeDirection);

        ArNavigationMath.Projection left = ArNavigationMath.projectWaypoint(320.0, 10.0, 60.0);
        assertFalse(left.visible);
        assertEquals(ArNavigationMath.EdgeDirection.LEFT, left.edgeDirection);
    }

    @Test
    public void geofenceHonorsConfiguredRadiusAndOptionalGrace() {
        assertFalse(ArNavigationMath.isInsideGeofence(0.0, 0.0, 0.001, 0.0, 100.0, 0.0));
        assertTrue(ArNavigationMath.isInsideGeofence(0.0, 0.0, 0.001, 0.0, 100.0, 12.0));
    }
}
