import type { Mode, RuleState } from "./contracts.ts";
export function flowPolicy(mode: Mode, states: Record<string, RuleState>) {
  const gateway = states["main-gateway"];
  const active = mode === "demo" && !!gateway?.active;
  const uncertain = !gateway || gateway.condition === "Unknown";
  const exitKnown = !!states.mausoleum && states.mausoleum.condition !== "Unknown";
  return {
    entry: mode !== "demo" ? "Unavailable" : active ? "Closed (simulation)" : uncertain ? "Unknown — staff review" : "Open (simulation)",
    exitSuggested: active && !uncertain && exitKnown,
    explanation: mode !== "demo" ? "Real gate controls and exit recommendations are unavailable." : active
      ? uncertain ? "Zone 2 data is Unknown. Retain the simulated entry hold; exit advice is suppressed pending staff review."
        : "Zone 2 congestion keeps Zone 1 entry closed until the recovery threshold and duration are met."
      : uncertain ? "Zone 2 has no usable observation. Entry status cannot be inferred."
        : "No active Zone 2 congestion hold. A sustained breach triggers the simulated closure.",
  };
}
