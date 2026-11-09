import { emptyRule, type RuleState, type RuleConfig, type ZoneSnapshot } from "./contracts.ts";

export function evaluate(snapshot: ZoneSnapshot, config: RuleConfig, clock: number, previous: RuleState = emptyRule()): RuleState {
  if (!Number.isFinite(clock) || (previous.lastClock !== null && clock < previous.lastClock)) throw new Error("Clock must be finite and monotonic; reset rule state when resetting the demo.");
  if (![config.breach, config.recovery, config.breachMs, config.recoveryMs, config.staleMs].every(Number.isFinite) || config.recovery < 0 || config.breach <= config.recovery || config.breachMs <= 0 || config.recoveryMs <= 0 || config.staleMs <= 0) throw new Error("Invalid rule configuration.");
  const state = { ...previous, lastClock: clock };
  if (previous.lastClock !== null && clock - previous.lastClock > config.staleMs) { state.breachSince = null; state.recoverySince = null; }
  const at = snapshot.observedAt === null ? NaN : Date.parse(snapshot.observedAt);
  const count = snapshot.estimatedCount;
  const usable = snapshot.freshness === "fresh" && snapshot.sourceHealth === "online" && snapshot.calibrated &&
    (snapshot.mode === "real" ? snapshot.thresholdStatus === "verified" : snapshot.thresholdStatus !== "unverified") &&
    Number.isFinite(at) && clock >= at && clock - at <= config.staleMs && count !== null && Number.isSafeInteger(count) && count >= 0;
  if (!usable) return { ...state, condition: "Unknown", breachSince: null, recoverySince: null };
  if (!state.active) {
    state.recoverySince = null;
    if (count! >= config.breach) {
      state.breachSince ??= clock;
      state.active = clock - state.breachSince >= config.breachMs;
      state.condition = state.active ? "Congestion" : "Rising";
    } else { state.breachSince = null; state.condition = "Normal"; }
  } else if (count! <= config.recovery) {
    state.recoverySince ??= clock;
    if (clock - state.recoverySince >= config.recoveryMs) {
      state.active = false; state.condition = "Recovered"; state.breachSince = null; state.recoverySince = null;
    } else state.condition = "Recovering";
  } else { state.recoverySince = null; state.condition = "Congestion"; }
  return state;
}
