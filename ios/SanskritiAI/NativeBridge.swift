import CoreLocation
import Foundation
import WebKit

/// Exposes the same JavaScript surface the Android shell injects, so the
/// bundled UI needs no iOS-specific code paths.
///
/// One structural difference drives the design here: Android's
/// `@JavascriptInterface` methods are synchronous, while WKWebView message
/// handlers are strictly asynchronous. Three methods are called synchronously
/// by the shared UI, so they are answered in JavaScript from state the native
/// side keeps pushed into the page:
///
///   - `isNativeApp()`           constant
///   - `getNvidiaModel(task)`    injected once at document start
///   - `getArNavigationState()`  mirrored into `window.__sanskritiArState`
///
/// `demoReportRequest` cannot be made synchronous at all, so it is deliberately
/// absent; `BundledUIServer` proxies `/api/demo/*` to the operations console
/// instead, which the UI reaches same-origin.
final class NativeBridge: NSObject {
    static let messageHandlerName = "sanskriti"

    private weak var webView: WKWebView?
    private let speech = SpeechService()
    private let microphone = MicrophoneService()
    private let nvidia = NvidiaService()
    let arNavigation = ARNavigationService()

    /// Called when the page asks for a light/dark theme, so the native
    /// container can match the web UI instead of flashing a white background.
    var onThemeChange: ((Bool) -> Void)?

    override init() {
        super.init()
        speech.onEvent = { [weak self] utteranceId, event in
            self?.emitSpeechEvent(utteranceId: utteranceId, event: event)
        }
        arNavigation.onState = { [weak self] service in
            self?.pushArNavigationState(service.stateJSONObject())
        }
    }

    func attach(to webView: WKWebView) {
        self.webView = webView
    }

    // MARK: - Injected JavaScript

    /// Installed at document start so `window.SanskritiAndroid` exists before
    /// any application code runs.
    func bridgeUserScript() -> WKUserScript {
        let models: [String: String] = [
            "chat": AppConfig.chatModel,
            "vision": AppConfig.visionModel,
            "speech": AppConfig.speechModel,
            "translation": AppConfig.translationModel,
        ]
        let modelsJSON = Self.jsonLiteral(models)

        let source = """
        (function(){
          if (window.SanskritiAndroid) return;
          function post(method, args){
            try { window.webkit.messageHandlers.\(Self.messageHandlerName).postMessage({method: method, args: args || []}); }
            catch (error) { /* the shell is not attached; stay silent */ }
          }
          window.SanskritiNativePlatform = 'ios';
          window.__sanskritiModels = \(modelsJSON);
          window.__sanskritiArState = {};
          window.SanskritiAndroid = {
            isNativeApp: function(){ return true; },
            getNvidiaModel: function(task){
              var models = window.__sanskritiModels || {};
              return models[task] || models.chat || '';
            },
            getArNavigationState: function(){
              try { return JSON.stringify(window.__sanskritiArState || {}); } catch (error) { return '{}'; }
            },
            speak: function(id, text, lang, rate, pitch, volume){
              post('speak', [String(id||''), String(text||''), String(lang||'en-US'), Number(rate)||1, Number(pitch)||1, volume === undefined ? 1 : Number(volume)]);
            },
            stopSpeaking: function(){ post('stopSpeaking', []); },
            requestNvidia: function(id, body){ post('requestNvidia', [String(id||''), String(body||'')]); },
            requestNvidiaSpeech: function(id, text, lang, voice){
              post('requestNvidiaSpeech', [String(id||''), String(text||''), String(lang||'en-US'), String(voice||'')]);
            },
            recordMicrophone: function(id, ms){ post('recordMicrophone', [String(id||''), Number(ms)||5000]); },
            setTheme: function(theme){ post('setTheme', [String(theme||'dark')]); },
            startArNavigation: function(lat, lng, radius, fov, grace){
              post('startArNavigation', [Number(lat), Number(lng), Number(radius), Number(fov)||65, Number(grace)||0]);
            },
            retryArNavigation: function(){ post('retryArNavigation', []); },
            stopArNavigation: function(){ post('stopArNavigation', []); },
            startDemoCompass: function(lat, lng){ post('startDemoCompass', [Number(lat), Number(lng)]); },
            stopDemoCompass: function(){ post('stopDemoCompass', []); }
          };
        })();
        """
        return WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }

    /// The speech-synthesis and AR shims, byte-for-byte equivalent to the ones
    /// `MainActivity` installs on page finish.
    func shimUserScript() -> WKUserScript {
        let source = """
        (function(){
          if(!window.SanskritiAndroid) return;
          if(!window.__sanskritiNativeSpeechInstalled){
            window.__sanskritiNativeSpeechInstalled=true;
            var entries={},sequence=0;
            function Utterance(text){this.text=String(text||'');this.lang='en-US';this.rate=1;this.pitch=1;this.volume=1;this.voice=null;this.onstart=null;this.onend=null;this.onerror=null;}
            var voice={default:true,lang:'en-US',localService:true,name:'iOS Native',voiceURI:'ios-native'};
            var synth={speaking:false,pending:false,paused:false,onvoiceschanged:null,
              getVoices:function(){return[voice];},pause:function(){},resume:function(){},
              cancel:function(){window.SanskritiAndroid.stopSpeaking();entries={};this.speaking=false;this.pending=false;},
              speak:function(utterance){var id='native-'+Date.now()+'-'+(++sequence);entries[id]=utterance;this.pending=true;window.SanskritiAndroid.speak(id,String(utterance.text||''),utterance.lang||'en-US',Number(utterance.rate)||1,Number(utterance.pitch)||1,Number(utterance.volume));}};
            window.__sanskritiNativeSpeechEvent=function(id,event){var utterance=entries[id];if(!utterance)return;if(event==='start'){synth.speaking=true;synth.pending=false;if(typeof utterance.onstart==='function')utterance.onstart();return;}delete entries[id];synth.speaking=false;synth.pending=Object.keys(entries).length>0;var callback=event==='end'?utterance.onend:utterance.onerror;if(typeof callback==='function')callback(event==='error'?{error:'native-tts'}:undefined);};
            try{Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});}catch(error){window.SpeechSynthesisUtterance=Utterance;}
            try{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});}catch(error){window.speechSynthesis=synth;}
          }
          if(!window.__sanskritiNativeArInstalled){
            window.__sanskritiNativeArInstalled=true;
            window.SanskritiAndroidAR={
              start:function(target){target=target||{};window.SanskritiAndroid.startArNavigation(Number(target.lat),Number(target.lng),Number(target.radius),Number(target.cameraFovDeg||65),Number(target.geofenceGraceMeters||0));},
              retry:function(){window.SanskritiAndroid.retryArNavigation();},
              stop:function(){window.SanskritiAndroid.stopArNavigation();},
              startCompass:function(reference){reference=reference||{};window.SanskritiAndroid.startDemoCompass(Number(reference.lat),Number(reference.lng));},
              stopCompass:function(){window.SanskritiAndroid.stopDemoCompass();},
              getState:function(){try{return JSON.parse(window.SanskritiAndroid.getArNavigationState()||'{}');}catch(error){return{};}}
            };
            window.dispatchEvent(new CustomEvent('sanskriti-ar-navigation-ready',{detail:window.SanskritiAndroidAR.getState()}));
          }
        })();
        """
        return WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
    }

    // MARK: - Events back into the page

    private func evaluate(_ script: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(script, completionHandler: nil)
        }
    }

    private func emitSpeechEvent(utteranceId: String, event: String) {
        evaluate("window.__sanskritiNativeSpeechEvent&&window.__sanskritiNativeSpeechEvent(\(Self.jsonLiteral(utteranceId)),\(Self.jsonLiteral(event)))")
    }

    private func emitCustomEvent(name: String, detail: [String: Any]) {
        let payload = Self.jsonLiteral(detail)
        evaluate("window.dispatchEvent(new CustomEvent(\(Self.jsonLiteral(name)),{detail:\(payload)}))")
    }

    private func pushArNavigationState(_ state: [String: Any]) {
        let payload = Self.jsonLiteral(state)
        // Mirrored into a global as well as dispatched, because
        // `getArNavigationState()` must answer synchronously.
        evaluate("window.__sanskritiArState=\(payload);window.dispatchEvent(new CustomEvent('sanskriti-ar-navigation-state',{detail:window.__sanskritiArState}))")
    }

    // MARK: - JSON helpers

    private static func jsonLiteral(_ value: Any) -> String {
        if let text = value as? String {
            let data = (try? JSONSerialization.data(withJSONObject: [text], options: [])) ?? Data("[\"\"]".utf8)
            let wrapped = String(data: data, encoding: .utf8) ?? "[\"\"]"
            return String(wrapped.dropFirst().dropLast())
        }
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(withJSONObject: value),
              let text = String(data: data, encoding: .utf8) else { return "{}" }
        return text
    }
}

// MARK: - WKScriptMessageHandler

extension NativeBridge: WKScriptMessageHandler {
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.messageHandlerName,
              let payload = message.body as? [String: Any],
              let method = payload["method"] as? String else { return }
        let args = payload["args"] as? [Any] ?? []

        func string(_ index: Int) -> String { (args.count > index ? args[index] as? String : nil) ?? "" }
        func number(_ index: Int) -> Double {
            guard args.count > index else { return 0 }
            if let value = args[index] as? Double { return value }
            if let value = args[index] as? NSNumber { return value.doubleValue }
            return 0
        }

        switch method {
        case "speak":
            speech.speak(utteranceId: string(0), text: string(1), languageTag: string(2),
                         rate: number(3), pitch: number(4), volume: number(5))

        case "stopSpeaking":
            speech.stop()

        case "requestNvidia":
            let requestId = string(0)
            nvidia.request(body: string(1)) { [weak self] response, error in
                self?.emitCustomEvent(name: "sanskriti-nvidia-result", detail: [
                    "requestId": requestId, "response": response, "error": error,
                ])
            }

        case "requestNvidiaSpeech":
            let requestId = string(0)
            nvidia.synthesizeSpeech(text: string(1), language: string(2), voice: string(3)) { [weak self] audio, error in
                self?.emitCustomEvent(name: "sanskriti-nvidia-speech-result", detail: [
                    "requestId": requestId, "audioBase64": audio, "error": error,
                ])
            }

        case "recordMicrophone":
            let requestId = string(0)
            microphone.record(durationMs: Int(number(1))) { [weak self] audio, error in
                self?.emitCustomEvent(name: "sanskriti-microphone-result", detail: [
                    "requestId": requestId, "audioBase64": audio, "error": error,
                ])
            }

        case "setTheme":
            onThemeChange?(string(0) == "light")

        case "startArNavigation":
            arNavigation.start(target: ARNavigationService.Target(
                latitude: number(0), longitude: number(1), radiusMeters: number(2),
                cameraFovDegrees: number(3), geofenceGraceMeters: number(4)))

        case "retryArNavigation":
            arNavigation.retry()

        case "stopArNavigation":
            arNavigation.stop()

        case "startDemoCompass":
            arNavigation.startDemoCompass(reference: .init(latitude: number(0), longitude: number(1)))

        case "stopDemoCompass":
            arNavigation.stop()

        default:
            break
        }
    }
}
