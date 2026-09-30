import { z } from "zod";

export const statuses = [
  "reported",
  "under_review",
  "confirmed",
  "assigned",
  "acknowledged",
  "in_progress",
  "resolved",
  "closed",
  "dismissed",
] as const;
export type Status = (typeof statuses)[number];
export const labels: Record<Status, string> = {
  reported: "Reported",
  under_review: "Under review",
  confirmed: "Confirmed",
  assigned: "Assigned",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
  dismissed: "Dismissed",
};
export const transitions: Record<Status, Status[]> = {
  reported: ["under_review"],
  under_review: ["confirmed", "dismissed"],
  confirmed: ["assigned"],
  assigned: ["acknowledged"],
  acknowledged: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["closed"],
  closed: [],
  dismissed: [],
};
export const staff = [
  {
    id: "meera",
    name: "Meera Sharma",
    role: "Site supervisor",
    initials: "MS",
  },
  {
    id: "arjun",
    name: "Arjun Singh",
    role: "Security officer",
    initials: "AS",
  },
  {
    id: "priya",
    name: "Priya Rao",
    role: "Conservation officer",
    initials: "PR",
  },
  { id: "kabir", name: "Kabir Ali", role: "Field officer", initials: "KA" },
];
export const zones = [
  { id: "entrance", name: "Entrance court", capacity: 200 },
  { id: "garden", name: "Heritage gardens", capacity: 350 },
  { id: "gallery", name: "Stone gallery", capacity: 120 },
  { id: "courtyard", name: "Central courtyard", capacity: 250 },
];
export const site = {
  id: "heritage-demo",
  name: "Heritage Park",
  location: "Demonstration site",
  timezone: "Asia/Kolkata",
};
export type History = {
  at: string;
  actor: string;
  status: Status;
  note: string;
};
export type Incident = {
  id: string;
  siteId: string;
  title: string;
  description: string;
  zoneId: string;
  category:
    "Crowding" | "Damage" | "Access" | "Maintenance" | "Visitor assistance";
  priority: "high" | "medium" | "low";
  source: "Staff report" | "Visitor report" | "Camera alert";
  status: Status;
  assigneeId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  history: History[];
};
export type ZoneSignal = {
  zoneId: string;
  cameraCount: number | null;
  activeUsers: number;
  cameraAt: string | null;
  usersAt: string;
  cameraHealth: "online" | "offline";
  coverage: "calibrated" | "partial";
};
export type Snapshot = {
  schemaVersion: 1;
  incidents: Incident[];
  signals: ZoneSignal[];
  sampledAt: string;
};
export const createSchema = z
  .object({
    requestId: z.string().uuid(),
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(10).max(2000),
    zoneId: z.enum(["entrance", "garden", "gallery", "courtyard"]),
    category: z.enum([
      "Crowding",
      "Damage",
      "Access",
      "Maintenance",
      "Visitor assistance",
    ]),
    priority: z.enum(["high", "medium", "low"]),
  })
  .strict();
export type CreateInput = z.infer<typeof createSchema>;
export const updateSchema = z
  .object({
    version: z.number().int().positive(),
    status: z.enum(statuses),
    assigneeId: z.string().max(40).optional(),
    note: z.string().trim().min(5).max(1200),
  })
  .strict();
export class DomainError extends Error {
  code: number;
  constructor(message: string, code = 400) {
    super(message);
    this.code = code;
  }
}
export function createIncident(
  input: CreateInput,
  now = new Date().toISOString(),
): Incident {
  return {
    id: input.requestId,
    siteId: site.id,
    title: input.title,
    description: input.description,
    zoneId: input.zoneId,
    category: input.category,
    priority: input.priority,
    source: "Staff report",
    status: "reported",
    assigneeId: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        at: now,
        actor: "Local operator",
        status: "reported",
        note: "Staff report created.",
      },
    ],
  };
}
export function transitionIncident(
  incident: Incident,
  input: z.infer<typeof updateSchema>,
  now = new Date().toISOString(),
): Incident {
  if (incident.version !== input.version)
    throw new DomainError(
      "This incident changed. Refresh and review the latest record.",
      409,
    );
  if (!transitions[incident.status].includes(input.status))
    throw new DomainError("This status change is not allowed.");
  let assigneeId = incident.assigneeId;
  if (input.status === "assigned") {
    if (!staff.some((person) => person.id === input.assigneeId))
      throw new DomainError("Select a valid staff member before assigning.");
    assigneeId = input.assigneeId!;
  }
  if (
    ["acknowledged", "in_progress", "resolved", "closed"].includes(
      input.status,
    ) &&
    !assigneeId
  )
    throw new DomainError("This case needs an owner.");
  const note =
    input.status === "assigned"
      ? `${input.note} Assigned to ${staff.find((s) => s.id === assigneeId)!.name}.`
      : input.note;
  return {
    ...incident,
    assigneeId,
    status: input.status,
    version: incident.version + 1,
    updatedAt: now,
    history: [
      ...incident.history,
      { at: now, actor: "Local operator", status: input.status, note },
    ],
  };
}
export function isOpen(i: Incident) {
  return !["resolved", "closed", "dismissed"].includes(i.status);
}
export function crowdState(signal: ZoneSignal, now: number = Date.now()) {
  const stale = (date: string | null) =>
    !date ||
    !Number.isFinite(Date.parse(date)) ||
    now - Date.parse(date) > 5 * 60_000 ||
    Date.parse(date) > now + 60_000;
  const cameraUsable =
    signal.cameraHealth === "online" &&
    signal.coverage === "calibrated" &&
    signal.cameraCount !== null &&
    Number.isFinite(signal.cameraCount) &&
    signal.cameraCount >= 0 &&
    !stale(signal.cameraAt);
  const count = cameraUsable ? signal.cameraCount : null;
  const capacity = zones.find((z) => z.id === signal.zoneId)?.capacity ?? 1;
  return {
    count,
    activeUsers: stale(signal.usersAt) ? null : signal.activeUsers,
    level:
      count === null
        ? "Unknown"
        : count / capacity >= 0.85
          ? "High"
          : count / capacity >= 0.6
            ? "Moderate"
            : "Low",
    confidence: cameraUsable
      ? "Camera estimate"
      : "Insufficient fresh coverage",
  };
}
export function seed(now = new Date().toISOString()): Snapshot {
  const ago = (minutes: number) =>
    new Date(Date.parse(now) - minutes * 60_000).toISOString();
  const incident = (
    id: string,
    title: string,
    description: string,
    zoneId: CreateInput["zoneId"],
    category: CreateInput["category"],
    priority: CreateInput["priority"],
    minutes: number,
    source: Incident["source"],
  ): Incident => ({
    ...createIncident(
      { requestId: id, title, description, zoneId, category, priority },
      ago(minutes),
    ),
    source,
  });
  const damage = incident(
    "sample-102",
    "Surface damage near the east wall",
    "A visitor reported a loose section of stone near the gallery entrance. Please inspect the area before confirming.",
    "gallery",
    "Damage",
    "medium",
    36,
    "Visitor report",
  );
  let access = incident(
    "sample-103",
    "Restricted passage needs inspection",
    "The garden service gate appears to have been left open. Verify access and secure it if necessary.",
    "garden",
    "Access",
    "medium",
    52,
    "Staff report",
  );
  for (const status of [
    "under_review",
    "confirmed",
    "assigned",
    "acknowledged",
    "in_progress",
  ] as Status[])
    access = transitionIncident(
      access,
      {
        version: access.version,
        status,
        assigneeId: "arjun",
        note: "Sample workflow: field inspection arranged.",
      },
      ago(40),
    );
  return {
    schemaVersion: 1,
    sampledAt: now,
    incidents: [
      incident(
        "sample-101",
        "Crowding at the entrance court",
        "Sample camera alert: visitors are gathering near the entrance. A supervisor should verify before assigning a response.",
        "entrance",
        "Crowding",
        "high",
        8,
        "Camera alert",
      ),
      {
        ...damage,
        status: "under_review",
        history: [
          ...damage.history,
          {
            at: ago(30),
            status: "under_review",
            actor: "Local operator",
            note: "Sample workflow: evidence needs a site inspection.",
          },
        ],
      },
      access,
      incident(
        "sample-104",
        "Wayfinding sign requires repair",
        "The directional sign near the central courtyard is loose. Inspect and arrange a safe repair.",
        "courtyard",
        "Maintenance",
        "low",
        16,
        "Staff report",
      ),
    ],
    signals: [
      {
        zoneId: "entrance",
        cameraCount: 178,
        activeUsers: 41,
        cameraAt: now,
        usersAt: now,
        cameraHealth: "online",
        coverage: "calibrated",
      },
      {
        zoneId: "garden",
        cameraCount: 126,
        activeUsers: 32,
        cameraAt: now,
        usersAt: now,
        cameraHealth: "online",
        coverage: "calibrated",
      },
      {
        zoneId: "gallery",
        cameraCount: 83,
        activeUsers: 19,
        cameraAt: now,
        usersAt: now,
        cameraHealth: "online",
        coverage: "calibrated",
      },
      {
        zoneId: "courtyard",
        cameraCount: null,
        activeUsers: 24,
        cameraAt: null,
        usersAt: now,
        cameraHealth: "offline",
        coverage: "partial",
      },
    ],
  };
}
