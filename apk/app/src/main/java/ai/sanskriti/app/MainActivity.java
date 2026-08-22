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
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
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
import java.util.Locale;

import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int WEB_PERMISSION_REQUEST = 1002;
    private static final int GEOLOCATION_REQUEST = 1003;
    private static final long PAGE_LOAD_TIMEOUT_MS = 15_000L;
    private static final long PAGE_HEALTH_CHECK_DELAY_MS = 6_000L;
    private static final String ERROR_PAGE_URL = "https://sanskriti.local/error";

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileCallback;
    private Uri captureUri;
    private PermissionRequest pendingWebPermission;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean mainPageFinished;
    private boolean showingConnectionError;
    private TextToSpeech textToSpeech;
    private boolean textToSpeechReady;

    private final Runnable pageLoadTimeout = () -> {
        if (!mainPageFinished && !showingConnectionError) {
            showConnectionError("The Sanskriti service did not respond in time.");
        }
    };

    private final Runnable pageHealthCheck = () -> {
        if (!mainPageFinished || showingConnectionError || webView == null) return;
        webView.evaluateJavascript(
                "(function(){"
                        + "var profileLoader=document.querySelector('img[aria-label=\"Loading your profile\"]');"
                        + "var issueOverlay=Array.from(document.querySelectorAll('button')).some(function(button){return /issues?/i.test(button.textContent||'');});"
                        + "return Boolean(profileLoader||issueOverlay);"
                        + "})()",
                value -> {
                    if ("true".equals(value) && !showingConnectionError) {
                        showConnectionError("Your profile service is temporarily unavailable.");
                    }
                }
        );
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureLayout();
        configureTextToSpeech();
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
        settings.setSupportMultipleWindows(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setBackgroundColor(Color.rgb(7, 10, 22));
        webView.setWebViewClient(new SanskritiWebViewClient());
        webView.setWebChromeClient(new SanskritiChromeClient());
        webView.setDownloadListener(createDownloadListener());
        webView.addJavascriptInterface(new SanskritiAndroidBridge(), "SanskritiAndroid");
    }

    private void configureTextToSpeech() {
        textToSpeech = new TextToSpeech(this, status -> {
            textToSpeechReady = status == TextToSpeech.SUCCESS;
            if (!textToSpeechReady || textToSpeech == null) return;
            textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                    emitSpeechEvent(utteranceId, "start");
                }

                @Override
                public void onDone(String utteranceId) {
                    emitSpeechEvent(utteranceId, "end");
                }

                @Override
                public void onError(String utteranceId) {
                    emitSpeechEvent(utteranceId, "error");
                }

                @Override
                public void onError(String utteranceId, int errorCode) {
                    emitSpeechEvent(utteranceId, "error");
                }
            });
        });
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
            if (scheme == null) return false;
            if (scheme.equals("http") || scheme.equals("https")) {
                if (!request.isForMainFrame() || isTrustedAppUri(uri)) return false;
                return openExternal(uri);
            }
            return openExternal(uri);
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            if (url.startsWith(ERROR_PAGE_URL)) {
                mainPageFinished = true;
                mainHandler.removeCallbacks(pageLoadTimeout);
                mainHandler.removeCallbacks(pageHealthCheck);
                return;
            }
            showingConnectionError = false;
            mainPageFinished = false;
            mainHandler.removeCallbacks(pageLoadTimeout);
            mainHandler.removeCallbacks(pageHealthCheck);
            mainHandler.postDelayed(pageLoadTimeout, PAGE_LOAD_TIMEOUT_MS);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (url.startsWith(ERROR_PAGE_URL)) {
                CookieManager.getInstance().flush();
                return;
            }
            mainPageFinished = true;
            mainHandler.removeCallbacks(pageLoadTimeout);
            mainHandler.removeCallbacks(pageHealthCheck);
            mainHandler.postDelayed(pageHealthCheck, PAGE_HEALTH_CHECK_DELAY_MS);
            if (isTrustedAppUri(Uri.parse(url))) installNativeSpeechBridge(view);
            CookieManager.getInstance().flush();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                showConnectionError(error.getDescription().toString());
            }
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse errorResponse) {
            super.onReceivedHttpError(view, request, errorResponse);
            if (request.isForMainFrame() && errorResponse.getStatusCode() >= 400) {
                showConnectionError("The Sanskriti service returned HTTP " + errorResponse.getStatusCode() + ".");
            }
        }
    }

    private final class SanskritiAndroidBridge {
        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public void speak(
                String utteranceId,
                String text,
                String languageTag,
                double rate,
                double pitch,
                double volume
        ) {
            mainHandler.post(() -> speakNative(
                    utteranceId,
                    text,
                    languageTag,
                    (float) rate,
                    (float) pitch,
                    (float) volume
            ));
        }

        @JavascriptInterface
        public void stopSpeaking() {
            mainHandler.post(() -> {
                if (textToSpeech != null) textToSpeech.stop();
            });
        }
    }

    private void speakNative(
            String utteranceId,
            String text,
            String languageTag,
            float rate,
            float pitch,
            float volume
    ) {
        if (!textToSpeechReady || textToSpeech == null || text == null || text.trim().isEmpty()) {
            emitSpeechEvent(utteranceId, "error");
            return;
        }

        Locale locale = Locale.forLanguageTag(
                languageTag == null || languageTag.trim().isEmpty() ? "en-US" : languageTag
        );
        textToSpeech.setLanguage(locale);
        textToSpeech.setSpeechRate(Math.max(0.1f, Math.min(rate, 2.0f)));
        textToSpeech.setPitch(Math.max(0.5f, Math.min(pitch, 2.0f)));

        Bundle parameters = new Bundle();
        parameters.putFloat(
                TextToSpeech.Engine.KEY_PARAM_VOLUME,
                Math.max(0.0f, Math.min(volume, 1.0f))
        );
        int result = textToSpeech.speak(
                text,
                TextToSpeech.QUEUE_ADD,
                parameters,
                utteranceId
        );
        if (result == TextToSpeech.ERROR) emitSpeechEvent(utteranceId, "error");
    }

    private void emitSpeechEvent(String utteranceId, String event) {
        mainHandler.post(() -> {
            if (webView == null) return;
            webView.evaluateJavascript(
                    "window.__sanskritiNativeSpeechEvent&&window.__sanskritiNativeSpeechEvent("
                            + JSONObject.quote(utteranceId) + "," + JSONObject.quote(event) + ")",
                    null
            );
        });
    }

    private void installNativeSpeechBridge(WebView view) {
        view.evaluateJavascript(
                "(function(){"
                        + "if(!window.SanskritiAndroid||window.__sanskritiNativeSpeechInstalled)return;"
                        + "window.__sanskritiNativeSpeechInstalled=true;"
                        + "var entries={},sequence=0;"
                        + "function Utterance(text){this.text=String(text||'');this.lang='en-US';this.rate=1;this.pitch=1;this.volume=1;this.voice=null;this.onstart=null;this.onend=null;this.onerror=null;}"
                        + "var voice={default:true,lang:'en-US',localService:true,name:'Android Native',voiceURI:'android-native'};"
                        + "var synth={speaking:false,pending:false,paused:false,onvoiceschanged:null,"
                        + "getVoices:function(){return[voice];},pause:function(){},resume:function(){},"
                        + "cancel:function(){window.SanskritiAndroid.stopSpeaking();entries={};this.speaking=false;this.pending=false;},"
                        + "speak:function(utterance){var id='native-'+Date.now()+'-'+(++sequence);entries[id]=utterance;this.pending=true;window.SanskritiAndroid.speak(id,String(utterance.text||''),utterance.lang||'en-US',Number(utterance.rate)||1,Number(utterance.pitch)||1,Number(utterance.volume));}};"
                        + "window.__sanskritiNativeSpeechEvent=function(id,event){var utterance=entries[id];if(!utterance)return;if(event==='start'){synth.speaking=true;synth.pending=false;if(typeof utterance.onstart==='function')utterance.onstart();return;}delete entries[id];synth.speaking=false;synth.pending=Object.keys(entries).length>0;var callback=event==='end'?utterance.onend:utterance.onerror;if(typeof callback==='function')callback(event==='error'?{error:'native-tts'}:undefined);};"
                        + "try{Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});}catch(error){window.SpeechSynthesisUtterance=Utterance;}"
                        + "try{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});}catch(error){window.speechSynthesis=synth;}"
                        + "})();",
                null
        );
    }

    private boolean isTrustedAppUri(Uri uri) {
        if (uri == null) return false;
        if (uri.toString().startsWith(ERROR_PAGE_URL)) return true;
        Uri appUri = Uri.parse(normalizedAppUrl());
        return safeEquals(appUri.getScheme(), uri.getScheme())
                && safeEquals(appUri.getHost(), uri.getHost())
                && effectivePort(appUri) == effectivePort(uri);
    }

    private boolean safeEquals(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private int effectivePort(Uri uri) {
        if (uri.getPort() >= 0) return uri.getPort();
        return "http".equalsIgnoreCase(uri.getScheme()) ? 80 : 443;
    }

    private final class SanskritiChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
        }

        @Override
        public boolean onCreateWindow(
                WebView view,
                boolean isDialog,
                boolean isUserGesture,
                Message resultMsg
        ) {
            WebView externalWindow = new WebView(MainActivity.this);
            externalWindow.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageStarted(WebView popup, String url, android.graphics.Bitmap favicon) {
                    if ("about:blank".equals(url)) return;
                    popup.stopLoading();
                    openExternal(Uri.parse(url));
                    popup.destroy();
                }
            });
            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
            transport.setWebView(externalWindow);
            resultMsg.sendToTarget();
            return true;
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
        if (showingConnectionError || webView == null) return;
        showingConnectionError = true;
        mainPageFinished = true;
        mainHandler.removeCallbacks(pageLoadTimeout);
        mainHandler.removeCallbacks(pageHealthCheck);
        String safeDetail = detail.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>body{margin:0;background:#070a16;color:#f5e6d3;font-family:sans-serif;display:grid;place-items:center;min-height:100vh}"
                + ".card{margin:24px;max-width:420px;padding:28px;border:1px solid rgba(201,168,76,.25);border-radius:24px;background:#120e20;text-align:center}"
                + "h1{color:#f7d88c;font-size:24px}p{color:#c4a882;line-height:1.5}button{border:0;border-radius:999px;padding:12px 22px;background:#c9a84c;color:#0e0916;font-weight:700}</style></head>"
                + "<body><div class='card'><h1>Sanskriti AI is offline</h1><p>Start the Sanskriti server or connect to the configured deployment, then try again.</p>"
                + "<p><small>" + safeDetail + "</small></p><button onclick='location.href=\"" + normalizedAppUrl() + "\"'>Try again</button></div></body></html>";
        webView.loadDataWithBaseURL(ERROR_PAGE_URL, html, "text/html", "UTF-8", null);
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
    protected void onPause() {
        if (webView != null) webView.onPause();
        if (textToSpeech != null) textToSpeech.stop();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        super.onDestroy();
    }
}
