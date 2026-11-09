// Deterministic demo state engine. Persistence is handled by DemoRepository.
import { ZONES, DEMO_RULE, emptyRule, type Alert, type AlertRepository, type StaffAction, type RuleState, type ZoneSnapshot, type ZoneId } from "./contracts.ts";
import { evaluate } from "./crowd-core.ts";
export const INITIAL_CLOCK = Date.parse("2026-11-09T09:00:00Z");
export class DemoEngine implements AlertRepository {
  clock = INITIAL_CLOCK;
  private alerts: Alert[] = [];
  private serial = 0;
  snapshots: ZoneSnapshot[] = [];
  states: Record<string, RuleState> = {};
  constructor() { this.resetDemo(); }
  resetDemo() {
    this.clock = INITIAL_CLOCK; this.alerts = []; this.serial = 0;
    this.states = Object.fromEntries(ZONES.map(z => [z.id, emptyRule()]));
    this.snapshots = ZONES.map(z => ({ siteId: "taj-mahal", mode: "demo", zoneId: z.id, estimatedCount: 40,
      observedAt: new Date(this.clock).toISOString(), freshness: "fresh", sourceHealth: "online", calibrated: true, thresholdStatus: "demo" }));
    this.refresh();
  }
  setInput(zoneId: ZoneId, count: number | null) {
    this.snapshots = this.snapshots.map(s => s.zoneId === zoneId ? { ...s, estimatedCount: count, observedAt: new Date(this.clock).toISOString(), freshness: "fresh", sourceHealth: count === null ? "offline" : "online" } : s);
    this.refresh();
  }
  advance(ms: number) { if (!Number.isFinite(ms) || ms <= 0) throw new Error("Advance by a positive duration."); this.clock += ms; this.refresh(); }
  private refresh() {
    this.snapshots = this.snapshots.map(s => ({ ...s, freshness: this.clock - Date.parse(s.observedAt!) > DEMO_RULE.staleMs ? "stale" : "fresh" }));
    for (const snapshot of this.snapshots) {
      const next = evaluate(snapshot, DEMO_RULE, this.clock, this.states[snapshot.zoneId]);
      this.states[snapshot.zoneId] = next;
      const existing = this.alerts.find(a => a.zoneId === snapshot.zoneId && a.status !== "resolved");
      if (existing && existing.condition !== next.condition) { existing.condition = next.condition; existing.version++; }
      if (next.active && next.condition === "Congestion" && !existing) this.alerts.push({
        id: `demo-${++this.serial}`, zoneId: snapshot.zoneId, severity: "warning", condition: next.condition,
        status: "open", assignee: null, version: 1,
        history: [{ actor: "Simulated rule evaluator", at: new Date(this.clock).toISOString(), action: "created", note: "Sustained demo threshold breach" }],
      });
    }
  }
  async listAlerts() { return structuredClone(this.alerts); }
  async applyAction(id: string, version: number, action: StaffAction) {
    const alert = this.alerts.find(a => a.id === id);
    if (!alert || alert.version !== version) throw new Error("The alert changed. Reload and try again.");
    const note = action.note.trim();
    if (note.length > 1000) throw new Error("Keep notes under 1,000 characters.");
    let actor = "Simulated manager";
    switch (action.type) {
      case "assign":
        if (alert.status !== "open" || action.assignee !== "demo-staff-1") throw new Error("Select the simulated staff member for an open alert.");
        alert.assignee = action.assignee; alert.status = "assigned"; break;
      case "acknowledge":
        if (alert.status !== "assigned") throw new Error("Assign the alert first.");
        actor = "Simulated staff 1"; alert.status = "acknowledged"; break;
      case "record-action":
        if (!["acknowledged", "action-recorded"].includes(alert.status) || !note) throw new Error("Acknowledge first and supply an action note.");
        actor = "Simulated staff 1"; alert.status = "action-recorded"; break;
      case "resolve":
        if (alert.status !== "action-recorded" || !note || this.states[alert.zoneId].active || !["Recovered", "Normal"].includes(this.states[alert.zoneId].condition)) throw new Error("Record an action and verify recovery before resolving with a note.");
        alert.status = "resolved"; break;
      default: throw new Error("Unsupported action.");
    }
    alert.version++;
    alert.history.push({ actor, at: new Date(this.clock).toISOString(), action: action.type, note });
    return structuredClone(alert);
  }
}
