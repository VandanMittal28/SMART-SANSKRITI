// What the Explore camera is allowed to look for, and how a model reply is
// validated. COPIED from apk/ui/lib/vision/taxonomy.ts and
// apk/ui/lib/vision/prompt.ts (the originals are not modified), following the
// same copy-don't-import convention as lib/server/nvidia.ts: the two apps are
// separate workspaces and this website must build on its own.
//
// Keep this file in step with the originals. The mobile client sends the
// frame and reads { verdict, confidence, rationale, understood } back, so a
// change to the verdict vocabulary has to land in both places.
//
// Pure: no network, no DOM, no environment.

export type HeritageWatchCategory =
  | "surface_marking"
  | "climbing_on_structure"
  | "restricted_area_entry"
  | "physical_altercation"
  | "fire_or_smoking"
  | "littering";

export interface HeritageWatchDefinition {
  id: HeritageWatchCategory;
  label: string;
  prompt: string;
}

export const HERITAGE_WATCH_DEFINITIONS: HeritageWatchDefinition[] = [
  {
    id: "surface_marking",
    label: "Marking or carving a surface",
    prompt:
      "A person is writing, spraying, scratching or carving onto a wall, pillar, railing or stone surface — hand or implement in sustained contact with the surface while making marks.",
  },
  {
    id: "climbing_on_structure",
    label: "Climbing or standing on protected stonework",
    prompt:
      "A person is climbing on, straddling, standing on or hanging from a monument structure, carving, statue, railing or protective barrier.",
  },
  {
    id: "restricted_area_entry",
    label: "Crossing into a closed area",
    prompt:
      "A person has crossed a rope, barrier, fence or signed boundary into an area that is visibly closed off to visitors.",
  },
  {
    id: "physical_altercation",
    label: "Physical altercation",
    prompt:
      "Two or more people are in a physical fight — striking, shoving, grappling or restraining each other — not an embrace, a greeting, a handshake, helping someone up, play between children, or a crowded queue.",
  },
  {
    id: "fire_or_smoking",
    label: "Open flame or smoking",
    prompt:
      "There is an open flame, burning material, or a person smoking, inside the monument precinct.",
  },
  {
    id: "littering",
    label: "Littering",
    prompt:
      "A person is discarding rubbish onto the ground, into water, or into planting, rather than into a bin.",
  },
];

/** `none` is the expected answer for the overwhelming majority of frames. */
export const NO_FINDING = "none" as const;
export type HeritageWatchVerdict = HeritageWatchCategory | typeof NO_FINDING;

const BY_ID = new Set<string>(HERITAGE_WATCH_DEFINITIONS.map((definition) => definition.id));

export function isHeritageWatchCategory(value: unknown): value is HeritageWatchCategory {
  return typeof value === "string" && BY_ID.has(value);
}

export interface SceneAssessment {
  verdict: HeritageWatchVerdict;
  confidence: number;
  rationale: string;
  /**
   * False when the reply could not be read at all, as opposed to the model
   * deliberately answering "none". Both are safe — neither can raise an
   * incident — but only one means the pipeline is healthy, and collapsing
   * them makes a dead model indistinguishable from a quiet monument.
   */
  understood: boolean;
}

export function buildScenePrompt(): string {
  const categories = HERITAGE_WATCH_DEFINITIONS.map(
    (definition) => `- "${definition.id}": ${definition.prompt}`,
  ).join("\n");

  return `You are reviewing one still frame from a visitor's phone camera inside a heritage monument.

Decide whether the frame shows one of these specific acts in progress:
${categories}

Rules:
- "${NO_FINDING}" is the correct answer for almost every frame. Ordinary visiting — walking, standing, queuing, talking, photographing, pointing, sitting on seating, embracing, holding hands, praying, eating in permitted areas — is "${NO_FINDING}".
- Report only what a person is visibly DOING to the site. Never infer from a person's appearance, clothing, age, gender, religion, who they are with, or how close they stand.
- Do not identify or describe any individual. Do not guess at identity or intent.
- If the frame is blurred, dark, obstructed, too distant, or ambiguous, answer "${NO_FINDING}".
- Your answer sends a staff member to look. It is not proof and imposes no penalty. Do not state that an offence occurred.

You may be given a second, closer image: a crop of the part of the view that is
actually moving. Use it for detail, but judge the scene as a whole.

You may also be given a one-line description of how that region has moved over
the last few seconds, measured on the device. Movement is strong evidence of
which act this is: marking a surface stays in one place, a passer-by moves
steadily across, a struggle reverses direction repeatedly. If the movement
contradicts what the image seems to show, prefer "${NO_FINDING}".

Return only valid JSON, no markdown:
{"verdict":"<one id above or ${NO_FINDING}>","confidence":<0.0-1.0>,"rationale":"<one short neutral sentence describing only the visible action>"}`;
}

/** Parses and hard-validates a model reply. Anything odd degrades to `none`. */
export function parseSceneAssessment(raw: string): SceneAssessment {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return safeNone("The model reply was not JSON.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return safeNone("The model reply could not be parsed.");
  }

  const verdict = parsed.verdict;
  const reportable = isHeritageWatchCategory(verdict);
  if (!reportable && verdict !== NO_FINDING) {
    return safeNone(`The model returned an unknown verdict: ${String(verdict).slice(0, 40)}`);
  }

  const confidence = Number(parsed.confidence);
  // An unparseable confidence must not become a high one.
  if (!Number.isFinite(confidence)) return safeNone("The model gave no usable confidence.");

  const rationale = typeof parsed.rationale === "string" ? parsed.rationale.trim() : "";

  return {
    verdict: reportable ? verdict : NO_FINDING,
    confidence: Math.min(1, Math.max(0, confidence > 1 ? confidence / 100 : confidence)),
    rationale: (rationale || "No description provided.").slice(0, 300),
    understood: true,
  };
}

function safeNone(rationale: string): SceneAssessment {
  return { verdict: NO_FINDING, confidence: 0, rationale, understood: false };
}

export interface SceneRequest {
  imageBase64: string;
  regionBase64: string | null;
  motionContext: string | null;
}

/** Message content shared by this route and apk/ui's own browser route. */
export function buildSceneMessageContent(request: SceneRequest): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = [
    { type: "text", text: buildScenePrompt() },
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${request.imageBase64}` } },
  ];
  if (request.regionBase64) {
    content.push({ type: "text", text: "Closer crop of the moving region:" });
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${request.regionBase64}` } });
  }
  if (request.motionContext) {
    content.push({ type: "text", text: `Measured movement: ${request.motionContext}` });
  }
  return content;
}
