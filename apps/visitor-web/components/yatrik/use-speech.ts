"use client";

import { useCallback, useEffect, useState } from "react";

const LOCALES = { en: "en-IN", hi: "hi-IN" } as const;

// Reads answers aloud with the browser's own speech engine. Nothing is sent to
// a server. Voice availability depends on the device: many devices have no
// Hindi voice, which the panel reports via hasVoice("hi").
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const hasVoice = useCallback((language: "en" | "hi") => voices.some((voice) => voice.lang.toLowerCase().startsWith(language)), [voices]);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (id: string, text: string, language: "en" | "hi") => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LOCALES[language];
      const voice =
        voices.find((v) => v.lang.toLowerCase() === LOCALES[language].toLowerCase()) ?? voices.find((v) => v.lang.toLowerCase().startsWith(language));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingId((current) => (current === id ? null : current));
      utterance.onerror = () => setSpeakingId((current) => (current === id ? null : current));
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    },
    [voices],
  );

  return { supported, speakingId, speak, stop, hasVoice };
}
