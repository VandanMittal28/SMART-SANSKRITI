"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordingToWavBase64 } from "@/lib/audio";

export const MAX_RECORDING_SECONDS = 12;

type RecorderState = "idle" | "recording" | "processing";

// Records a short voice question with the browser microphone and converts it
// to 16 kHz WAV for /api/transcribe. Nothing is uploaded until the visitor
// stops recording.
export function useRecorder(onRecorded: (wavBase64: string) => void) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const callbackRef = useRef(onRecorded);
  callbackRef.current = onRecorded;

  useEffect(() => {
    setSupported(Boolean(typeof navigator.mediaDevices?.getUserMedia === "function" && "MediaRecorder" in window && "AudioContext" in window && window.isSecureContext));
  }, []);

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access is blocked. Allow it in your browser's site settings to ask by voice."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "The microphone couldn't be started.",
      );
      return;
    }
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      clearTimer();
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      if (chunks.length === 0) {
        setState("idle");
        return;
      }
      setState("processing");
      try {
        const wav = await recordingToWavBase64(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        callbackRef.current(wav);
      } catch {
        setError("That recording couldn't be processed. Please try again.");
      } finally {
        setState("idle");
      }
    };
    recorder.start();
    setSeconds(0);
    setState("recording");
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_RECORDING_SECONDS) recorder.stop();
    }, 250);
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    },
    [],
  );

  return { supported, state, seconds, error, start, stop, clearError: () => setError(null) };
}
