package ai.sanskriti.app;

/** Pure navigation math shared by the native AR controller and unit tests. */
public final class ArNavigationMath {
    static final double EARTH_RADIUS_METERS = 6_371_000.0;
    public static final double DEFAULT_CAMERA_FOV_DEGREES = 65.0;

    private ArNavigationMath() {}

    public static double distanceMeters(
            double fromLatitude,
            double fromLongitude,
            double toLatitude,
            double toLongitude
    ) {
        double deltaLatitude = Math.toRadians(toLatitude - fromLatitude);
        double deltaLongitude = Math.toRadians(toLongitude - fromLongitude);
        double latitude1 = Math.toRadians(fromLatitude);
        double latitude2 = Math.toRadians(toLatitude);
        double haversine = Math.pow(Math.sin(deltaLatitude / 2.0), 2.0)
                + Math.cos(latitude1)
                * Math.cos(latitude2)
                * Math.pow(Math.sin(deltaLongitude / 2.0), 2.0);
        double arc = 2.0 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1.0 - haversine));
        return EARTH_RADIUS_METERS * arc;
    }

    public static double bearingDegrees(
            double fromLatitude,
            double fromLongitude,
            double toLatitude,
            double toLongitude
    ) {
        double deltaLongitude = Math.toRadians(toLongitude - fromLongitude);
        double latitude1 = Math.toRadians(fromLatitude);
        double latitude2 = Math.toRadians(toLatitude);
        double y = Math.sin(deltaLongitude) * Math.cos(latitude2);
        double x = Math.cos(latitude1) * Math.sin(latitude2)
                - Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(deltaLongitude);
        return normalizeDegrees(Math.toDegrees(Math.atan2(y, x)));
    }

    public static double normalizeDegrees(double degrees) {
        return ((degrees % 360.0) + 360.0) % 360.0;
    }

    /**
     * Resolves the rear-camera direction from an Android rotation matrix. If
     * the phone is nearly flat, it uses the phone's top edge because the rear
     * camera has no stable horizontal projection in that posture.
     */
    public static double cameraHeadingDegrees(float[] rotationMatrix) {
        if (rotationMatrix == null || rotationMatrix.length < 9) {
            throw new IllegalArgumentException("A 3x3 rotation matrix is required.");
        }
        double cameraEast = -rotationMatrix[2];
        double cameraNorth = -rotationMatrix[5];
        if (Math.hypot(cameraEast, cameraNorth) >= 0.5) {
            return normalizeDegrees(Math.toDegrees(Math.atan2(cameraEast, cameraNorth)));
        }

        double topEast = rotationMatrix[1];
        double topNorth = rotationMatrix[4];
        return normalizeDegrees(Math.toDegrees(Math.atan2(topEast, topNorth)));
    }

    /** Returns {@code first - second} normalized to the range [-180, 180). */
    public static double angleDifferenceDegrees(double first, double second) {
        return ((first - second + 540.0) % 360.0 + 360.0) % 360.0 - 180.0;
    }

    public static Projection projectWaypoint(
            double targetBearingDegrees,
            double deviceHeadingDegrees,
            double cameraFovDegrees
    ) {
        double safeFov = Math.max(1.0, Math.min(cameraFovDegrees, 179.0));
        double relativeAngle = angleDifferenceDegrees(targetBearingDegrees, deviceHeadingDegrees);
        double halfFov = safeFov / 2.0;
        if (Math.abs(relativeAngle) <= halfFov) {
            return new Projection(true, relativeAngle / halfFov, null, relativeAngle);
        }
        return new Projection(
                false,
                null,
                relativeAngle > 0.0 ? EdgeDirection.RIGHT : EdgeDirection.LEFT,
                relativeAngle
        );
    }

    public static boolean isInsideGeofence(
            double userLatitude,
            double userLongitude,
            double targetLatitude,
            double targetLongitude,
            double radiusMeters,
            double graceMeters
    ) {
        return distanceMeters(userLatitude, userLongitude, targetLatitude, targetLongitude)
                <= Math.max(0.0, radiusMeters) + Math.max(0.0, graceMeters);
    }

    public enum EdgeDirection {
        LEFT,
        RIGHT
    }

    public static final class Projection {
        public final boolean visible;
        public final Double screenX;
        public final EdgeDirection edgeDirection;
        public final double relativeAngleDegrees;

        Projection(
                boolean visible,
                Double screenX,
                EdgeDirection edgeDirection,
                double relativeAngleDegrees
        ) {
            this.visible = visible;
            this.screenX = screenX;
            this.edgeDirection = edgeDirection;
            this.relativeAngleDegrees = relativeAngleDegrees;
        }
    }
}
