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
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
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
import android.window.OnBackInvokedDispatcher;
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
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.util.Base64;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int WEB_PERMISSION_REQUEST = 1002;
    private static final int GEOLOCATION_REQUEST = 1003;
    private static final int AR_NAVIGATION_PERMISSION_REQUEST = 1004;
    private static final long PAGE_LOAD_TIMEOUT_MS = 15_000L;
    private static final long PAGE_HEALTH_CHECK_DELAY_MS = 6_000L;
    private static final String ERROR_PAGE_URL = "https://sanskriti.local/error";
    private static final String BUNDLED_APP_HOST = "appassets.androidplatform.net";
    private static final String NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
    private static final String NVIDIA_STATUS_URL = "https://integrate.api.nvidia.com/v1/status/";
    private static final String NVIDIA_TTS_URL = "https://877104f7-e885-42b9-8de8-f6e4c6303969.invocation.api.nvcf.nvidia.com/v1/audio/synthesize";

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
    private ArNavigationController arNavigationController;
    private final ExecutorService networkExecutor = Executors.newFixedThreadPool(2);

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
        arNavigationController = new ArNavigationController(
                this,
                AR_NAVIGATION_PERMISSION_REQUEST,
                this::emitArNavigationState
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    this::handleBackNavigation
            );
        }

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
        if (url.isEmpty()) return "https://" + BUNDLED_APP_HOST + "/";
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return "https://" + url;
        }
        return url;
    }

    private final class SanskritiWebViewClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (BUNDLED_APP_HOST.equalsIgnoreCase(uri.getHost())) {
                return serveBundledRequest(uri);
            }
            return super.shouldInterceptRequest(view, request);
        }

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
            Uri pageUri = Uri.parse(url);
            String pagePath = pageUri.getPath();
            if (arNavigationController != null
                    && arNavigationController.getCurrentState().tracking
                    && isTrustedAppUri(pageUri)
                    && (pagePath == null || !pagePath.startsWith("/explore"))) {
                arNavigationController.stop();
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
            if (isTrustedAppUri(Uri.parse(url))) {
                installNativeSpeechBridge(view);
                installNativeArNavigationBridge(view);
            }
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

    private WebResourceResponse serveBundledRequest(Uri uri) {
        String requestPath = uri.getPath() == null ? "/" : uri.getPath();
        if (requestPath.startsWith("/api/")) {
            String json = "{\"error\":\"AI server is not configured in this standalone demo build.\"}";
            return response(
                    "application/json",
                    503,
                    "Service Unavailable",
                    new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8))
            );
        }

        String relativePath = requestPath.replaceFirst("^/+", "");
        if (relativePath.isEmpty()) relativePath = "index.html";
        if (relativePath.endsWith("/")) relativePath += "index.html";

        WebResourceResponse direct = openBundledAsset(relativePath);
        if (direct != null) return direct;

        if (!relativePath.contains(".")) {
            WebResourceResponse route = openBundledAsset(relativePath + "/index.html");
            if (route != null) return route;
        }

        String notFound = "<!doctype html><meta name='viewport' content='width=device-width'>"
                + "<body style='background:#070a16;color:#f5e6d3;font-family:sans-serif;padding:32px'>"
                + "This bundled screen was not found.</body>";
        return response(
                "text/html",
                404,
                "Not Found",
                new ByteArrayInputStream(notFound.getBytes(StandardCharsets.UTF_8))
        );
    }

    private WebResourceResponse openBundledAsset(String relativePath) {
        try {
            InputStream stream = getAssets().open("www/" + relativePath, android.content.res.AssetManager.ACCESS_STREAMING);
            return response(mimeTypeFor(relativePath), 200, "OK", stream);
        } catch (IOException ignored) {
            return null;
        }
    }

    private WebResourceResponse response(
            String mimeType,
            int statusCode,
            String reason,
            InputStream stream
    ) {
        return new WebResourceResponse(
                mimeType,
                "UTF-8",
                statusCode,
                reason,
                Collections.singletonMap("Cache-Control", "no-cache"),
                stream
        );
    }

    private String mimeTypeFor(String path) {
        String extension = MimeTypeMap.getFileExtensionFromUrl(path);
        String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        if (mimeType != null) return mimeType;
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".json") || path.endsWith(".txt")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
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

        @JavascriptInterface
        public String getNvidiaModel(String task) {
            if ("vision".equals(task)) return BuildConfig.NVIDIA_VISION_MODEL;
            if ("speech".equals(task)) return BuildConfig.NVIDIA_SPEECH_MODEL;
            return BuildConfig.NVIDIA_CHAT_MODEL;
        }

        @JavascriptInterface
        public void requestNvidia(String requestId, String requestBody) {
            if (BuildConfig.NVIDIA_API_KEY.trim().isEmpty()) {
                emitNvidiaResult(requestId, "", "NVIDIA API key is not configured in this APK.");
                return;
            }
            networkExecutor.execute(() -> {
                try {
                    String responseBody = executeNvidiaRequest(NVIDIA_CHAT_URL, "POST", requestBody);
                    JSONObject responseJson = new JSONObject(responseBody);
                    if (responseJson.has("requestId") && !responseJson.has("choices")) {
                        responseBody = pollNvidiaResult(responseJson.getString("requestId"));
                    }
                    emitNvidiaResult(requestId, responseBody, "");
                } catch (Exception error) {
                    emitNvidiaResult(
                            requestId,
                            "",
                            error.getMessage() == null ? "NVIDIA request failed." : error.getMessage()
                    );
                }
            });
        }

        @JavascriptInterface
        public void requestNvidiaSpeech(
                String requestId,
                String text,
                String language,
                String voice
        ) {
            if (BuildConfig.NVIDIA_API_KEY.trim().isEmpty()) {
                emitNvidiaSpeechResult(requestId, "", "NVIDIA API key is not configured in this APK.");
                return;
            }
            networkExecutor.execute(() -> {
                try {
                    byte[] audio = executeNvidiaSpeechRequest(text, language, voice);
                    emitNvidiaSpeechResult(
                            requestId,
                            Base64.encodeToString(audio, Base64.NO_WRAP),
                            ""
                    );
                } catch (Exception error) {
                    emitNvidiaSpeechResult(
                            requestId,
                            "",
                            error.getMessage() == null ? "NVIDIA narration failed." : error.getMessage()
                    );
                }
            });
        }

        @JavascriptInterface
        public void recordMicrophone(String requestId, int durationMs) {
            if (!hasPermission(Manifest.permission.RECORD_AUDIO)) {
                emitMicrophoneResult(requestId, "", "Microphone permission is required.");
                return;
            }
            networkExecutor.execute(() -> recordPhoneMicrophone(
                    requestId,
                    Math.max(1_000, Math.min(durationMs, 8_000))
            ));
        }

        /**
         * Starts the neutral native AR controller for one active zone. The
         * controller never awards XP or advances routes; the bundled Explore
         * flow remains the single owner of those product actions.
         */
        @JavascriptInterface
        public void startArNavigation(
                double targetLatitude,
                double targetLongitude,
                double radiusMeters,
                double cameraFovDegrees,
                double geofenceGraceMeters
        ) {
            mainHandler.post(() -> {
                if (arNavigationController == null) return;
                try {
                    arNavigationController.start(new ArNavigationController.Target(
                            targetLatitude,
                            targetLongitude,
                            radiusMeters,
                            cameraFovDegrees,
                            geofenceGraceMeters
                    ));
                } catch (IllegalArgumentException error) {
                    emitArNavigationError(error.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void retryArNavigation() {
            mainHandler.post(() -> {
                if (arNavigationController != null) arNavigationController.retry();
            });
        }

        @JavascriptInterface
        public void stopArNavigation() {
            mainHandler.post(() -> {
                if (arNavigationController != null) arNavigationController.stop();
            });
        }

        @JavascriptInterface
        public String getArNavigationState() {
            if (arNavigationController == null) return "{}";
            return arNavigationController.getCurrentState().toJson().toString();
        }
    }

    @SuppressWarnings("MissingPermission")
    private void recordPhoneMicrophone(String requestId, int durationMs) {
        final int sampleRate = 16_000;
        final int channelConfig = AudioFormat.CHANNEL_IN_MONO;
        final int encoding = AudioFormat.ENCODING_PCM_16BIT;
        int minimumBuffer = AudioRecord.getMinBufferSize(sampleRate, channelConfig, encoding);
        if (minimumBuffer <= 0) minimumBuffer = sampleRate;
        AudioRecord recorder = null;
        try {
            recorder = new AudioRecord(
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    sampleRate,
                    channelConfig,
                    encoding,
                    Math.max(minimumBuffer * 2, sampleRate)
            );
            if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
                throw new IOException("The phone microphone could not be initialized.");
            }

            byte[] buffer = new byte[minimumBuffer];
            ByteArrayOutputStream pcm = new ByteArrayOutputStream(sampleRate * 2 * durationMs / 1_000);
            long finishAt = System.currentTimeMillis() + durationMs;
            recorder.startRecording();
            while (System.currentTimeMillis() < finishAt) {
                int count = recorder.read(buffer, 0, buffer.length);
                if (count > 0) pcm.write(buffer, 0, count);
                else if (count < 0) throw new IOException("Microphone recording failed with code " + count + ".");
            }
            recorder.stop();
            byte[] wav = pcmToWav(pcm.toByteArray(), sampleRate, 1, 16);
            emitMicrophoneResult(requestId, Base64.encodeToString(wav, Base64.NO_WRAP), "");
        } catch (Exception error) {
            emitMicrophoneResult(
                    requestId,
                    "",
                    error.getMessage() == null ? "Microphone recording failed." : error.getMessage()
            );
        } finally {
            if (recorder != null) {
                if (recorder.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) recorder.stop();
                recorder.release();
            }
        }
    }

    private byte[] pcmToWav(byte[] pcm, int sampleRate, int channels, int bitsPerSample) throws IOException {
        int byteRate = sampleRate * channels * bitsPerSample / 8;
        ByteBuffer header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN);
        header.put("RIFF".getBytes(StandardCharsets.US_ASCII));
        header.putInt(36 + pcm.length);
        header.put("WAVE".getBytes(StandardCharsets.US_ASCII));
        header.put("fmt ".getBytes(StandardCharsets.US_ASCII));
        header.putInt(16);
        header.putShort((short) 1);
        header.putShort((short) channels);
        header.putInt(sampleRate);
        header.putInt(byteRate);
        header.putShort((short) (channels * bitsPerSample / 8));
        header.putShort((short) bitsPerSample);
        header.put("data".getBytes(StandardCharsets.US_ASCII));
        header.putInt(pcm.length);
        ByteArrayOutputStream wav = new ByteArrayOutputStream(44 + pcm.length);
        wav.write(header.array());
        wav.write(pcm);
        return wav.toByteArray();
    }

    private void emitMicrophoneResult(String requestId, String audioBase64, String error) {
        mainHandler.post(() -> {
            if (webView == null) return;
            webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('sanskriti-microphone-result',{detail:{requestId:"
                            + JSONObject.quote(requestId == null ? "" : requestId)
                            + ",audioBase64:" + JSONObject.quote(audioBase64 == null ? "" : audioBase64)
                            + ",error:" + JSONObject.quote(error == null ? "" : error) + "}}))",
                    null
            );
        });
    }

    private String pollNvidiaResult(String nvidiaRequestId) throws Exception {
        for (int attempt = 0; attempt < 30; attempt++) {
            Thread.sleep(1_000L);
            try {
                return executeNvidiaRequest(NVIDIA_STATUS_URL + nvidiaRequestId, "GET", null);
            } catch (PendingNvidiaRequest ignored) {
                // The hosted model is still processing the request.
            }
        }
        throw new IOException("NVIDIA request timed out.");
    }

    private String executeNvidiaRequest(String endpoint, String method, String requestBody) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(15_000);
        connection.setReadTimeout(60_000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Authorization", "Bearer " + BuildConfig.NVIDIA_API_KEY);
        if (requestBody != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            try (OutputStream output = connection.getOutputStream()) {
                output.write(requestBody.getBytes(StandardCharsets.UTF_8));
            }
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        StringBuilder responseBody = new StringBuilder();
        if (stream != null) {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(stream, StandardCharsets.UTF_8)
            )) {
                String line;
                while ((line = reader.readLine()) != null) responseBody.append(line);
            }
        }
        connection.disconnect();

        if (status == 202 && "GET".equals(method)) throw new PendingNvidiaRequest();
        if (status == 202) return responseBody.toString();
        if (status < 200 || status >= 300) {
            String detail = responseBody.length() == 0
                    ? "NVIDIA returned HTTP " + status + "."
                    : responseBody.toString();
            throw new IOException(detail.length() > 500 ? detail.substring(0, 500) : detail);
        }
        return responseBody.toString();
    }

    private byte[] executeNvidiaSpeechRequest(String text, String language, String voice) throws Exception {
        String boundary = "----SanskritiNvidia" + System.currentTimeMillis();
        HttpURLConnection connection = (HttpURLConnection) new URL(NVIDIA_TTS_URL).openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(15_000);
        connection.setReadTimeout(60_000);
        connection.setDoOutput(true);
        connection.setRequestProperty("Accept", "audio/wav");
        connection.setRequestProperty("Authorization", "Bearer " + BuildConfig.NVIDIA_API_KEY);
        connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

        try (OutputStream output = connection.getOutputStream()) {
            writeMultipartField(output, boundary, "text", text == null ? "" : text);
            writeMultipartField(output, boundary, "language", language == null ? "en-US" : language);
            writeMultipartField(output, boundary, "voice", voice == null ? "" : voice);
            writeMultipartField(output, boundary, "encoding", "LINEAR_PCM");
            writeMultipartField(output, boundary, "sample_rate_hz", "22050");
            output.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        ByteArrayOutputStream response = new ByteArrayOutputStream();
        if (stream != null) {
            try (InputStream input = stream) {
                byte[] buffer = new byte[8_192];
                int count;
                while ((count = input.read(buffer)) >= 0) {
                    if (count > 0) response.write(buffer, 0, count);
                }
            }
        }
        connection.disconnect();
        if (status < 200 || status >= 300) {
            String detail = new String(response.toByteArray(), StandardCharsets.UTF_8);
            throw new IOException(detail.isEmpty() ? "NVIDIA narration returned HTTP " + status + "." : detail);
        }
        return response.toByteArray();
    }

    private void writeMultipartField(OutputStream output, String boundary, String name, String value)
            throws IOException {
        String header = "--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n";
        output.write(header.getBytes(StandardCharsets.UTF_8));
        output.write(value.getBytes(StandardCharsets.UTF_8));
        output.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private static final class PendingNvidiaRequest extends Exception {}

    private void emitNvidiaResult(String requestId, String responseBody, String error) {
        mainHandler.post(() -> {
            if (webView == null) return;
            webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('sanskriti-nvidia-result',{detail:{requestId:"
                            + JSONObject.quote(requestId == null ? "" : requestId)
                            + ",response:" + JSONObject.quote(responseBody == null ? "" : responseBody)
                            + ",error:" + JSONObject.quote(error == null ? "" : error) + "}}))",
                    null
            );
        });
    }

    private void emitNvidiaSpeechResult(String requestId, String audioBase64, String error) {
        mainHandler.post(() -> {
            if (webView == null) return;
            webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('sanskriti-nvidia-speech-result',{detail:{requestId:"
                            + JSONObject.quote(requestId == null ? "" : requestId)
                            + ",audioBase64:" + JSONObject.quote(audioBase64 == null ? "" : audioBase64)
                            + ",error:" + JSONObject.quote(error == null ? "" : error) + "}}))",
                    null
            );
        });
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
                TextToSpeech.QUEUE_FLUSH,
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

    private void installNativeArNavigationBridge(WebView view) {
        view.evaluateJavascript(
                "(function(){"
                        + "if(!window.SanskritiAndroid||window.__sanskritiNativeArInstalled)return;"
                        + "window.__sanskritiNativeArInstalled=true;"
                        + "window.SanskritiAndroidAR={"
                        + "start:function(target){target=target||{};window.SanskritiAndroid.startArNavigation(Number(target.lat),Number(target.lng),Number(target.radius),Number(target.cameraFovDeg||65),Number(target.geofenceGraceMeters||0));},"
                        + "retry:function(){window.SanskritiAndroid.retryArNavigation();},"
                        + "stop:function(){window.SanskritiAndroid.stopArNavigation();},"
                        + "getState:function(){try{return JSON.parse(window.SanskritiAndroid.getArNavigationState()||'{}');}catch(error){return{};}}"
                        + "};"
                        + "window.dispatchEvent(new CustomEvent('sanskriti-ar-navigation-ready',{detail:window.SanskritiAndroidAR.getState()}));"
                        + "})();",
                null
        );
    }

    private void emitArNavigationState(ArNavigationState state) {
        if (webView == null || state == null) return;
        String stateJson = state.toJson().toString();
        webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('sanskriti-ar-navigation-state',{detail:JSON.parse("
                        + JSONObject.quote(stateJson) + ")}))",
                null
        );
    }

    private void emitArNavigationError(String message) {
        if (webView == null) return;
        webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('sanskriti-ar-navigation-error',{detail:{message:"
                        + JSONObject.quote(message == null ? "Invalid AR navigation target." : message)
                        + "}}))",
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
        } else if (requestCode == AR_NAVIGATION_PERMISSION_REQUEST
                && arNavigationController != null) {
            arNavigationController.onPermissionResult();
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
        if (arNavigationController != null) arNavigationController.pause();
        if (webView != null) webView.onPause();
        if (textToSpeech != null) textToSpeech.stop();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        if (arNavigationController != null) arNavigationController.resume();
    }

    @Override
    public void onBackPressed() {
        handleBackNavigation();
    }

    private void handleBackNavigation() {
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript(
                "(function(){var path=location.pathname.replace(/\\/+$/,'')||'/';"
                        + "if(path!=='/'&&path!=='/login'&&history.length>1){history.back();return true;}"
                        + "return false;})()",
                handled -> {
                    if ("true".equals(handled)) return;
                    if (webView.canGoBack()) webView.goBack();
                    else finish();
                }
        );
    }

    @Override
    protected void onDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        if (arNavigationController != null) {
            arNavigationController.destroy();
            arNavigationController = null;
        }
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
        networkExecutor.shutdownNow();
        super.onDestroy();
    }
}
