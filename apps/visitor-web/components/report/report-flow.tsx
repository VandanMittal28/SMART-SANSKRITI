"use client";

// Adapted from apk/ui/app/report/page.tsx (not modified): same categories,
// zones, optional photo and location, device-saved draft, private 64-hex
// receipt token and 5-second status refresh. Differences: submissions go
// through this website's server (/api/reports) because operations only
// accepts the Android app's origin from browsers; photos are re-encoded as
// JPEG on the device, which also strips EXIF location data; success is shown
// only when operations confirms the report.

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useCapabilities } from "@/components/capabilities";
import { IconCamera, IconCheck, IconPin, IconRefresh, IconTrash } from "@/components/icons";
import { Notice } from "@/components/ui/notice";
import { ApiError, getReportStatus, submitReport } from "@/lib/api";
import { ImageProblem, prepareImage } from "@/lib/image";
import {
  CATEGORY_HINTS,
  DRAFT_KEY,
  EMPTY_DRAFT,
  NOTE_MAX_LENGTH,
  PHOTO_MAX_BYTES,
  RECEIPT_KEY,
  REPORT_CATEGORIES,
  REPORT_ZONES,
  STATUS_TEXT,
  isDraft,
  isReceipt,
  isReportStatus,
  newReceiptToken,
  newReportId,
  readJson,
  writeJson,
  type Receipt,
  type ReportDraft,
  type ReportStatus,
} from "@/lib/report";

export function ReportFlow() {
  const capabilities = useCapabilities();
  const id = useId();
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ category?: string; zone?: string; form?: string; photo?: string; location?: string }>({});
  const [locating, setLocating] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [draftSaved, setDraftSaved] = useState(true);
  const photoInput = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(readJson(DRAFT_KEY, isDraft) ?? EMPTY_DRAFT);
    setReceipt(readJson(RECEIPT_KEY, isReceipt));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded && !receipt) setDraftSaved(writeJson(DRAFT_KEY, draft));
  }, [draft, loaded, receipt]);

  const change = (update: Partial<ReportDraft>) => setDraft((previous) => ({ ...previous, ...update }));

  function locate() {
    if (!("geolocation" in navigator)) {
      setErrors((e) => ({ ...e, location: "Location isn't available in this browser. Choosing the area is enough." }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        change({ point: { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: Math.round(position.coords.accuracy) } });
        setErrors((e) => ({ ...e, location: undefined }));
        setLocating(false);
      },
      (error) => {
        setErrors((e) => ({
          ...e,
          location: error.code === error.PERMISSION_DENIED ? "Location access was declined. Choosing the area is enough." : "Your location couldn't be found. Choosing the area is enough.",
        }));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const prepared = await prepareImage(file, 1600, PHOTO_MAX_BYTES);
      change({ photo: prepared.dataUrl });
      setErrors((e) => ({ ...e, photo: undefined }));
    } catch (error) {
      setErrors((e) => ({ ...e, photo: error instanceof ImageProblem ? error.message : "That photo couldn't be added." }));
    } finally {
      setPhotoBusy(false);
    }
  }

  // Public Vercel deployment: reporting is switched off by the server.
  const publicSite = capabilities.reportsMode === "unavailable";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (publicSite) return;
    const next: typeof errors = {};
    if (!draft.category) next.category = "Choose what kind of issue it is.";
    if (!draft.zoneId) next.zone = "Choose the area where it is.";
    setErrors(next);
    if (next.category || next.zone || !draft.category || !draft.zoneId) {
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }
    setSubmitting(true);
    const token = newReceiptToken();
    const reportId = newReportId();
    try {
      const response = await submitReport({ id: reportId, token, category: draft.category, zoneId: draft.zoneId, note: draft.note.trim(), point: draft.point, photo: draft.photo });
      const saved: Receipt = { id: response.id, token, category: draft.category, createdAt: new Date().toISOString() };
      writeJson(RECEIPT_KEY, saved);
      writeJson(DRAFT_KEY, null);
      setDraft(EMPTY_DRAFT);
      setReceipt(saved);
      window.scrollTo({ top: 0 });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.code === "reporting_unavailable"
            ? error.message
            : error.code === "ops_unavailable"
            ? "The local operations demo isn't running, so the report wasn't sent."
            : error.code === "local_only"
              ? error.message
              : error.code === "network"
                ? "You seem to be offline, so the report wasn't sent."
                : error.message
          : "The report wasn't sent.";
      if (error instanceof ApiError && error.code === "reporting_unavailable") {
        capabilities.markReportingUnavailable();
        setErrors({});
        return;
      }
      setErrors({ form: `${message} Your draft is saved on this device; try again when it's available.` });
      if (error instanceof ApiError && (error.code === "ops_unavailable" || error.code === "local_only")) capabilities.refresh();
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return <div className="report-loading" aria-hidden="true" />;

  if (receipt) {
    return (
      <ReceiptView
        receipt={receipt}
        onNew={() => {
          writeJson(RECEIPT_KEY, null);
          setReceipt(null);
        }}
      />
    );
  }

  const errorList = [errors.category, errors.zone, errors.form].filter(Boolean);

  return (
    <form className="report" onSubmit={submit} noValidate>
      <header className="page-head">
        <p className="eyebrow">Help the site team</p>
        <h1>Report an issue</h1>
        <p className="page-head__lede">You don&apos;t need to give your name. If someone needs help urgently, find a member of staff straight away.</p>
      </header>

      {publicSite ? (
        <Notice tone="warn" title="Reporting isn't available on the public website yet." role="status">
          Visitor reports only work with the Sanskriti operations demo running locally, so sending is switched off here. If something needs attention now,
          please tell a member of staff at the site.
        </Notice>
      ) : (
        <div className="demo-banner">
          <span className="tag tag--demo">Local demo</span>
          <p>
            Reports go to the Sanskriti operations demo on this computer, for a sample site called <strong>Heritage Park</strong>. They don&apos;t reach staff at a
            real monument.
          </p>
        </div>
      )}

      {!publicSite && capabilities.reportsReachable === false && (
        <Notice tone="warn" title="The operations demo isn't running">
          Reports can&apos;t be sent right now. You can still fill in the form; it&apos;s saved on this device until you send it.
        </Notice>
      )}

      {errorList.length > 0 && (
        <div ref={errorRef} tabIndex={-1} className="report__errors">
          <Notice tone="error" title={errors.form ? "The report wasn't sent" : "Please check the form"} role="alert">
            <ul>
              {errorList.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}

      <fieldset className="report__group" disabled={publicSite} aria-describedby={errors.category ? `${id}-cat-err` : undefined}>
        <legend className="report__legend">
          <span className="report__step">1</span> What&apos;s the issue?
        </legend>
        {errors.category && (
          <p id={`${id}-cat-err`} className="field__error">
            {errors.category}
          </p>
        )}
        <div className="choices">
          {REPORT_CATEGORIES.map((category) => (
            <label key={category} className="choice">
              <input type="radio" name="category" value={category} checked={draft.category === category} onChange={() => change({ category })} />
              <span className="choice__text">
                <span className="choice__title">{category}</span>
                <span className="choice__hint">{CATEGORY_HINTS[category]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="report__group" disabled={publicSite} aria-describedby={errors.zone ? `${id}-zone-err` : undefined}>
        <legend className="report__legend">
          <span className="report__step">2</span> Where is it?
        </legend>
        {errors.zone && (
          <p id={`${id}-zone-err`} className="field__error">
            {errors.zone}
          </p>
        )}
        <div className="choices choices--grid">
          {REPORT_ZONES.map((zone) => (
            <label key={zone.id} className="choice">
              <input type="radio" name="zone" value={zone.id} checked={draft.zoneId === zone.id} onChange={() => change({ zoneId: zone.id })} />
              <span className="choice__text">
                <span className="choice__title">{zone.name}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="report__location">
          {draft.point ? (
            <p className="report__located">
              <IconPin size={18} /> Location added (within about {draft.point.accuracy ?? "?"} m).{" "}
              <button type="button" className="btn btn--quiet" onClick={() => change({ point: null })}>
                Remove
              </button>
            </p>
          ) : (
            <button type="button" className="btn btn--secondary" onClick={locate} disabled={locating}>
              {locating ? <span className="spinner" aria-hidden="true" /> : <IconPin size={18} />}
              {locating ? "Finding your location…" : "Add my exact location (optional)"}
            </button>
          )}
          {errors.location && <p className="field__hint">{errors.location}</p>}
        </div>
      </fieldset>

      <fieldset className="report__group" disabled={publicSite}>
        <legend className="report__legend">
          <span className="report__step">3</span> Details <span className="report__optional">optional</span>
        </legend>
        <div className="field">
          <label className="visually-hidden" htmlFor={`${id}-note`}>
            Describe what staff should look for
          </label>
          <textarea
            id={`${id}-note`}
            className="textarea"
            maxLength={NOTE_MAX_LENGTH}
            placeholder="Describe what staff should look for"
            value={draft.note}
            onChange={(event) => change({ note: event.target.value })}
          />
          <p className="field__counter" aria-live="polite">
            {draft.note.length} / {NOTE_MAX_LENGTH}
          </p>
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            void addPhoto(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {draft.photo ? (
          <div className="report__photo">
            <img src={draft.photo} alt="Photo attached to the report" />
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => change({ photo: null })}>
              <IconTrash size={18} /> Remove photo
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--secondary" onClick={() => photoInput.current?.click()} disabled={photoBusy}>
            {photoBusy ? <span className="spinner" aria-hidden="true" /> : <IconCamera size={18} />}
            {photoBusy ? "Preparing photo…" : "Add a photo"}
          </button>
        )}
        {errors.photo && <p className="field__error">{errors.photo}</p>}
      </fieldset>

      <div className="report__submit">
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting || publicSite}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" /> Sending…
            </>
          ) : (
            "Send report"
          )}
        </button>
        <p className="field__hint">
          {publicSite
            ? "Sending reports is switched off on the public website."
            : `Only what you add here is sent. Your name isn't attached.${draftSaved ? " Your draft is kept on this device until you send it." : ""}`}
        </p>
      </div>
    </form>
  );
}

function ReceiptView({ receipt, onNew }: { receipt: Receipt; onNew: () => void }) {
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await getReportStatus(receipt.id, receipt.token);
      if (isReportStatus(result.status)) setStatus(result.status);
      setCheckedAt(new Date());
      setProblem(null);
    } catch (error) {
      setProblem(
        error instanceof ApiError && error.code === "invalid"
          ? "The operations demo no longer has this report. Its local data may have been reset."
          : "The status can't be checked right now. The operations demo may not be running.",
      );
    }
  }, [receipt]);

  useEffect(() => {
    headingRef.current?.focus();
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const text = status ? STATUS_TEXT[status] : null;
  return (
    <div className="report receipt">
      <div className="receipt__badge" aria-hidden="true">
        <IconCheck size={28} />
      </div>
      <h1 ref={headingRef} tabIndex={-1}>
        Report received
      </h1>
      <p className="page-head__lede">The operations demo confirmed your report about “{receipt.category}”.</p>

      <dl className="receipt__card">
        <div>
          <dt>Status</dt>
          <dd aria-live="polite">
            {text ? (
              <>
                <strong>{text.label}</strong>
                <span>{text.detail}</span>
              </>
            ) : (
              <span>Checking…</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Receipt</dt>
          <dd>
            <code>{receipt.id.slice(0, 8).toUpperCase()}</code>
          </dd>
        </div>
      </dl>
      {problem ? (
        <Notice tone="warn" role="status">
          {problem}
        </Notice>
      ) : (
        <p className="field__hint">
          Updates every 5 seconds while this page is open{checkedAt ? ` · last checked ${checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}.
        </p>
      )}
      <div className="recognize-actions">
        <button type="button" className="btn btn--secondary" onClick={() => void refresh()}>
          <IconRefresh size={18} /> Check now
        </button>
        <button type="button" className="btn btn--primary" onClick={onNew}>
          Report another issue
        </button>
        <Link href="/home" className="btn btn--quiet">
          Back to home
        </Link>
      </div>
      <p className="field__hint">This receipt is saved on this device only. It&apos;s a local demo, so staff at a real monument won&apos;t see it.</p>
    </div>
  );
}
