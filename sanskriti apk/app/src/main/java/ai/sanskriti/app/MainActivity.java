package ai.sanskriti.app;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int WEB_PERMISSION_REQUEST = 1002;
    private static final int GEOLOCATION_REQUEST = 1003;

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileCallback;
    private Uri captureUri;
    private PermissionRequest pendingWebPermission;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureLayout();
        configureWebView();

        if (savedInstanceState == null) {
            webView.loadUrl(normalizedAppUrl());
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void configureLayout() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(7, 10, 22));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(201, 168, 76)));
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3),
                Gravity.TOP
        );
        root.addView(progressBar, progressParams);
        setContentView(root);
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setBackgroundColor(Color.rgb(7, 10, 22));
        webView.setWebViewClient(new SanskritiWebViewClient());
        webView.setWebChromeClient(new SanskritiChromeClient());
        webView.setDownloadListener(createDownloadListener());
    }

    private String normalizedAppUrl() {
        String url = BuildConfig.APP_URL.trim();
        if (url.isEmpty()) return "https://smart-sanskriti.vercel.app";
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return "https://" + url;
        }
        return url;
    }

    private final class SanskritiWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme();
            if (scheme == null || scheme.equals("http") || scheme.equals("https")) {
                return false;
            }
            return openExternal(uri);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            CookieManager.getInstance().flush();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                showConnectionError(error.getDescription().toString());
            }
        }
    }

    private final class SanskritiChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
        }

        @Override
        public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams params
        ) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            launchFileChooser(params);
            return true;
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> requestWebPermissions(request));
        }

        @Override
        public void onPermissionRequestCanceled(PermissionRequest request) {
            if (pendingWebPermission == request) pendingWebPermission = null;
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(
                String origin,
                GeolocationPermissions.Callback callback
        ) {
            if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                callback.invoke(origin, true, false);
                return;
            }
            pendingGeoOrigin = origin;
            pendingGeoCallback = callback;
            requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
            }, GEOLOCATION_REQUEST);
        }
    }

    private void requestWebPermissions(PermissionRequest request) {
        List<String> androidPermissions = new ArrayList<>();
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                    && !hasPermission(Manifest.permission.CAMERA)) {
                androidPermissions.add(Manifest.permission.CAMERA);
            }
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                    && !hasPermission(Manifest.permission.RECORD_AUDIO)) {
                androidPermissions.add(Manifest.permission.RECORD_AUDIO);
            }
        }

        if (androidPermissions.isEmpty()) {
            grantSupportedWebResources(request);
            return;
        }

        pendingWebPermission = request;
        requestPermissions(androidPermissions.toArray(new String[0]), WEB_PERMISSION_REQUEST);
    }

    private void grantSupportedWebResources(PermissionRequest request) {
        List<String> allowed = new ArrayList<>();
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                    && hasPermission(Manifest.permission.CAMERA)) {
                allowed.add(resource);
            } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                    && hasPermission(Manifest.permission.RECORD_AUDIO)) {
                allowed.add(resource);
            } else if (PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID.equals(resource)) {
                allowed.add(resource);
            }
        }
        if (allowed.isEmpty()) request.deny();
        else request.grant(allowed.toArray(new String[0]));
    }

    private void launchFileChooser(WebChromeClient.FileChooserParams params) {
        String[] acceptTypes = cleanAcceptTypes(params.getAcceptTypes());
        String primaryType = acceptTypes.length == 0 ? "*/*" : acceptTypes[0];

        Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType(primaryType);
        if (acceptTypes.length > 1) picker.putExtra(Intent.EXTRA_MIME_TYPES, acceptTypes);
        picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);

        List<Intent> extraIntents = new ArrayList<>();
        if (acceptsImages(acceptTypes) && hasPermission(Manifest.permission.CAMERA)) {
            Intent camera = createCameraIntent();
            if (camera != null) extraIntents.add(camera);
        }

        Intent chooser = new Intent(Intent.ACTION_CHOOSER);
        chooser.putExtra(Intent.EXTRA_INTENT, picker);
        chooser.putExtra(Intent.EXTRA_TITLE, "Choose a photo or file");
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, extraIntents.toArray(new Intent[0]));
        try {
            startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
        } catch (ActivityNotFoundException exception) {
            finishFileChooser(null);
            Toast.makeText(this, "No file picker is available", Toast.LENGTH_LONG).show();
        }
    }

    private Intent createCameraIntent() {
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, "sanskriti-scan-" + System.currentTimeMillis() + ".jpg");
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Sanskriti AI");
        }
        captureUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (captureUri == null) return null;

        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        camera.putExtra(MediaStore.EXTRA_OUTPUT, captureUri);
        camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        return camera.resolveActivity(getPackageManager()) == null ? null : camera;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST) return;

        Uri[] results = null;
        if (resultCode == RESULT_OK) {
            if (data == null && captureUri != null) {
                results = new Uri[]{captureUri};
            } else if (data != null && data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int index = 0; index < count; index++) {
                    results[index] = data.getClipData().getItemAt(index).getUri();
                }
            } else if (data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        finishFileChooser(results);
    }

    private void finishFileChooser(Uri[] results) {
        if (fileCallback != null) fileCallback.onReceiveValue(results);
        fileCallback = null;
        captureUri = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == WEB_PERMISSION_REQUEST && pendingWebPermission != null) {
            PermissionRequest request = pendingWebPermission;
            pendingWebPermission = null;
            grantSupportedWebResources(request);
        } else if (requestCode == GEOLOCATION_REQUEST && pendingGeoCallback != null) {
            boolean granted = hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    || hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION);
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }

    private DownloadListener createDownloadListener() {
        return (url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimeType);
                request.addRequestHeader("User-Agent", userAgent);
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null) request.addRequestHeader("Cookie", cookie);
                request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
                request.setNotificationVisibility(
                        DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                );
                request.setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimeType)
                );
                DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                manager.enqueue(request);
                Toast.makeText(this, "Download started", Toast.LENGTH_SHORT).show();
            } catch (Exception error) {
                Toast.makeText(this, "Could not download this file", Toast.LENGTH_LONG).show();
            }
        };
    }

    private boolean openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
            return true;
        } catch (ActivityNotFoundException exception) {
            Toast.makeText(this, "No app can open this link", Toast.LENGTH_SHORT).show();
            return true;
        }
    }

    private void showConnectionError(String detail) {
        String safeDetail = detail.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>body{margin:0;background:#070a16;color:#f5e6d3;font-family:sans-serif;display:grid;place-items:center;min-height:100vh}"
                + ".card{margin:24px;max-width:420px;padding:28px;border:1px solid rgba(201,168,76,.25);border-radius:24px;background:#120e20;text-align:center}"
                + "h1{color:#f7d88c;font-size:24px}p{color:#c4a882;line-height:1.5}button{border:0;border-radius:999px;padding:12px 22px;background:#c9a84c;color:#0e0916;font-weight:700}</style></head>"
                + "<body><div class='card'><h1>Sanskriti AI is offline</h1><p>Start the Sanskriti server or connect to the configured deployment, then try again.</p>"
                + "<p><small>" + safeDetail + "</small></p><button onclick='location.href=\"" + normalizedAppUrl() + "\"'>Try again</button></div></body></html>";
        webView.loadDataWithBaseURL(normalizedAppUrl(), html, "text/html", "UTF-8", null);
    }

    private boolean hasPermission(String permission) {
        return checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    private String[] cleanAcceptTypes(String[] rawTypes) {
        if (rawTypes == null) return new String[0];
        return Arrays.stream(rawTypes)
                .filter(value -> value != null && !value.trim().isEmpty())
                .map(String::trim)
                .distinct()
                .toArray(String[]::new);
    }

    private boolean acceptsImages(String[] types) {
        if (types.length == 0) return true;
        for (String type : types) {
            if (type.equals("*/*") || type.startsWith("image/")) return true;
        }
        return false;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }
}
