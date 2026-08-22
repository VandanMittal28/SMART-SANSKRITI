package ai.sanskriti.app;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

/** Immutable, presentation-neutral AR navigation snapshot exposed to the bundled UI. */
public final class ArNavigationState {
    public enum Mode {
        IDLE,
        REQUESTING,
        LIVE,
        FALLBACK
    }

    public enum PermissionState {
        UNREQUESTED,
        REQUESTING,
        GRANTED,
        DENIED,
        UNAVAILABLE
    }

    public final Mode mode;
    public final PermissionState cameraPermission;
    public final PermissionState locationPermission;
    public final PermissionState orientationPermission;
    public final String fallbackReason;
    public final Double userLatitude;
    public final Double userLongitude;
    public final Double headingDegrees;
    public final Double bearingDegrees;
    public final Double distanceMeters;
    public final ArNavigationMath.Projection waypoint;
    public final boolean arrivalUnlocked;
    public final boolean tracking;
    public final long updatedAtEpochMs;

    public ArNavigationState(
            Mode mode,
            PermissionState cameraPermission,
            PermissionState locationPermission,
            PermissionState orientationPermission,
            String fallbackReason,
            Double userLatitude,
            Double userLongitude,
            Double headingDegrees,
            Double bearingDegrees,
            Double distanceMeters,
            ArNavigationMath.Projection waypoint,
            boolean arrivalUnlocked,
            boolean tracking,
            long updatedAtEpochMs
    ) {
        this.mode = mode;
        this.cameraPermission = cameraPermission;
        this.locationPermission = locationPermission;
        this.orientationPermission = orientationPermission;
        this.fallbackReason = fallbackReason;
        this.userLatitude = userLatitude;
        this.userLongitude = userLongitude;
        this.headingDegrees = headingDegrees;
        this.bearingDegrees = bearingDegrees;
        this.distanceMeters = distanceMeters;
        this.waypoint = waypoint;
        this.arrivalUnlocked = arrivalUnlocked;
        this.tracking = tracking;
        this.updatedAtEpochMs = updatedAtEpochMs;
    }

    public JSONObject toJson() {
        JSONObject permissions = new JSONObject();
        JSONObject waypointJson = new JSONObject();
        JSONObject result = new JSONObject();
        try {
            permissions.put("camera", wireName(cameraPermission));
            permissions.put("location", wireName(locationPermission));
            permissions.put("orientation", wireName(orientationPermission));

            waypointJson.put("visible", waypoint.visible);
            waypointJson.put("screenX", nullableNumber(waypoint.screenX));
            waypointJson.put(
                    "edgeDirection",
                    waypoint.edgeDirection == null
                            ? JSONObject.NULL
                            : waypoint.edgeDirection.name().toLowerCase(Locale.ROOT)
            );
            waypointJson.put("relativeAngle", waypoint.relativeAngleDegrees);

            result.put("mode", wireName(mode));
            result.put("permissions", permissions);
            result.put("fallbackReason", fallbackReason == null ? JSONObject.NULL : fallbackReason);
            if (userLatitude != null && userLongitude != null
                    && Double.isFinite(userLatitude) && Double.isFinite(userLongitude)) {
                JSONObject userPosition = new JSONObject();
                userPosition.put("lat", userLatitude);
                userPosition.put("lng", userLongitude);
                result.put("userPosition", userPosition);
            } else {
                result.put("userPosition", JSONObject.NULL);
            }
            result.put("headingDeg", nullableNumber(headingDegrees));
            result.put("bearingDeg", nullableNumber(bearingDegrees));
            result.put("distanceMeters", nullableNumber(distanceMeters));
            result.put("waypoint", waypointJson);
            result.put("arrivalUnlocked", arrivalUnlocked);
            result.put("tracking", tracking);
            result.put("updatedAt", updatedAtEpochMs);
        } catch (JSONException impossible) {
            throw new IllegalStateException("Could not serialize AR navigation state.", impossible);
        }
        return result;
    }

    private static Object nullableNumber(Double value) {
        return value == null || !Double.isFinite(value) ? JSONObject.NULL : value;
    }

    private static String wireName(Enum<?> value) {
        return value.name().toLowerCase(Locale.ROOT);
    }
}
