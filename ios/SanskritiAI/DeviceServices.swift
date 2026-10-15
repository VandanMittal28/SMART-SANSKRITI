import AVFoundation
import Foundation

/// Native text-to-speech for Yatrik, Chat, Audio Guide, Heritage Stories and
/// Hunt narration.
///
/// The bundled UI drives this through a `window.speechSynthesis` shim that the
/// native shell installs, so the web code is unchanged from Android. Utterance
/// ids flow back as start/end/error events.
final class SpeechService: NSObject {
    /// (utteranceId, "start" | "end" | "error")
    var onEvent: ((String, String) -> Void)?

    private let synthesizer = AVSpeechSynthesizer()
    private var identifiers: [AVSpeechUtterance: String] = [:]

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func speak(
        utteranceId: String,
        text: String,
        languageTag: String,
        rate: Double,
        pitch: Double,
        volume: Double
    ) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            onEvent?(utteranceId, "end")
            return
        }

        activatePlaybackSession()

        let utterance = AVSpeechUtterance(string: trimmed)
        utterance.voice = Self.voice(for: languageTag)

        // The Web Speech API treats 1.0 as normal; AVSpeechUtterance uses its
        // own default constant, so scale rather than assign.
        let scaled = Float(rate.isFinite && rate > 0 ? rate : 1) * AVSpeechUtteranceDefaultSpeechRate
        utterance.rate = min(max(scaled, AVSpeechUtteranceMinimumSpeechRate), AVSpeechUtteranceMaximumSpeechRate)
        utterance.pitchMultiplier = Float(min(max(pitch.isFinite && pitch > 0 ? pitch : 1, 0.5), 2.0))
        utterance.volume = Float(min(max(volume.isFinite ? volume : 1, 0), 1))

        identifiers[utterance] = utteranceId
        synthesizer.speak(utterance)
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        identifiers.removeAll()
    }

    /// Picks the closest installed voice, falling back through the language
    /// prefix (hi-IN -> hi) before letting the system choose.
    private static func voice(for languageTag: String) -> AVSpeechSynthesisVoice? {
        let tag = languageTag.isEmpty ? "en-US" : languageTag
        if let exact = AVSpeechSynthesisVoice(language: tag) { return exact }
        if let prefix = tag.split(separator: "-").first,
           let partial = AVSpeechSynthesisVoice(language: String(prefix)) { return partial }
        return AVSpeechSynthesisVoice(language: "en-US")
    }

    private func activatePlaybackSession() {
        let session = AVAudioSession.sharedInstance()
        // Keep narration audible when the ringer switch is silent, which is how
        // visitors usually hold a phone at a monument.
        try? session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? session.setActive(true, options: [])
    }
}

extension SpeechService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        guard let id = identifiers[utterance] else { return }
        onEvent?(id, "start")
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        guard let id = identifiers.removeValue(forKey: utterance) else { return }
        onEvent?(id, "end")
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        guard let id = identifiers.removeValue(forKey: utterance) else { return }
        // A cancel is a deliberate stop, not a failure; the shim treats "end"
        // as "this utterance is over", which is what the UI needs.
        onEvent?(id, "end")
    }
}

/// Records a fixed-length clip for voice questions and hands it back as base64
/// WAV, matching Android's 16 kHz mono PCM-16 output so the same NVIDIA
/// transcription request works on both platforms.
final class MicrophoneService {
    private var recorder: AVAudioRecorder?
    private var fileURL: URL?

    /// (base64 WAV, errorMessage) — exactly one is non-empty.
    func record(durationMs: Int, completion: @escaping (String, String) -> Void) {
        let clamped = min(max(durationMs, 1_000), 8_000)

        requestPermission { [weak self] granted in
            guard let self else { return }
            guard granted else {
                completion("", "Microphone access was denied.")
                return
            }
            self.beginRecording(durationMs: clamped, completion: completion)
        }
    }

    private func requestPermission(_ completion: @escaping (Bool) -> Void) {
        switch AVAudioApplication.shared.recordPermission {
        case .granted:
            completion(true)
        case .denied:
            completion(false)
        case .undetermined:
            AVAudioApplication.requestRecordPermission { granted in
                DispatchQueue.main.async { completion(granted) }
            }
        @unknown default:
            completion(false)
        }
    }

    private func beginRecording(durationMs: Int, completion: @escaping (String, String) -> Void) {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true, options: [])
        } catch {
            completion("", "The microphone could not be prepared: \(error.localizedDescription)")
            return
        }

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("sanskriti-voice-\(UUID().uuidString).wav")
        // Linear PCM into a .wav container gives a file the NVIDIA speech model
        // accepts directly, with no hand-written RIFF header.
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16_000.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false,
        ]

        do {
            let recorder = try AVAudioRecorder(url: url, settings: settings)
            recorder.prepareToRecord()
            guard recorder.record() else {
                completion("", "The microphone could not start recording.")
                return
            }
            self.recorder = recorder
            self.fileURL = url
        } catch {
            completion("", "The microphone could not start: \(error.localizedDescription)")
            return
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(durationMs)) { [weak self] in
            guard let self else { return }
            self.recorder?.stop()
            self.recorder = nil
            try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])

            defer {
                if let fileURL = self.fileURL { try? FileManager.default.removeItem(at: fileURL) }
                self.fileURL = nil
            }
            guard let fileURL = self.fileURL,
                  let data = try? Data(contentsOf: fileURL), !data.isEmpty else {
                completion("", "The recording was empty.")
                return
            }
            completion(data.base64EncodedString(), "")
        }
    }
}
