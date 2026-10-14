"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useCapabilities } from "@/components/capabilities";
import { IconAlert, IconArrowRight, IconCamera, IconCheck, IconImage, IconInfo, IconRefresh } from "@/components/icons";
import { AskYatrikButton } from "@/components/monuments/ask-yatrik-button";
import { MonumentPhoto } from "@/components/monuments/monument-photo";
import { Notice } from "@/components/ui/notice";
import { useMedia } from "@/components/use-media";
import { ApiError, recogniseImage, type Recognition } from "@/lib/api";
import { matchRecognisedMonument, suggestMonuments } from "@/lib/content/match";
import type { Monument } from "@/lib/content/monuments";
import { ImageProblem, checkImageFile, formatBytes } from "@/lib/image";
import { CONFIDENCE_THRESHOLD, hashFile, preprocessForRecognition, readCachedResult, writeCachedResult } from "@/lib/recognition-prep";
import { CameraView } from "./camera-view";

type Photo = { file: File; url: string };
type Step =
  | { kind: "choose" }
  | { kind: "camera" }
  | { kind: "preview"; photo: Photo }
  | { kind: "working"; photo: Photo }
  | { kind: "result"; photo: Photo; result: Recognition; cached: boolean }
  | { kind: "error"; photo: Photo | null; title: string; message: string; retry: boolean };

function confidenceLabel(score: number) {
  if (score >= 85) return "High confidence";
  if (score >= CONFIDENCE_THRESHOLD * 100) return "Medium confidence";
  return "Low confidence";
}

function errorFor(error: unknown): { title: string; message: string; retry: boolean } {
  if (error instanceof ImageProblem) return { title: "This photo can't be used", message: error.message, retry: false };
  if (error instanceof ApiError) {
    switch (error.code) {
      case "not_configured":
        return { title: "Recognition isn't switched on yet", message: "The recognition service hasn't been configured for this website, so photos can't be identified at the moment. You can still browse the monument guide.", retry: false };
      case "rate_limited":
        return { title: "Too many attempts", message: "Please wait a minute and try again.", retry: true };
      case "too_large":
        return { title: "Photo too large", message: "Choose a smaller photo and try again.", retry: false };
      case "network":
        return { title: "Couldn't connect", message: error.message, retry: true };
      default:
        return { title: "Recognition didn't work", message: "The recognition service couldn't process this photo. Try again, or use a different photo.", retry: true };
    }
  }
  return { title: "Something went wrong", message: "This browser couldn't prepare the photo. Try a JPEG or PNG photo.", retry: false };
}

export function RecognizeFlow() {
  const capabilities = useCapabilities();
  const finePointer = useMedia("(pointer: fine)");
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [inlineError, setInlineError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const urlRef = useRef<string | null>(null);

  const setPhoto = useCallback((file: File): Photo => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    return { file, url };
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  // Move focus to the step's heading so screen-reader users hear the change.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step.kind]);

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      checkImageFile(file);
      setInlineError(null);
      setStep({ kind: "preview", photo: setPhoto(file) });
    } catch (error) {
      setInlineError(error instanceof ImageProblem ? error.message : "That file couldn't be used.");
    }
  }

  function takePhoto() {
    setInlineError(null);
    if (finePointer && typeof navigator.mediaDevices?.getUserMedia === "function" && window.isSecureContext) setStep({ kind: "camera" });
    else cameraInput.current?.click();
  }

  async function identify(photo: Photo) {
    setStep({ kind: "working", photo });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const hash = await hashFile(photo.file);
      const cached = readCachedResult<Recognition>(hash);
      if (cached) {
        setStep({ kind: "result", photo, result: cached, cached: true });
        return;
      }
      const base64 = await preprocessForRecognition(photo.file);
      const result = await recogniseImage(base64, controller.signal);
      writeCachedResult(hash, result);
      setStep({ kind: "result", photo, result, cached: false });
    } catch (error) {
      if (error instanceof ApiError && error.code === "aborted") {
        setStep({ kind: "preview", photo });
        return;
      }
      if (error instanceof ApiError && error.code === "not_configured") capabilities.markLiveUnavailable();
      setStep({ kind: "error", photo, ...errorFor(error) });
    } finally {
      abortRef.current = null;
    }
  }

  const reset = () => {
    setInlineError(null);
    setStep({ kind: "choose" });
  };
  const unavailable = capabilities.live === false;

  const inputs = (
    <>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={onFile} />
    </>
  );

  if (step.kind === "choose") {
    return (
      <div className="recognize-stack">
        {inputs}
        <header className="page-head">
          <p className="eyebrow">Monument recognition</p>
          <h1 ref={headingRef} tabIndex={-1}>
            Recognise a monument
          </h1>
          <p className="page-head__lede">Take a clear photo of a monument, or choose one you&apos;ve already taken.</p>
        </header>
        {unavailable && (
          <Notice tone="warn" title="Recognition isn't switched on yet">
            The recognition service hasn&apos;t been configured for this website, so photos can&apos;t be identified right now.{" "}
            <Link href="/monuments">Browse the monument guide</Link> instead.
          </Notice>
        )}
        {inlineError && (
          <Notice tone="error" role="alert">
            {inlineError}
          </Notice>
        )}
        <div className="recognize-choices">
          <button type="button" className="btn btn--primary btn--block recognize-choice" onClick={takePhoto}>
            <IconCamera /> Take a photo
          </button>
          <button type="button" className="btn btn--secondary btn--block recognize-choice" onClick={() => galleryInput.current?.click()}>
            <IconImage /> Choose from your photos
          </button>
        </div>
        <section className="recognize-tips" aria-labelledby="tips-title">
          <h2 id="tips-title" className="section-label">
            For the best result
          </h2>
          <ul>
            <li>Fit the whole structure in the frame.</li>
            <li>Use daylight, and avoid shooting straight into the sun.</li>
            <li>One monument per photo; avoid collages and screenshots.</li>
          </ul>
        </section>
        <p className="recognize-privacy">
          <IconInfo size={16} /> Nothing is sent until you tap Identify. The photo is resized on your device and sent to NVIDIA&apos;s recognition service through
          this website. It isn&apos;t stored by Sanskriti.
        </p>
      </div>
    );
  }

  if (step.kind === "camera") {
    return (
      <div className="recognize-stack">
        {inputs}
        <h1 ref={headingRef} tabIndex={-1} className="recognize-title">
          Take a photo
        </h1>
        <CameraView
          onCapture={(file) => setStep({ kind: "preview", photo: setPhoto(file) })}
          onCancel={reset}
          onUseGallery={() => {
            reset();
            galleryInput.current?.click();
          }}
        />
      </div>
    );
  }

  if (step.kind === "preview" || step.kind === "working") {
    const working = step.kind === "working";
    return (
      <div className="recognize-stack">
        {inputs}
        <h1 ref={headingRef} tabIndex={-1} className="recognize-title">
          {working ? "Identifying…" : "Use this photo?"}
        </h1>
        <figure className={`photo-preview${working ? " is-working" : ""}`}>
          <img src={step.photo.url} alt="Your selected photo" />
          {working && (
            <div className="photo-preview__overlay" role="status">
              <span className="spinner" aria-hidden="true" />
              <span>Looking closely. This can take up to a minute.</span>
            </div>
          )}
        </figure>
        <p className="photo-preview__meta">
          {step.photo.file.name} · {formatBytes(step.photo.file.size)}
        </p>
        {!working && unavailable && (
          <Notice tone="warn" title="Recognition isn't switched on yet">
            This photo can&apos;t be identified until the recognition service is configured.
          </Notice>
        )}
        <div className="recognize-actions">
          {working ? (
            <button type="button" className="btn btn--secondary" onClick={() => abortRef.current?.abort()}>
              Cancel
            </button>
          ) : (
            <>
              <button type="button" className="btn btn--primary" onClick={() => void identify(step.photo)} disabled={unavailable}>
                Identify monument <IconArrowRight />
              </button>
              <button type="button" className="btn btn--secondary" onClick={reset}>
                Choose another photo
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (step.kind === "error") {
    return (
      <div className="recognize-stack">
        {inputs}
        <h1 ref={headingRef} tabIndex={-1} className="recognize-title">
          {step.title}
        </h1>
        {step.photo && (
          <figure className="photo-preview photo-preview--small">
            <img src={step.photo.url} alt="Your selected photo" />
          </figure>
        )}
        <Notice tone="error" role="alert">
          {step.message}
        </Notice>
        <div className="recognize-actions">
          {step.retry && step.photo && (
            <button type="button" className="btn btn--primary" onClick={() => void identify(step.photo!)}>
              <IconRefresh /> Try again
            </button>
          )}
          <button type="button" className={step.retry ? "btn btn--secondary" : "btn btn--primary"} onClick={reset}>
            Choose another photo
          </button>
          <Link href="/monuments" className="btn btn--quiet">
            Browse monuments
          </Link>
        </div>
      </div>
    );
  }

  return <ResultView step={step} headingRef={headingRef} onReset={reset} inputs={inputs} />;
}

function ResultView({
  step,
  headingRef,
  onReset,
  inputs,
}: {
  step: Extract<Step, { kind: "result" }>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onReset: () => void;
  inputs: React.ReactNode;
}) {
  const { result, photo, cached } = step;
  const match = result.is_unknown ? undefined : matchRecognisedMonument(result.monument_name, result.monument_id);
  const confident = !result.is_unknown && result.confidence_score >= CONFIDENCE_THRESHOLD * 100;
  const suggestions: Monument[] = result.is_unknown || confident ? [] : [match, ...suggestMonuments(result.monument_name, result.location, 4)].filter((m, i, all): m is Monument => !!m && all.findIndex((x) => x?.id === m.id) === i).slice(0, 3);

  if (result.is_unknown) {
    return (
      <div className="recognize-stack">
        {inputs}
        <p className="result-status result-status--none">
          <IconAlert size={18} /> Not identified
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="recognize-title">
          We couldn&apos;t identify this photo
        </h1>
        <figure className="photo-preview photo-preview--small">
          <img src={photo.url} alt="Your photo" />
        </figure>
        <p className="muted">The recognition service didn&apos;t see one clear monument. A sharper photo of the whole structure in daylight usually helps.</p>
        <div className="recognize-actions">
          <button type="button" className="btn btn--primary" onClick={onReset}>
            Try another photo
          </button>
          <Link href="/monuments" className="btn btn--secondary">
            Browse monuments
          </Link>
        </div>
      </div>
    );
  }

  const score = result.confidence_score;
  return (
    <div className="recognize-stack">
      {inputs}
      <p className={`result-status ${confident ? "result-status--ok" : "result-status--maybe"}`}>
        {confident ? <IconCheck size={18} /> : <IconAlert size={18} />} {confident ? "Identified" : "Possible match"}
      </p>
      <div className="result-head">
        <img className="result-head__photo" src={photo.url} alt="Your photo" />
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="result-head__name">
            {result.monument_name}
          </h1>
          {result.location && <p className="muted">{result.location}</p>}
        </div>
      </div>

      <div className="meter" role="img" aria-label={`${confidenceLabel(score)}: ${score} per cent`}>
        <div className="meter__track">
          <span className={`meter__fill${confident ? "" : " meter__fill--low"}`} style={{ width: `${score}%` }} />
        </div>
        <p className="meter__label">
          {confidenceLabel(score)} · {score}%
        </p>
      </div>

      {!confident && (
        <Notice tone="warn" title="The model isn't sure">
          Compare your photo with the suggestions below before relying on this result.
        </Notice>
      )}

      {(result.era_or_dynasty || result.architecture_style) && (
        <dl className="result-facts">
          {result.era_or_dynasty && (
            <div>
              <dt>Era</dt>
              <dd>{result.era_or_dynasty}</dd>
            </div>
          )}
          {result.architecture_style && (
            <div>
              <dt>Style</dt>
              <dd>{result.architecture_style}</dd>
            </div>
          )}
        </dl>
      )}

      {result.key_identifiers.length > 0 && (
        <section className="result-section">
          <h2 className="section-label">What the model noticed</h2>
          <ul className="result-features">
            {result.key_identifiers.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          {result.reasoning && <p className="result-reasoning">{result.reasoning}</p>}
        </section>
      )}

      {confident && match && (
        <Link href={`/monuments/${match.id}`} className="guide-card">
          <MonumentPhoto monumentId={match.id} alt="" className="guide-card__img" sizes="120px" />
          <span className="guide-card__text">
            <span className="guide-card__eyebrow">In the Sanskriti guide</span>
            <span className="guide-card__name">Read the story of {match.name}</span>
          </span>
          <IconArrowRight className="guide-card__go" />
        </Link>
      )}
      {confident && !match && <p className="muted">{result.monument_name} isn&apos;t in the Sanskriti guide yet, but you can still ask Yatrik about it.</p>}

      {suggestions.length > 0 && (
        <section className="result-section">
          <h2 className="section-label">Could it be one of these?</h2>
          <ul className="monument-list">
            {suggestions.map((m) => (
              <li key={m.id}>
                <Link href={`/monuments/${m.id}`} className="monument-row monument-row--compact">
                  <MonumentPhoto monumentId={m.id} alt="" className="monument-row__img" sizes="72px" />
                  <span className="monument-row__text">
                    <span className="monument-row__name">{m.name}</span>
                    <span className="monument-row__place">{m.place}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="recognize-actions">
        <AskYatrikButton
          monumentId={match?.id ?? null}
          label={`Ask Yatrik about ${match?.name ?? "this monument"}`}
          draft={match ? undefined : `Tell me about ${result.monument_name}`}
          className="btn btn--primary"
        />
        <button type="button" className="btn btn--secondary" onClick={onReset}>
          Identify another photo
        </button>
      </div>
      <p className="recognize-privacy">
        <IconInfo size={16} /> Recognition is automated and can be wrong.{cached ? " This result was saved from earlier in this session." : ""}
      </p>
    </div>
  );
}
