"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useCapabilities } from "@/components/capabilities";
import { IconClose, IconMic, IconSend, IconSpeaker, IconStop } from "@/components/icons";
import { DESKTOP_QUERY, useMedia } from "@/components/use-media";
import { useVisitor } from "@/components/visitor/use-visitor";
import { ApiError, transcribe } from "@/lib/api";
import { MONUMENTS, getMonument, isMonumentId } from "@/lib/content/monuments";
import { MAX_RECORDING_SECONDS, useRecorder } from "./use-recorder";
import { useSpeech } from "./use-speech";
import { YatrikAvatar } from "./yatrik-avatar";
import { useYatrik, type YatrikMessage } from "./yatrik-provider";

const SOURCE_LABEL: Record<NonNullable<YatrikMessage["source"]>, string> = {
  live: "AI answer · check important details",
  notes: "From Sanskriti's saved notes",
  "notes-offline": "Saved notes · Yatrik couldn't be reached",
  system: "",
};

function suggestions(monumentId: string | null, language: "en" | "hi"): string[] {
  const monument = getMonument(monumentId);
  if (monument) {
    return language === "hi"
      ? [`${monument.nameHi} किसने बनवाया?`, `${monument.nameHi} की कहानी क्या है?`, `${monument.nameHi} में क्या ध्यान से देखें?`]
      : [`Who built ${monument.name}?`, `What is the story of ${monument.name}?`, `What should I look for at ${monument.name}?`];
  }
  return language === "hi"
    ? ["ताज महल किसने बनवाया?", "कोणार्क सूर्य मंदिर रथ जैसा क्यों है?", "हवा महल में इतनी खिड़कियाँ क्यों हैं?"]
    : ["Who built the Taj Mahal?", "Why is the Konark temple shaped like a chariot?", "Why does Hawa Mahal have so many windows?"];
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function YatrikPanel() {
  const yatrik = useYatrik();
  const capabilities = useCapabilities();
  const { visitor } = useVisitor();
  const isDesktop = useMedia(DESKTOP_QUERY);
  const speech = useSpeech();
  const id = useId();
  const panelRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const lastSpoken = useRef<string | null>(null);

  const recorder = useRecorder(async (wav) => {
    setTranscribing(true);
    setVoiceError(null);
    try {
      const { text } = await transcribe(wav, yatrik.language);
      if (text.trim()) {
        yatrik.setDraft(text.trim());
        inputRef.current?.focus();
      } else {
        setVoiceError("We didn't catch any words. Try again a little closer to the microphone.");
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "not_configured") {
        capabilities.markLiveUnavailable();
        setVoiceError("Voice questions need the live service, which isn't switched on yet. Please type instead.");
      } else {
        setVoiceError(error instanceof ApiError ? error.message : "That recording couldn't be transcribed.");
      }
    } finally {
      setTranscribing(false);
    }
  });

  const micAvailable = recorder.supported && capabilities.live !== false;
  const pose = recorder.state === "recording" ? "listening" : yatrik.sending || speech.speakingId ? "talking" : "idle";

  // Focus: the heading on phones (so the keyboard doesn't cover the
  // suggestions), the question box on desktop.
  useEffect(() => {
    if (isDesktop) inputRef.current?.focus();
    else titleRef.current?.focus();
  }, [isDesktop]);

  // Phones: lock page scroll while the full-screen panel is open.
  useEffect(() => {
    if (isDesktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDesktop]);

  // Phones: size the panel to the visual viewport so the composer stays above
  // the on-screen keyboard (iOS doesn't resize the layout viewport).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const viewport = window.visualViewport;
    if (isDesktop || !panel || !viewport) return;
    const update = () => {
      panel.style.height = `${viewport.height}px`;
      panel.style.top = `${viewport.offsetTop}px`;
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      panel.style.height = "";
      panel.style.top = "";
    };
  }, [isDesktop]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [yatrik.messages, yatrik.sending]);

  // Read new answers aloud when the visitor has asked for it.
  useEffect(() => {
    const last = yatrik.messages[yatrik.messages.length - 1];
    if (!yatrik.readAloud || !last || last.role !== "assistant" || last.id === lastSpoken.current) return;
    lastSpoken.current = last.id;
    speech.speak(last.id, last.text, last.language);
  }, [yatrik.messages, yatrik.readAloud, speech]);

  useEffect(() => () => speech.stop(), [speech]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      yatrik.close();
      return;
    }
    if (event.key !== "Tab" || isDesktop || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (yatrik.draft.trim()) void yatrik.send(yatrik.draft);
  }

  const name = visitor?.displayName;
  const hindiVoiceMissing = speech.supported && yatrik.readAloud && yatrik.language === "hi" && !speech.hasVoice("hi");

  return (
    <section
      ref={panelRef}
      className="yatrik-panel"
      role="dialog"
      aria-modal={isDesktop ? undefined : true}
      aria-labelledby={`${id}-title`}
      onKeyDown={onKeyDown}
    >
      <header className="yatrik-panel__header">
        <YatrikAvatar pose={pose} size={44} />
        <div className="yatrik-panel__heading">
          <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1}>
            Yatrik
          </h2>
          <p>Heritage guide</p>
        </div>
        <div className="segmented" role="group" aria-label="Answer language">
          <button type="button" aria-pressed={yatrik.language === "en"} onClick={() => yatrik.setLanguage("en")}>
            English
          </button>
          <button type="button" aria-pressed={yatrik.language === "hi"} onClick={() => yatrik.setLanguage("hi")} lang="hi">
            हिन्दी
          </button>
        </div>
        <button type="button" className="icon-btn" onClick={yatrik.close} aria-label="Close Yatrik">
          <IconClose />
        </button>
      </header>

      <div className="yatrik-panel__context">
        <label htmlFor={`${id}-context`}>About</label>
        <select
          id={`${id}-context`}
          className="select"
          value={yatrik.monumentId ?? ""}
          onChange={(event) => yatrik.setMonumentId(isMonumentId(event.target.value) ? event.target.value : null)}
        >
          <option value="">Any monument</option>
          {MONUMENTS.map((monument) => (
            <option key={monument.id} value={monument.id}>
              {monument.name}
            </option>
          ))}
        </select>
        {speech.supported && (
          <button
            type="button"
            className="icon-btn icon-btn--outlined"
            aria-pressed={yatrik.readAloud}
            aria-label="Read answers aloud"
            title="Read answers aloud"
            onClick={() => {
              if (yatrik.readAloud) speech.stop();
              yatrik.setReadAloud(!yatrik.readAloud);
            }}
          >
            <IconSpeaker size={20} />
          </button>
        )}
      </div>

      {capabilities.live === false && (
        <p className="yatrik-panel__status">Live answers and voice questions aren&apos;t switched on yet. Yatrik will reply from Sanskriti&apos;s saved notes.</p>
      )}
      {hindiVoiceMissing && <p className="yatrik-panel__status">This device has no Hindi voice installed, so answers may be read in another voice.</p>}

      <div className="yatrik-panel__log" ref={logRef} aria-live="polite" aria-relevant="additions">
        {yatrik.messages.length === 0 ? (
          <div className="yatrik-empty">
            <YatrikAvatar pose="idle" size={96} />
            <p className="yatrik-empty__greeting">Namaste{name ? `, ${name}` : ""}.</p>
            <p className="yatrik-empty__intro">I&apos;m Yatrik, your heritage guide. Ask me about any monument, in English or Hindi.</p>
            <ul className="yatrik-empty__suggestions" aria-label="Suggested questions">
              {suggestions(yatrik.monumentId, yatrik.language).map((question) => (
                <li key={question}>
                  <button type="button" className="suggestion" lang={yatrik.language} onClick={() => void yatrik.send(question)}>
                    {question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          yatrik.messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="msg msg--user" lang={message.language}>
                {message.text}
              </div>
            ) : (
              <div key={message.id} className={`msg msg--assistant${message.source === "system" ? " msg--system" : ""}`}>
                <p lang={message.language}>{message.text}</p>
                {message.source !== "system" && (
                  <div className="msg__meta">
                    <span>{message.source ? SOURCE_LABEL[message.source] : ""}</span>
                    {speech.supported && (
                      <button
                        type="button"
                        className="msg__listen"
                        onClick={() => (speech.speakingId === message.id ? speech.stop() : speech.speak(message.id, message.text, message.language))}
                      >
                        {speech.speakingId === message.id ? (
                          <>
                            <IconStop size={16} /> Stop
                          </>
                        ) : (
                          <>
                            <IconSpeaker size={16} /> Listen
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ),
          )
        )}
        {yatrik.sending && (
          <div className="msg msg--assistant msg--pending" role="status">
            <span className="spinner" aria-hidden="true" /> Yatrik is thinking…
          </div>
        )}
      </div>

      <form className="yatrik-panel__composer" onSubmit={submit}>
        {(recorder.error || voiceError) && (
          <p className="field__error" role="alert">
            {recorder.error ?? voiceError}
          </p>
        )}
        {recorder.state === "recording" && (
          <p className="yatrik-panel__recording" role="status">
            <span className="rec-dot" aria-hidden="true" /> Listening… {MAX_RECORDING_SECONDS - recorder.seconds}s left. Tap stop when you&apos;re done.
          </p>
        )}
        {(recorder.state === "processing" || transcribing) && (
          <p className="yatrik-panel__recording" role="status">
            <span className="spinner" aria-hidden="true" /> Turning your voice into text…
          </p>
        )}
        <div className="composer-row">
          <label className="visually-hidden" htmlFor={`${id}-question`}>
            Your question
          </label>
          <textarea
            ref={inputRef}
            id={`${id}-question`}
            className="composer-input"
            rows={1}
            maxLength={1000}
            value={yatrik.draft}
            lang={yatrik.language}
            placeholder={yatrik.language === "hi" ? "किसी स्मारक के बारे में पूछें…" : "Ask about a monument…"}
            enterKeyHint="send"
            onChange={(event) => yatrik.setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
          />
          {micAvailable && (
            <button
              type="button"
              className={`icon-btn icon-btn--outlined${recorder.state === "recording" ? " is-recording" : ""}`}
              aria-label={recorder.state === "recording" ? "Stop recording" : "Ask by voice"}
              disabled={recorder.state === "processing" || transcribing || yatrik.sending}
              onClick={() => {
                setVoiceError(null);
                recorder.clearError();
                if (recorder.state === "recording") recorder.stop();
                else void recorder.start();
              }}
            >
              {recorder.state === "recording" ? <IconStop /> : <IconMic />}
            </button>
          )}
          <button type="submit" className="icon-btn icon-btn--send" aria-label="Send question" disabled={!yatrik.draft.trim() || yatrik.sending}>
            <IconSend />
          </button>
        </div>
        {yatrik.messages.length > 0 && (
          <button type="button" className="btn btn--quiet yatrik-panel__clear" onClick={yatrik.clear}>
            Start a new conversation
          </button>
        )}
      </form>
    </section>
  );
}
