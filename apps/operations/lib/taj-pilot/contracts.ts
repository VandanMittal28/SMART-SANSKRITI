export const CONTRACT_VERSION = "taj-pilot-v1";
export type Mode = "demo" | "test" | "real";
export const ZONES = [
  { id: "east-gate", name: "East Gate queue" },
  { id: "main-gateway", name: "Main gateway circulation" },
  { id: "mausoleum", name: "Mausoleum approach" },
] as const;
export type ZoneId = typeof ZONES[number]["id"];
export interface Observation {
  eventId: string; sourceId: string; sequence: number; observedAt: string;
  health: "online" | "offline"; count: number | null;
}
export interface ZoneSnapshot {
  siteId: string; mode: Mode; zoneId: ZoneId; estimatedCount: number | null;
  observedAt: string | null; freshness: "fresh" | "stale" | "missing";
  sourceHealth: "online" | "offline" | "unavailable"; calibrated: boolean;
  thresholdStatus: "demo" | "verified" | "unverified";
}
export interface RuleConfig { breach: number; recovery: number; breachMs: number; recoveryMs: number; staleMs: number }
export const DEMO_RULE: RuleConfig = { breach: 100, recovery: 70, breachMs: 30_000, recoveryMs: 20_000, staleMs: 60_000 };
export type Condition = "Unknown" | "Normal" | "Rising" | "Congestion" | "Recovering" | "Recovered";
export interface RuleState {
  condition: Condition; active: boolean; breachSince: number | null; recoverySince: number | null; lastClock: number | null;
}
export const emptyRule = (): RuleState => ({ condition: "Unknown", active: false, breachSince: null, recoverySince: null, lastClock: null });
export interface Alert {
  id: string; zoneId: ZoneId; severity: "warning"; condition: Condition;
  status: "open" | "assigned" | "acknowledged" | "action-recorded" | "resolved";
  assignee: string | null; version: number;
  history: { actor: string; at: string; action: string; note: string }[];
}
export type StaffAction = { type: "assign" | "acknowledge" | "record-action" | "resolve"; note: string; assignee?: string };
export interface AlertRepository {
  listAlerts(): Promise<Alert[]>;
  applyAction(id: string, version: number, action: StaffAction): Promise<Alert>;
}
