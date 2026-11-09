// Server-side adapter. Never import source credentials into a client component.
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Mode, Observation, ZoneId, ZoneSnapshot } from "./contracts.ts";
const schema = z.object({
  eventId: z.string().min(1).max(128), sourceId: z.string().min(1).max(128),
  sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), observedAt: z.string().datetime(),
  health: z.enum(["online", "offline"]), count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
}).strict().refine(e => e.health === "offline" ? e.count === null : e.count !== null);
export interface RegisteredSource { sourceId: string; credential: string; siteId: string; mode: Mode; zoneId: ZoneId; calibrated: boolean; thresholdStatus: ZoneSnapshot["thresholdStatus"] }
export class InputAdapter {
  private events = new Map<string, Observation>();
  private latest = new Map<string, Observation>();
  private registry: RegisteredSource[];
  private scope: { siteId: string; mode: Mode };
  private staleMs: number;
  constructor(registry: RegisteredSource[], scope: { siteId: string; mode: Mode }, staleMs = 60_000) {
    this.scope = { ...scope }; this.staleMs = staleMs;
    if (!Number.isFinite(staleMs) || staleMs <= 0) throw new Error("Invalid freshness interval.");
    const ids = new Set<string>(), zones = new Set<string>();
    for (const source of registry) {
      const key = `${source.siteId}/${source.mode}/${source.zoneId}`;
      if (!source.credential || ids.has(source.sourceId) || zones.has(key)) throw new Error("Register one authoritative source per zone; overlapping counts are not supported.");
      ids.add(source.sourceId); zones.add(key);
    }
    this.registry = registry.map(s => ({ ...s }));
  }
  accept(raw: unknown, credential: string, clock: number): { duplicate: boolean; snapshot: ZoneSnapshot } {
    if (!Number.isFinite(clock)) throw new Error("Invalid clock.");
    const event = schema.parse(raw);
    const source = this.registry.find(s => s.sourceId === event.sourceId);
    const supplied = Buffer.from(credential), expected = Buffer.from(source?.credential ?? "");
    if (!source || supplied.length !== expected.length || !timingSafeEqual(supplied, expected) || source.siteId !== this.scope.siteId || source.mode !== this.scope.mode) throw new Error("Unauthorized source or workspace.");
    const key = `${event.sourceId}/${event.eventId}`;
    const retry = this.events.get(key);
    if (retry) {
      if (JSON.stringify(retry) !== JSON.stringify(event)) throw new Error("Conflicting event retry.");
      return { duplicate: true, snapshot: this.snapshot(source.zoneId, clock) };
    }
    const at = Date.parse(event.observedAt);
    if (at > clock || clock - at > this.staleMs) throw new Error("Observation is stale or in the future.");
    const previous = this.latest.get(source.sourceId);
    if (previous && (event.sequence <= previous.sequence || at < Date.parse(previous.observedAt))) throw new Error("Out-of-order observation.");
    this.events.set(key, event); this.latest.set(source.sourceId, event);
    return { duplicate: false, snapshot: this.snapshot(source.zoneId, clock) };
  }
  snapshot(zoneId: ZoneId, clock: number): ZoneSnapshot {
    const source = this.registry.find(s => s.zoneId === zoneId && s.siteId === this.scope.siteId && s.mode === this.scope.mode);
    const event = source && this.latest.get(source.sourceId);
    const fresh = !!event && clock >= Date.parse(event.observedAt) && clock - Date.parse(event.observedAt) <= this.staleMs;
    return { ...this.scope, zoneId, estimatedCount: fresh && event?.health === "online" && source?.calibrated ? event.count : null,
      observedAt: event?.observedAt ?? null, freshness: !event ? "missing" : fresh ? "fresh" : "stale",
      sourceHealth: event?.health ?? "unavailable", calibrated: source?.calibrated ?? false, thresholdStatus: source?.thresholdStatus ?? "unverified" };
  }
}
