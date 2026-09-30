import { z } from "zod";
import {
  DomainError,
  zones,
  type Snapshot,
  type ZoneSignal,
} from "./domain.ts";

export const presenceLifetimeMs = 5 * 60_000;
const zoneId = z.enum(["entrance", "garden", "gallery", "courtyard"]);
export const cameraRegistry = [
  { id: "entrance-01", zoneId: "entrance", calibrated: true },
  { id: "garden-01", zoneId: "garden", calibrated: true },
  { id: "gallery-01", zoneId: "gallery", calibrated: true },
  { id: "courtyard-01", zoneId: "courtyard", calibrated: false },
] as const;

// One canonical camera per zone avoids summing overlapping camera views.
// More complex deployments need a separately calibrated coverage model.
const cameraSchema = z
  .object({
    kind: z.literal("camera"),
    cameraId: z.enum([
      "entrance-01",
      "garden-01",
      "gallery-01",
      "courtyard-01",
    ]),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    observedAt: z.string().datetime(),
    health: z.enum(["online", "offline"]),
    count: z.number().int().min(0).max(10_000).nullable(),
  })
  .strict()
  .refine(
    (value) => value.health !== "online" || value.count !== null,
    "An online camera needs a count.",
  );
const presenceSchema = z
  .object({
    kind: z.literal("presence"),
    sessionId: z.string().uuid(),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    observedAt: z.string().datetime(),
    consent: z.boolean(),
    zoneId: zoneId.nullable(),
  })
  .strict()
  .refine(
    (value) => (value.consent ? value.zoneId !== null : value.zoneId === null),
    "Consented presence needs a zone; withdrawn presence must omit its zone.",
  );
export const crowdEventSchema = z.discriminatedUnion("kind", [
  cameraSchema,
  presenceSchema,
]);
export type CrowdEvent = z.infer<typeof crowdEventSchema>;
type PresenceEvent = Extract<CrowdEvent, { kind: "presence" }>;
type CameraEvent = Extract<CrowdEvent, { kind: "camera" }>;
export type CrowdInputs = {
  version: 1;
  startedAt: string;
  lastEventAt: string;
  presence: Record<string, PresenceEvent>;
  cameras: Partial<Record<CameraEvent["cameraId"], CameraEvent>>;
};
export function emptyInputs(now = new Date().toISOString()): CrowdInputs {
  return {
    version: 1,
    startedAt: now,
    lastEventAt: now,
    presence: {},
    cameras: {},
  };
}

export function applyCrowdEvent(
  inputs: CrowdInputs,
  event: CrowdEvent,
  now = new Date().toISOString(),
): { inputs: CrowdInputs; duplicate: boolean } {
  const observed = Date.parse(event.observedAt);
  const serverNow = Date.parse(now);
  if (
    observed > serverNow + 30_000 ||
    serverNow - observed > presenceLifetimeMs
  )
    throw new DomainError(
      "Use an observation within the last five minutes, not a future timestamp.",
    );
  const old =
    event.kind === "presence"
      ? inputs.presence[event.sessionId]
      : inputs.cameras[event.cameraId];
  if (old) {
    if (event.sequence === old.sequence) {
      // Canonical JSON property order comes from schema parsing at the API boundary.
      if (JSON.stringify(event) !== JSON.stringify(old))
        throw new DomainError(
          "This sequence already contains a different observation.",
          409,
        );
      return { inputs, duplicate: true };
    }
    if (event.sequence < old.sequence || observed < Date.parse(old.observedAt))
      throw new DomainError(
        "An older observation cannot replace a newer one.",
        409,
      );
  }
  if (
    event.kind === "presence" &&
    !old &&
    Object.keys(inputs.presence).length >= 2000
  )
    throw new DomainError(
      "The local simulator session limit was reached. Start a fresh simulation.",
      409,
    );
  const next: CrowdInputs = {
    ...inputs,
    lastEventAt: now,
    presence: { ...inputs.presence },
    cameras: { ...inputs.cameras },
  };
  if (event.kind === "presence")
    next.presence[event.sessionId] = event.consent
      ? event
      : { ...event, zoneId: null };
  else next.cameras[event.cameraId] = event;
  return { inputs: next, duplicate: false };
}

export function projectSignals(
  inputs: CrowdInputs,
  now = Date.now(),
): ZoneSignal[] {
  return zones.map((zone) => {
    const camera = cameraRegistry.find((c) => c.zoneId === zone.id)!;
    const reading = inputs.cameras[camera.id];
    const activeUsers = Object.values(inputs.presence).filter(
      (p) =>
        p.consent &&
        p.zoneId === zone.id &&
        now - Date.parse(p.observedAt) <= presenceLifetimeMs &&
        Date.parse(p.observedAt) <= now + 30_000,
    ).length;
    return {
      zoneId: zone.id,
      activeUsers,
      // Projection recomputes expiry on every read. No previous user's timestamp
      // is reused as evidence that another expired user is still present.
      usersAt: new Date(now).toISOString(),
      cameraCount: reading?.health === "online" ? reading.count : null,
      cameraAt: reading?.observedAt ?? null,
      cameraHealth: reading?.health ?? "offline",
      coverage: camera.calibrated ? "calibrated" : "partial",
    };
  });
}

// Do not return individual anonymous presence records to the dashboard.
export function publicSnapshot(snapshot: Snapshot, now = Date.now()): Snapshot {
  const { crowdInputs, ...rest } = snapshot;
  if (!crowdInputs) return { ...rest, crowdMode: "sample" };
  return {
    ...rest,
    signals: projectSignals(crowdInputs, now),
    sampledAt: crowdInputs.lastEventAt,
    crowdMode: "simulator",
    crowdSummary: {
      sessions: Object.keys(crowdInputs.presence).length,
      active: Object.values(crowdInputs.presence).filter(
        (p) =>
          p.consent && now - Date.parse(p.observedAt) <= presenceLifetimeMs,
      ).length,
      camerasReporting: Object.keys(crowdInputs.cameras).length,
    },
  };
}
