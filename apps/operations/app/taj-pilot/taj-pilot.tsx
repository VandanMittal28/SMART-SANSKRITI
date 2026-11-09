"use client";
import { useEffect, useState } from "react";
import { ZONES, DEMO_RULE, type Alert, type AlertRepository, type StaffAction } from "../../lib/taj-pilot/contracts";
import { DemoRepository, type DemoStorage } from "../../lib/taj-pilot/demo-repository";
import { SCENARIOS } from "../../lib/taj-pilot/scenarios";
import { createAdvisory, advisoryVisible, type Advisory } from "../../lib/taj-pilot/advisory";
import { flowPolicy } from "../../lib/taj-pilot/flow-policy";
import { ManualCount } from "./manual-count";
import { ZoneMap } from "./zone-map";
import styles from "./taj-pilot.module.css";

// Bhoomika can supply her AlertRepository without changing the staff-action view.
export function AlertPanel({ alerts, repository, onChanged }: { alerts: Alert[]; repository: AlertRepository; onChanged: () => Promise<void> }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function act(alert: Alert, type: StaffAction["type"]) {
    setPending(true); setError("");
    try { await repository.applyAction(alert.id, alert.version, { type, note: notes[alert.id] ?? "", assignee: "demo-staff-1" }); await onChanged(); setNotes(n => ({ ...n, [alert.id]: "" })); }
    catch (e) { setError(e instanceof Error ? e.message : "Action failed. No success has been confirmed."); }
    finally { setPending(false); }
  }
  return <section aria-label="Staff cases"><h2>Staff cases</h2><p>All actors are simulated. Recovery changes the crowd condition; staff must close the case.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!alerts.length && <div className={styles.empty}>No cases yet. Keep an elevated count for 30 seconds to trigger one.</div>}
    {alerts.map(alert => <article key={alert.id} className={styles.case}>
      <h3>{ZONES.find(z => z.id === alert.zoneId)?.name}</h3>
      <p><strong>{alert.condition}</strong> · {alert.status} · {alert.assignee ? "Simulated staff 1" : "Unassigned"}</p>
      {alert.status !== "resolved" && <><label htmlFor={`note-${alert.id}`}>Action / resolution note</label><textarea id={`note-${alert.id}`} maxLength={1000} value={notes[alert.id] ?? ""} onChange={e => setNotes(n => ({ ...n, [alert.id]: e.target.value }))} />
        <div className={styles.actions}>
          <button disabled={pending || alert.status !== "open"} onClick={() => act(alert, "assign")}>Assign simulated staff</button>
          <button disabled={pending || alert.status !== "assigned"} onClick={() => act(alert, "acknowledge")}>Acknowledge</button>
          <button disabled={pending || !["acknowledged", "action-recorded"].includes(alert.status)} onClick={() => act(alert, "record-action")}>Record action</button>
          <button disabled={pending || alert.status !== "action-recorded" || !["Normal", "Recovered"].includes(alert.condition)} onClick={() => act(alert, "resolve")}>Resolve with note</button>
        </div></>}
      <details><summary>History ({alert.history.length})</summary><ol>{alert.history.map((entry, i) => <li key={i}><strong>{entry.action}</strong> — {entry.actor}<br /><time>{entry.at}</time>{entry.note && <p>{entry.note}</p>}</li>)}</ol></details>
    </article>)}
  </section>;
}
export function TajPilot({ storage }: { storage?: DemoStorage } = {}) {
  const [workspace, setWorkspace] = useState<DemoRepository | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => DemoRepository.open(storage ?? window.localStorage)).then(async repo => {
      const savedAlerts = await repo.listAlerts();
      if (active) { setWorkspace(repo); setAlerts(savedAlerts); }
    }).catch(e => { if (active) setLoadError(e instanceof Error ? e.message : "Demo storage unavailable."); });
    return () => { active = false; };
  }, [storage]);
  const [mode, setMode] = useState<"demo" | "real">("demo");
  const [revision, setRevision] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  async function refresh() { if (workspace) setAlerts(await workspace.listAlerts()); setRevision(v => v + 1); }
  async function update(fn: () => Promise<void>, reset = false) {
    setBusy(true); setError("");
    try { await fn(); if (reset) { setAdvisory(null); setGeneration(v => v + 1); } await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save demo changes."); }
    finally { setBusy(false); }
  }
  async function recoverStorage() {
    try { const repo = await DemoRepository.resetStored(storage ?? window.localStorage); setWorkspace(repo); setAlerts([]); setLoadError(""); }
    catch { setLoadError("Browser storage is unavailable. Enable storage and retry; the demo cannot save changes."); }
  }
  if (!workspace) return <main className={styles.page}><strong className={styles.badge}>SIMULATION · DEMO</strong><h1>Taj Mahal pilot</h1>{loadError ? <><p role="alert">{loadError}</p><button onClick={recoverStorage}>Reset saved demo only</button></> : <p>Loading saved demo…</p>}</main>;
  const flow = flowPolicy(mode, workspace.states);
  return <main className={styles.page} data-revision={revision}>
    <header className={styles.header}><div><p className={styles.eyebrow}>SANSKRITI / TAJ MAHAL PILOT</p><h1>Crowd operations</h1><p>Three proposed zones · boundaries and capacity limits await site confirmation</p></div><strong className={styles.badge}>{mode === "demo" ? "SIMULATION · DEMO" : "REAL WORLD · NOT CONNECTED"}</strong></header>
    <nav className={styles.actions} aria-label="Workspace mode"><button aria-pressed={mode === "demo"} onClick={() => setMode("demo")}>Demo workspace</button><button aria-pressed={mode === "real"} onClick={() => setMode("real")}>Real-world readiness</button></nav>
    {mode === "demo" ? <>
      <section className={styles.notice}><strong>Repeatable demonstration · {storage ? "saved to MMS database" : "saved in this browser"}</strong><p>All counts and staff identities are simulated. Scenarios use a controlled clock. Reset clears only this demo; no public advisory is sent.</p></section>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <fieldset disabled={busy} className={styles.controls}><legend>Scenario player</legend><div className={styles.actions}>{SCENARIOS.map(name => <button key={name} onClick={() => update(() => workspace.runScenario(name), name === "Reset")}>{name}</button>)}</div><p>Use Normal → Rising queue → Congestion, record staff actions, then Recovery → resolve → Offline → Reset.</p></fieldset>
      <section className={styles.toolbar}><div><strong>Controlled demo clock</strong><p><time>{new Date(workspace.clock).toISOString()}</time></p></div><div className={styles.actions}><button onClick={() => update(() => workspace.advance(10_000))}>Advance 10 seconds</button><button onClick={() => update(() => workspace.advance(61_000))}>Let readings go stale</button><button onClick={() => update(() => workspace.resetDemo(), true)}>Reset demo</button></div></section>
      <p>Illustrative rules: alert at {DEMO_RULE.breach}+ for 30s; recover at {DEMO_RULE.recovery} or below for 20s; readings expire after 60s. These are not approved site limits.</p>
      <section className={styles.case} aria-label="Zone flow controls" aria-live="polite"><h2>Zone flow response · simulation</h2><p><strong>Zone 1 · East Gate entry: {flow.entry}</strong></p><p>{flow.explanation}</p><p><strong>Zone 3 · Mausoleum approach:</strong> {flow.exitSuggested ? "Fast exit suggested — staff should prioritise an orderly departure through a verified exit. Walk; do not run. No route is prescribed." : "No exit suggestion — awaiting an active Zone 2 congestion condition and usable Zone 3 data."}</p><p>No physical gate is controlled and no public instruction is sent.</p></section>
      <ZoneMap mode="demo" snapshots={workspace.snapshots} states={workspace.states} />
      <div className={styles.grid}>{workspace.snapshots.map((snapshot, index) => {
        const state = workspace.states[snapshot.zoneId];
        return <article key={snapshot.zoneId} className={styles.card} data-condition={state.condition}><h2>Zone {index + 1} · {ZONES.find(z => z.id === snapshot.zoneId)?.name}</h2><strong className={styles.count}>{state.condition === "Unknown" ? "—" : snapshot.estimatedCount}</strong><p className={styles.condition}>{state.condition}</p><p>{snapshot.sourceHealth} · {snapshot.freshness}</p><p className={styles.timestamp}>Observed: {snapshot.observedAt}</p><ManualCount key={`${generation}-${snapshot.zoneId}`} zoneNumber={index + 1} disabled={busy} onSave={count => update(() => workspace.setInput(snapshot.zoneId, count))} /><div className={styles.actions}><button onClick={() => update(() => workspace.setInput(snapshot.zoneId, 40))}>Normal input</button><button onClick={() => update(() => workspace.setInput(snapshot.zoneId, 120))}>High input</button><button onClick={() => update(() => workspace.setInput(snapshot.zoneId, null))}>Offline</button></div></article>;
      })}</div>
      <section className={styles.case} aria-label="Visitor advisory preview"><h2>Visitor advisory preview</h2><p>SIMULATION · Draft templates awaiting site approval · Preview only</p><button disabled={workspace.states["east-gate"].condition === "Unknown"} onClick={() => setAdvisory(createAdvisory(workspace.snapshots[0], workspace.states["east-gate"].condition, workspace.clock))}>Generate East Gate preview</button>
        {advisory && advisoryVisible(advisory, workspace.snapshots[0], workspace.states["east-gate"].condition, workspace.clock) ? <div><p lang="en"><strong>English:</strong> {advisory.en}</p><p lang="hi"><strong>हिन्दी:</strong> {advisory.hi}</p><p>Expires at <time>{new Date(advisory.expiresAt).toISOString()}</time> (demo clock)</p></div> : <p role="status">{workspace.states["east-gate"].condition === "Unknown" ? "Crowd advice suppressed: source is Unknown." : advisory ? "Preview expired or conditions changed. Generate a fresh preview." : "No preview generated."}</p>}
      </section>
      <AlertPanel key={generation} alerts={alerts} repository={workspace} onChanged={refresh} />
    </> : <>
      <section className={styles.notice}><h2>Not connected</h2><p>No authorized live source has been connected to this pilot. Live counts and real staff actions are unavailable.</p></section>
      <ZoneMap mode="real" />
      <div className={styles.grid}>{ZONES.map(zone => <article key={zone.id} className={styles.card}><h2>{zone.name}</h2><strong className={styles.count}>—</strong><p>Unknown · source unavailable</p><p>No observation timestamp</p><p>Thresholds unverified</p></article>)}</div>
      <section className={styles.case}><h2>Before live activation</h2><ul><li>Site authorization and registered source credentials</li><li>Verified camera coverage and counting calibration</li><li>Site-approved thresholds</li><li>Verified staff permissions, durable storage, and retention</li><li>Manual-count comparison, silent trial, and operational acceptance</li></ul><button disabled>Real staff actions unavailable</button><p>The input adapter is checked separately with synthetic test-workspace events. A successful test is not a live connection.</p></section>
    </>}
  </main>;
}
