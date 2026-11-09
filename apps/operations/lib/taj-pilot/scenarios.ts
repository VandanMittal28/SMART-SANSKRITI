import type { ZoneId } from "./contracts.ts";
export const SCENARIOS = ["Normal", "Rising queue", "Congestion", "Recovery", "Offline", "Reset"] as const;
export type ScenarioName = typeof SCENARIOS[number];
export interface ScenarioTarget { resetDemo(): void; setInput(zone: ZoneId, count: number | null): void; advance(ms: number): void }
// Fixed observations with an injected clock. Recovery preserves the staff case.
export function runScenario(target: ScenarioTarget, name: ScenarioName) {
  if (name === "Reset") { target.resetDemo(); return; }
  if (name === "Offline") { target.setInput("east-gate", null); return; }
  for (const zone of ["main-gateway", "mausoleum"] as const) target.setInput(zone, 40);
  target.setInput("east-gate", name === "Normal" || name === "Recovery" ? 40 : 120);
  if (name === "Congestion") target.advance(30_000);
  if (name === "Recovery") target.advance(20_000);
}
