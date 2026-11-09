import type { Condition, ZoneSnapshot } from "./contracts.ts";
export interface Advisory { zoneId: string; condition: Condition; issuedAt: number; expiresAt: number; en: string; hi: string }
// Draft demo templates. Site approval is required before any operational use.
export function createAdvisory(snapshot: ZoneSnapshot, condition: Condition, clock: number): Advisory | null {
  if (!canPreview(snapshot, condition, clock)) return null;
  const busy = ["Congestion", "Recovering", "Rising"].includes(condition);
  return { zoneId: snapshot.zoneId, condition, issuedAt: clock, expiresAt: clock + 30_000,
    en: busy ? "This simulated zone is busy. Please wait patiently and follow staff instructions." : "Please follow marked queues and staff instructions. Conditions may change.",
    hi: busy ? "इस काल्पनिक क्षेत्र में भीड़ है। कृपया धैर्य रखें और कर्मचारियों के निर्देशों का पालन करें।" : "कृपया चिह्नित कतारों और कर्मचारियों के निर्देशों का पालन करें। परिस्थितियाँ बदल सकती हैं।" };
}
function canPreview(snapshot: ZoneSnapshot, condition: Condition, clock: number) {
  const at = snapshot.observedAt ? Date.parse(snapshot.observedAt) : NaN;
  return snapshot.mode === "demo" && condition !== "Unknown" && snapshot.sourceHealth === "online" && snapshot.calibrated && snapshot.estimatedCount !== null && snapshot.freshness === "fresh" && Number.isFinite(at) && clock >= at && clock - at <= 60_000;
}
export function advisoryVisible(advisory: Advisory, snapshot: ZoneSnapshot, condition: Condition, clock: number) {
  return advisory.condition === condition && advisory.zoneId === snapshot.zoneId && clock >= advisory.issuedAt && clock < advisory.expiresAt && canPreview(snapshot, condition, clock);
}
