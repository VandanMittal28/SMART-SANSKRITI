package ai.sanskriti.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Surface;

import java.util.ArrayList;
import java.util.List;

/**
 * Native, presentation-neutral AR navigation engine.
 *
 * <p>It owns permission/capability state, the live GPS watch, device heading,
 * geofence validation, and screen-space projection. It retains only the latest
 * sensor samples in memory and never stores camera, location, or orientation data.</p>
 */
public final class ArNavigationController implements SensorEventListener, LocationListener {
    public interface Listener {
        void onStateChanged(ArNavigationState state);
    }

    public static final class Target {
        public final double latitude;
        public final double longitude;
        public final double radiusMeters;
        public final double cameraFovDegrees;
        public final double geofenceGraceMeters;

        public Target(
                double latitude,
                double longitude,
                double radiusMeters,
                double cameraFovDegrees,
                double geofenceGraceMeters
        ) {
            if (!Double.isFinite(latitude) || latitude < -90.0 || latitude > 90.0) {
                throw new IllegalArgumentException("Target latitude must be between -90 and 90.");
            }
            if (!Double.isFinite(longitude) || longitude < -180.0 || longitude > 180.0) {
                throw new IllegalArgumentException("Target longitude must be between -180 and 180.");
            }
            if (!Double.isFinite(radiusMeters) || radiusMeters <= 0.0) {
                throw new IllegalArgumentException("Geofence radius must be greater than zero.");
            }
            this.latitude = latitude;
            this.longitude = longitude;
            this.radiusMeters = radiusMeters;
            this.cameraFovDegrees = Double.isFinite(cameraFovDegrees)
                    ? Math.max(1.0, Math.min(cameraFovDegrees, 179.0))
                    : ArNavigationMath.DEFAULT_CAMERA_FOV_DEGREES;
            this.geofenceGraceMeters = Double.isFinite(geofenceGraceMeters)
                    ? Math.max(0.0, geofenceGraceMeters)
                    : 0.0;
        }
    }

    private static final long LOCATION_TIMEOUT_MS = 15_000L;
    private static final long ORIENTATION_TIMEOUT_MS = 4_000L;
    private static final long MIN_STATE_INTERVAL_MS = 80L;
    private static final float MIN_LOCATION_DISTANCE_METERS = 0.5f;
    private static final long MIN_LOCATION_INTERVAL_MS = 500L;
    private static final float HEADING_SMOOTHING_FACTOR = 0.22f;

    private final Activity activity;
    private final int permissionRequestCode;
    private final Listener listener;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final LocationManager locationManager;
    private final SensorManager sensorManager;
    private final CameraManager cameraManager;

    private Target target;
    private boolean tracking;
    private boolean paused;
    private boolean locationListening;
    private boolean orientationListening;
    private Sensor rotationSensor;
    private Sensor accelerometerSensor;
    private Sensor magneticFieldSensor;
    private float[] latestAcceleration;
    private float[] latestMagneticField;
    private Location latestLocation;
    private Double smoothedHeadingDegrees;
    private long lastStateDispatchElapsedMs;

    private ArNavigationState.PermissionState cameraPermission =
            ArNavigationState.PermissionState.UNREQUESTED;
    private ArNavigationState.PermissionState locationPermission =
            ArNavigationState.PermissionState.UNREQUESTED;
    private ArNavigationState.PermissionState orientationPermission =
            ArNavigationState.PermissionState.UNREQUESTED;
    private volatile ArNavigationState currentState = idleState();

    private final Runnable locationTimeout = () -> {
        if (tracking && !paused && latestLocation == null
                && locationPermission == ArNavigationState.PermissionState.GRANTED) {
            locationPermission = ArNavigationState.PermissionState.UNAVAILABLE;
            stopLocationWatch();
            dispatchState(true);
        }
    };

    private final Runnable orientationTimeout = () -> {
        if (tracking && !paused && smoothedHeadingDegrees == null
                && orientationPermission == ArNavigationState.PermissionState.REQUESTING) {
            orientationPermission = ArNavigationState.PermissionState.UNAVAILABLE;
            stopOrientationWatch();
            dispatchState(true);
        }
    };

    public ArNavigationController(
            Activity activity,
            int permissionRequestCode,
            Listener listener
    ) {
        this.activity = activity;
        this.permissionRequestCode = permissionRequestCode;
        this.listener = listener;
        this.locationManager = (LocationManager) activity.getSystemService(Context.LOCATION_SERVICE);
        this.sensorManager = (SensorManager) activity.getSystemService(Context.SENSOR_SERVICE);
        this.cameraManager = (CameraManager) activity.getSystemService(Context.CAMERA_SERVICE);
    }

    public void start(Target nextTarget) {
        requireMainThread();
        stopWatches();
        target = nextTarget;
        tracking = true;
        paused = false;
        latestLocation = null;
        smoothedHeadingDegrees = null;
        latestAcceleration = null;
        latestMagneticField = null;
        refreshCapabilitiesAndRequestPermissions();
    }

    public void retry() {
        requireMainThread();
        if (target == null) return;
        stopWatches();
        latestLocation = null;
        smoothedHeadingDegrees = null;
        cameraPermission = ArNavigationState.PermissionState.UNREQUESTED;
        locationPermission = ArNavigationState.PermissionState.UNREQUESTED;
        orientationPermission = ArNavigationState.PermissionState.UNREQUESTED;
        tracking = true;
        paused = false;
        refreshCapabilitiesAndRequestPermissions();
    }

    public void stop() {
        requireMainThread();
        tracking = false;
        paused = false;
        target = null;
        stopWatches();
        latestLocation = null;
        smoothedHeadingDegrees = null;
        cameraPermission = ArNavigationState.PermissionState.UNREQUESTED;
        locationPermission = ArNavigationState.PermissionState.UNREQUESTED;
        orientationPermission = ArNavigationState.PermissionState.UNREQUESTED;
        currentState = idleState();
        listener.onStateChanged(currentState);
    }

    public void pause() {
        requireMainThread();
        if (!tracking || paused) return;
        paused = true;
        stopWatches();
    }

    public void resume() {
        requireMainThread();
        if (!tracking || !paused || target == null) return;
        paused = false;
        beginWatchesWhenPossible();
        dispatchState(true);
    }

    public void destroy() {
        requireMainThread();
        tracking = false;
        target = null;
        stopWatches();
        mainHandler.removeCallbacksAndMessages(null);
    }

    public void onPermissionResult() {
        requireMainThread();
        if (!tracking) return;
        updateCameraCapability();
        updateLocationCapability();
        beginWatchesWhenPossible();
        dispatchState(true);
    }

    public ArNavigationState getCurrentState() {
        return currentState;
    }

    private void refreshCapabilitiesAndRequestPermissions() {
        updateCameraCapability();
        updateLocationCapability();
        updateOrientationCapability();

        List<String> missingPermissions = new ArrayList<>();
        if (!hasPermission(Manifest.permission.CAMERA)) {
            cameraPermission = ArNavigationState.PermissionState.REQUESTING;
            missingPermissions.add(Manifest.permission.CAMERA);
        }
        if (!hasFineOrCoarseLocation()) {
            locationPermission = ArNavigationState.PermissionState.REQUESTING;
            missingPermissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
            missingPermissions.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        dispatchState(true);
        if (!missingPermissions.isEmpty()) {
            activity.requestPermissions(
                    missingPermissions.toArray(new String[0]),
                    permissionRequestCode
            );
        } else {
            beginWatchesWhenPossible();
        }
    }

    private void updateCameraCapability() {
        if (!hasPermission(Manifest.permission.CAMERA)) {
            cameraPermission = cameraPermission == ArNavigationState.PermissionState.REQUESTING
                    ? ArNavigationState.PermissionState.DENIED
                    : ArNavigationState.PermissionState.UNREQUESTED;
            return;
        }
        try {
            boolean rearCameraAvailable = false;
            for (String cameraId : cameraManager.getCameraIdList()) {
                Integer facing = cameraManager
                        .getCameraCharacteristics(cameraId)
                        .get(CameraCharacteristics.LENS_FACING);
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    rearCameraAvailable = true;
                    break;
                }
            }
            cameraPermission = rearCameraAvailable
                    ? ArNavigationState.PermissionState.GRANTED
                    : ArNavigationState.PermissionState.UNAVAILABLE;
        } catch (Exception ignored) {
            cameraPermission = ArNavigationState.PermissionState.UNAVAILABLE;
        }
    }

    private void updateLocationCapability() {
        if (!hasFineOrCoarseLocation()) {
            locationPermission = locationPermission == ArNavigationState.PermissionState.REQUESTING
                    ? ArNavigationState.PermissionState.DENIED
                    : ArNavigationState.PermissionState.UNREQUESTED;
            return;
        }
        boolean providerEnabled = false;
        try {
            providerEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    || locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception ignored) {
        }
        locationPermission = providerEnabled
                ? ArNavigationState.PermissionState.GRANTED
                : ArNavigationState.PermissionState.UNAVAILABLE;
    }

    private void updateOrientationCapability() {
        if (sensorManager == null) {
            orientationPermission = ArNavigationState.PermissionState.UNAVAILABLE;
            return;
        }
        rotationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if (rotationSensor == null) {
            rotationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
        }
        accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        magneticFieldSensor = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
        boolean hasOrientationSource = rotationSensor != null
                || (accelerometerSensor != null && magneticFieldSensor != null);
        orientationPermission = hasOrientationSource
                ? ArNavigationState.PermissionState.REQUESTING
                : ArNavigationState.PermissionState.UNAVAILABLE;
    }

    private void beginWatchesWhenPossible() {
        if (!tracking || paused) return;
        if (locationPermission == ArNavigationState.PermissionState.GRANTED) startLocationWatch();
        if (orientationPermission == ArNavigationState.PermissionState.REQUESTING
                || orientationPermission == ArNavigationState.PermissionState.GRANTED) {
            startOrientationWatch();
        }
    }

    @SuppressWarnings("MissingPermission")
    private void startLocationWatch() {
        if (locationListening || !hasFineOrCoarseLocation()) return;
        boolean registered = false;
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        MIN_LOCATION_INTERVAL_MS,
                        MIN_LOCATION_DISTANCE_METERS,
                        this,
                        Looper.getMainLooper()
                );
                registered = true;
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        MIN_LOCATION_INTERVAL_MS,
                        MIN_LOCATION_DISTANCE_METERS,
                        this,
                        Looper.getMainLooper()
                );
                registered = true;
            }
        } catch (SecurityException ignored) {
            locationPermission = ArNavigationState.PermissionState.DENIED;
        } catch (Exception ignored) {
            locationPermission = ArNavigationState.PermissionState.UNAVAILABLE;
        }
        locationListening = registered;
        mainHandler.removeCallbacks(locationTimeout);
        if (registered && latestLocation == null) {
            mainHandler.postDelayed(locationTimeout, LOCATION_TIMEOUT_MS);
        }
    }

    private void startOrientationWatch() {
        if (orientationListening) return;
        boolean registered;
        if (rotationSensor != null) {
            registered = sensorManager.registerListener(
                    this,
                    rotationSensor,
                    SensorManager.SENSOR_DELAY_GAME,
                    mainHandler
            );
        } else {
            boolean accelerometerRegistered = accelerometerSensor != null && sensorManager.registerListener(
                    this,
                    accelerometerSensor,
                    SensorManager.SENSOR_DELAY_GAME,
                    mainHandler
            );
            boolean magneticRegistered = magneticFieldSensor != null && sensorManager.registerListener(
                    this,
                    magneticFieldSensor,
                    SensorManager.SENSOR_DELAY_GAME,
                    mainHandler
            );
            registered = accelerometerRegistered && magneticRegistered;
        }
        orientationListening = registered;
        if (!registered) {
            orientationPermission = ArNavigationState.PermissionState.UNAVAILABLE;
            dispatchState(true);
            return;
        }
        mainHandler.removeCallbacks(orientationTimeout);
        if (smoothedHeadingDegrees == null) {
            mainHandler.postDelayed(orientationTimeout, ORIENTATION_TIMEOUT_MS);
        }
    }

    private void stopWatches() {
        stopLocationWatch();
        stopOrientationWatch();
        mainHandler.removeCallbacks(locationTimeout);
        mainHandler.removeCallbacks(orientationTimeout);
    }

    private void stopLocationWatch() {
        if (locationListening) {
            locationManager.removeUpdates(this);
            locationListening = false;
        }
        mainHandler.removeCallbacks(locationTimeout);
    }

    private void stopOrientationWatch() {
        if (orientationListening) {
            sensorManager.unregisterListener(this);
            orientationListening = false;
        }
        mainHandler.removeCallbacks(orientationTimeout);
    }

    @Override
    public void onLocationChanged(Location location) {
        if (!tracking || paused || location == null) return;
        if (latestLocation == null
                || location.getElapsedRealtimeNanos() >= latestLocation.getElapsedRealtimeNanos()) {
            latestLocation = new Location(location);
            locationPermission = ArNavigationState.PermissionState.GRANTED;
            mainHandler.removeCallbacks(locationTimeout);
            dispatchState(false);
        }
    }

    @Override
    public void onProviderDisabled(String provider) {
        updateLocationCapability();
        dispatchState(true);
    }

    @Override
    public void onProviderEnabled(String provider) {
        updateLocationCapability();
        beginWatchesWhenPossible();
        dispatchState(true);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onStatusChanged(String provider, int status, Bundle extras) {
        // Provider status is reflected by subsequent location/provider callbacks.
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!tracking || paused || event == null) return;
        float[] rotationMatrix = new float[9];
        if (event.sensor.getType() == Sensor.TYPE_ROTATION_VECTOR
                || event.sensor.getType() == Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR) {
            SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values);
        } else if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            latestAcceleration = event.values.clone();
            if (latestMagneticField == null
                    || !SensorManager.getRotationMatrix(
                    rotationMatrix,
                    null,
                    latestAcceleration,
                    latestMagneticField
            )) return;
        } else if (event.sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) {
            latestMagneticField = event.values.clone();
            if (latestAcceleration == null
                    || !SensorManager.getRotationMatrix(
                    rotationMatrix,
                    null,
                    latestAcceleration,
                    latestMagneticField
            )) return;
        } else {
            return;
        }

        float[] adjustedMatrix = remapForDisplayRotation(rotationMatrix);
        float[] orientation = SensorManager.getOrientation(adjustedMatrix, new float[3]);
        double rawHeading = ArNavigationMath.normalizeDegrees(Math.toDegrees(orientation[0]));
        if (smoothedHeadingDegrees == null) {
            smoothedHeadingDegrees = rawHeading;
        } else {
            double delta = ArNavigationMath.angleDifferenceDegrees(rawHeading, smoothedHeadingDegrees);
            smoothedHeadingDegrees = ArNavigationMath.normalizeDegrees(
                    smoothedHeadingDegrees + delta * HEADING_SMOOTHING_FACTOR
            );
        }
        orientationPermission = ArNavigationState.PermissionState.GRANTED;
        mainHandler.removeCallbacks(orientationTimeout);
        dispatchState(false);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // The latest valid heading remains usable while Android recalibrates.
    }

    private float[] remapForDisplayRotation(float[] rotationMatrix) {
        int rotation = activity.getWindowManager().getDefaultDisplay().getRotation();
        if (rotation == Surface.ROTATION_0) return rotationMatrix;

        int xAxis;
        int yAxis;
        if (rotation == Surface.ROTATION_90) {
            xAxis = SensorManager.AXIS_Y;
            yAxis = SensorManager.AXIS_MINUS_X;
        } else if (rotation == Surface.ROTATION_180) {
            xAxis = SensorManager.AXIS_MINUS_X;
            yAxis = SensorManager.AXIS_MINUS_Y;
        } else {
            xAxis = SensorManager.AXIS_MINUS_Y;
            yAxis = SensorManager.AXIS_X;
        }
        float[] adjusted = new float[9];
        SensorManager.remapCoordinateSystem(rotationMatrix, xAxis, yAxis, adjusted);
        return adjusted;
    }

    private void dispatchState(boolean force) {
        long now = SystemClock.elapsedRealtime();
        if (!force && now - lastStateDispatchElapsedMs < MIN_STATE_INTERVAL_MS) return;
        lastStateDispatchElapsedMs = now;
        currentState = buildState();
        listener.onStateChanged(currentState);
    }

    private ArNavigationState buildState() {
        Double distance = null;
        Double bearing = null;
        ArNavigationMath.Projection waypoint = ArNavigationMath.projectWaypoint(0.0, 0.0, 1.0);
        if (target != null && latestLocation != null) {
            distance = ArNavigationMath.distanceMeters(
                    latestLocation.getLatitude(),
                    latestLocation.getLongitude(),
                    target.latitude,
                    target.longitude
            );
            bearing = ArNavigationMath.bearingDegrees(
                    latestLocation.getLatitude(),
                    latestLocation.getLongitude(),
                    target.latitude,
                    target.longitude
            );
        }
        if (bearing != null && smoothedHeadingDegrees != null && target != null) {
            waypoint = ArNavigationMath.projectWaypoint(
                    bearing,
                    smoothedHeadingDegrees,
                    target.cameraFovDegrees
            );
        } else {
            waypoint = new ArNavigationMath.Projection(false, null, null, 0.0);
        }

        String fallbackReason = fallbackReason();
        ArNavigationState.Mode mode;
        if (!tracking || target == null) {
            mode = ArNavigationState.Mode.IDLE;
        } else if (fallbackReason != null) {
            mode = ArNavigationState.Mode.FALLBACK;
        } else if (paused || distance == null || smoothedHeadingDegrees == null
                || cameraPermission != ArNavigationState.PermissionState.GRANTED) {
            mode = ArNavigationState.Mode.REQUESTING;
        } else {
            mode = ArNavigationState.Mode.LIVE;
        }

        boolean arrivalUnlocked = mode == ArNavigationState.Mode.LIVE
                && distance != null
                && target != null
                && distance <= target.radiusMeters + target.geofenceGraceMeters;
        return new ArNavigationState(
                mode,
                cameraPermission,
                locationPermission,
                orientationPermission,
                fallbackReason,
                latestLocation == null ? null : latestLocation.getLatitude(),
                latestLocation == null ? null : latestLocation.getLongitude(),
                smoothedHeadingDegrees,
                bearing,
                distance,
                waypoint,
                arrivalUnlocked,
                tracking,
                System.currentTimeMillis()
        );
    }

    private String fallbackReason() {
        if (cameraPermission == ArNavigationState.PermissionState.DENIED) {
            return "Camera access was denied.";
        }
        if (cameraPermission == ArNavigationState.PermissionState.UNAVAILABLE) {
            return "No rear camera is available on this device.";
        }
        if (locationPermission == ArNavigationState.PermissionState.DENIED) {
            return "Location access was denied.";
        }
        if (locationPermission == ArNavigationState.PermissionState.UNAVAILABLE) {
            return "Location services are unavailable.";
        }
        if (orientationPermission == ArNavigationState.PermissionState.DENIED) {
            return "Compass access was denied.";
        }
        if (orientationPermission == ArNavigationState.PermissionState.UNAVAILABLE) {
            return "This device has no usable compass sensor.";
        }
        return null;
    }

    private boolean hasPermission(String permission) {
        return activity.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasFineOrCoarseLocation() {
        return hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                || hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    private void requireMainThread() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            throw new IllegalStateException("AR navigation must be controlled from the main thread.");
        }
    }

    private static ArNavigationState idleState() {
        return new ArNavigationState(
                ArNavigationState.Mode.IDLE,
                ArNavigationState.PermissionState.UNREQUESTED,
                ArNavigationState.PermissionState.UNREQUESTED,
                ArNavigationState.PermissionState.UNREQUESTED,
                null,
                null,
                null,
                null,
                null,
                null,
                new ArNavigationMath.Projection(false, null, null, 0.0),
                false,
                false,
                System.currentTimeMillis()
        );
    }
}
