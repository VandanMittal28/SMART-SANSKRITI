import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCrowdEvent,
  crowdEventSchema,
  emptyInputs,
  projectSignals,
  publicSnapshot,
  type CrowdEvent,
} from "../lib/crowd.ts";
import { crowdState, seed } from "../lib/domain.ts";
const now = "2026-09-30T10:00:00.000Z";
const sessionId = "ce10208f-2092-4b0e-9092-4e15e0400000";
function presence(
  sequence = 1,
  zoneId = "entrance",
  consent = true,
): CrowdEvent {
  return crowdEventSchema.parse({
    kind: "presence",
    sessionId,
    sequence,
    observedAt: now,
    consent,
    zoneId: consent ? zoneId : null,
  });
}
function camera(
  sequence = 1,
  cameraId = "entrance-01",
  count = 178,
): CrowdEvent {
  return crowdEventSchema.parse({
    kind: "camera",
    sequence,
    cameraId,
    observedAt: now,
    health: "online",
    count,
  });
}
test("repeated heartbeat counts a visitor once and moving zones removes the previous presence", () => {
  let inputs = applyCrowdEvent(emptyInputs(now), presence(), now).inputs;
  const duplicate = applyCrowdEvent(inputs, presence(), now);
  assert.equal(duplicate.duplicate, true);
  inputs = applyCrowdEvent(inputs, presence(2), now).inputs;
  assert.equal(projectSignals(inputs, Date.parse(now))[0].activeUsers, 1);
  inputs = applyCrowdEvent(inputs, presence(3, "garden"), now).inputs;
  const projection = projectSignals(inputs, Date.parse(now));
  assert.equal(projection[0].activeUsers, 0);
  assert.equal(projection[1].activeUsers, 1);
});
test("withdrawal removes location and cannot be undone by an old heartbeat", () => {
  let inputs = applyCrowdEvent(emptyInputs(now), presence(), now).inputs;
  inputs = applyCrowdEvent(inputs, presence(2, "entrance", false), now).inputs;
  assert.equal(inputs.presence[sessionId].zoneId, null);
  assert.equal(projectSignals(inputs, Date.parse(now))[0].activeUsers, 0);
  assert.throws(
    () => applyCrowdEvent(inputs, presence(), now),
    /older observation/,
  );
  assert.equal(
    applyCrowdEvent(inputs, presence(2, "entrance", false), now).duplicate,
    true,
  );
});
test("one fresh session does not prolong an expired session in the same zone", () => {
  let inputs = applyCrowdEvent(emptyInputs(now), presence(), now).inputs;
  const later = "2026-09-30T10:04:00.000Z";
  inputs = applyCrowdEvent(
    inputs,
    crowdEventSchema.parse({
      ...presence(),
      sessionId: "ce10208f-2092-4b0e-9092-4e15e0400001",
      observedAt: later,
    }),
    later,
  ).inputs;
  assert.equal(
    projectSignals(inputs, Date.parse(now) + 301_000)[0].activeUsers,
    1,
  );
  assert.equal(
    projectSignals(inputs, Date.parse(now) + 541_000)[0].activeUsers,
    0,
  );
});
test("camera inputs never add app users and stale/uncalibrated readings remain unknown", () => {
  let inputs = applyCrowdEvent(emptyInputs(now), presence(), now).inputs;
  inputs = applyCrowdEvent(inputs, camera(), now).inputs;
  inputs = applyCrowdEvent(inputs, camera(1, "courtyard-01", 80), now).inputs;
  const projected = projectSignals(inputs, Date.parse(now));
  assert.equal(crowdState(projected[0], Date.parse(now)).count, 178);
  assert.equal(projected[0].activeUsers, 1);
  assert.equal(crowdState(projected[3], Date.parse(now)).count, null);
  assert.equal(crowdState(projected[0], Date.parse(now) + 301_000).count, null);
  inputs = applyCrowdEvent(
    inputs,
    crowdEventSchema.parse({ ...camera(2), health: "offline", count: null }),
    now,
  ).inputs;
  assert.equal(projectSignals(inputs, Date.parse(now))[0].cameraCount, null);
});
test("timestamp, ordering, conflicting retries and unregistered input are rejected", () => {
  let inputs = applyCrowdEvent(emptyInputs(now), camera(), now).inputs;
  assert.throws(
    () => applyCrowdEvent(inputs, camera(1, "entrance-01", 199), now),
    /different observation/,
  );
  inputs = applyCrowdEvent(inputs, camera(2), now).inputs;
  assert.throws(
    () => applyCrowdEvent(inputs, camera(), now),
    /older observation/,
  );
  assert.throws(
    () =>
      applyCrowdEvent(
        inputs,
        { ...camera(3), observedAt: "2026-09-30T11:00:00Z" },
        now,
      ),
    /future timestamp/,
  );
  assert.throws(
    () =>
      applyCrowdEvent(
        inputs,
        { ...camera(3), observedAt: "2026-09-30T09:00:00Z" },
        now,
      ),
    /last five minutes/,
  );
  assert.equal(
    crowdEventSchema.safeParse({ ...camera(), cameraId: "unknown-camera" })
      .success,
    false,
  );
  assert.equal(
    crowdEventSchema.safeParse({ ...camera(), count: -1 }).success,
    false,
  );
  assert.equal(
    crowdEventSchema.safeParse({ ...presence(), consent: false }).success,
    false,
  );
  assert.equal(
    crowdEventSchema.safeParse({ ...presence(), latitude: 28.6 }).success,
    false,
  );
});
test("dashboard projection excludes individual sessions and preserves existing incidents", () => {
  const original = seed(now);
  const crowdInputs = applyCrowdEvent(emptyInputs(now), presence(), now).inputs;
  const projected = publicSnapshot(
    { ...original, crowdInputs },
    Date.parse(now),
  );
  assert.equal(projected.crowdMode, "simulator");
  assert.equal(projected.incidents.length, original.incidents.length);
  assert.equal(projected.crowdInputs, undefined);
  assert.equal(JSON.stringify(projected).includes(sessionId), false);
  assert.equal(publicSnapshot(original).crowdMode, "sample");
});
