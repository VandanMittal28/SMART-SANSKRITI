"use client";

import { useRef, useState, type FormEvent } from "react";
import { Radio, Smartphone } from "lucide-react";
import { cameraRegistry, type CrowdEvent } from "../lib/crowd";
import { zones, type Snapshot } from "../lib/domain";

export function CrowdSimulator({
  onUpdate,
}: {
  onUpdate: (snapshot: Snapshot) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [zone, setZone] = useState("entrance");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Millisecond sequences keep this local operator's observations increasing
  // across a simulator reopen. Real producers must persist their own sequence.
  const sequence = useRef(0);
  const pending = useRef<CrowdEvent | null>(null);
  async function send(event: CrowdEvent) {
    setBusy(true);
    setError("");
    pending.current = event;
    try {
      const response = await fetch("/api/crowd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Observation could not be saved.");
      pending.current = null;
      onUpdate(result.workspace);
      if (event.kind === "presence") {
        setSession(event.sessionId);
        setConsent(event.consent);
      }
      setNotice(
        result.duplicate
          ? "Duplicate observation ignored; counts are unchanged."
          : "Simulated input accepted. Counts use server-side freshness and deduplication.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function nextSequence() {
    sequence.current = Math.max(Date.now(), sequence.current + 1);
    return sequence.current;
  }
  function presence(withdraw = false) {
    void send({
      kind: "presence",
      sessionId: session ?? crypto.randomUUID(),
      sequence: nextSequence(),
      observedAt: new Date().toISOString(),
      consent: !withdraw,
      zoneId: withdraw
        ? null
        : (zone as "entrance" | "garden" | "gallery" | "courtyard"),
    });
  }
  function camera(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const offline = values.get("health") === "offline";
    void send({
      kind: "camera",
      cameraId: values.get("cameraId") as
        "entrance-01" | "garden-01" | "gallery-01" | "courtyard-01",
      sequence: nextSequence(),
      observedAt: new Date().toISOString(),
      health: offline ? "offline" : "online",
      count: offline ? null : Number(values.get("count")),
    });
  }
  return (
    <section className="panel simulator-panel">
      <div className="panel-title">
        <div>
          <h2>Test the input pipeline</h2>
          <p>
            Local simulation only. No phone location or camera stream is
            accessed.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide controls" : "Open simulator"}
        </button>
      </div>
      {expanded && (
        <div className="simulator-body">
          <div className="simulator-explanation">
            The first input starts a fresh simulated sensor session and replaces
            the canned crowd readings. Incident records are preserved. Use
            “Replay sample readings” to return to the example dataset.
          </div>
          <div className="simulator-grid">
            <div>
              <h3>
                <Smartphone size={17} /> Participating app session
              </h3>
              <p>
                Send another heartbeat to move this same anonymous session. It
                is counted in only one zone, and expires after five minutes
                without an update.
              </p>
              <label>
                Session zone
                <select value={zone} onChange={(e) => setZone(e.target.value)}>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    if (!e.target.checked && session) presence(true);
                    else setConsent(e.target.checked);
                  }}
                  disabled={busy}
                />
                Simulate consent for zone presence
              </label>
              <div className="simulator-actions">
                <button
                  className="primary"
                  disabled={!consent || busy}
                  onClick={() => presence()}
                >
                  {session
                    ? "Send heartbeat / move zone"
                    : "Start anonymous session"}
                </button>
                <button
                  className="secondary"
                  disabled={!session || busy}
                  onClick={() => presence(true)}
                >
                  Withdraw presence
                </button>
              </div>
              <small>
                No names, device identifiers or precise coordinates are stored.
              </small>
            </div>
            <form onSubmit={camera}>
              <h3>
                <Radio size={17} /> Camera gateway reading
              </h3>
              <p>
                Each registered source covers one zone. An uncalibrated or
                offline source never produces a trusted occupancy estimate.
              </p>
              <label>
                Registered camera
                <select name="cameraId">
                  {cameraRegistry.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                      {!c.calibrated ? " · uncalibrated" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  People observed
                  <input
                    name="count"
                    type="number"
                    min={0}
                    max={10000}
                    step={1}
                    required
                    defaultValue={178}
                  />
                </label>
                <label>
                  Camera health
                  <select name="health">
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </label>
              </div>
              <button className="primary" disabled={busy}>
                Send camera reading
              </button>
            </form>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button
                disabled={busy}
                onClick={() => pending.current && void send(pending.current)}
              >
                Retry same observation
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
