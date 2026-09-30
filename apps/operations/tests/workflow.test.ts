import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createIncident,
  createSchema,
  transitionIncident,
  seed,
  crowdState,
  updateSchema,
  type Status,
} from "../lib/domain.ts";
import { makeStore } from "../lib/store.ts";
import { assertLocal } from "../lib/request.ts";

const input = {
  requestId: "fb9f1c4b-609c-4f68-90e4-18f9a9d31b58",
  title: "Loose stone at entrance",
  description: "The entrance stone needs inspection before the walkway opens.",
  zoneId: "entrance" as const,
  category: "Damage" as const,
  priority: "high" as const,
};
test("a case cannot skip review or assignment and needs a valid owner", () => {
  const reported = createIncident(input);
  assert.throws(
    () =>
      transitionIncident(reported, {
        version: 1,
        status: "resolved",
        note: "Skip steps",
      }),
    /not allowed/,
  );
  let i = transitionIncident(reported, {
    version: 1,
    status: "under_review",
    note: "Review initiated",
  });
  i = transitionIncident(i, {
    version: 2,
    status: "confirmed",
    note: "Issue confirmed",
  });
  assert.throws(
    () =>
      transitionIncident(i, {
        version: 3,
        status: "assigned",
        note: "Assign case",
      }),
    /valid staff/,
  );
  assert.throws(
    () =>
      transitionIncident(i, {
        version: 3,
        status: "assigned",
        assigneeId: "stranger",
        note: "Assign case",
      }),
    /valid staff/,
  );
  for (const status of [
    "assigned",
    "acknowledged",
    "in_progress",
    "resolved",
    "closed",
  ] as Status[])
    i = transitionIncident(i, {
      version: i.version,
      status,
      assigneeId: "arjun",
      note: "Action performed and documented.",
    });
  assert.equal(i.status, "closed");
  assert.equal(i.assigneeId, "arjun");
  assert.equal(i.history.length, 8);
  assert.match(i.history[3].note, /Arjun Singh/);
  assert.throws(
    () =>
      transitionIncident(i, {
        version: i.version,
        status: "confirmed",
        note: "Try reopening",
      }),
    /not allowed/,
  );
});
test("stale edits and invalid report fields are rejected", () => {
  assert.throws(
    () =>
      transitionIncident(createIncident(input), {
        version: 2,
        status: "under_review",
        note: "Review case",
      }),
    /changed/,
  );
  assert.equal(
    createSchema.safeParse({ ...input, zoneId: "another-site" }).success,
    false,
  );
  assert.equal(
    createSchema.safeParse({ ...input, status: "closed" }).success,
    false,
  );
  assert.equal(
    updateSchema.safeParse({ version: 1, status: "under_review", note: "  " })
      .success,
    false,
  );
});
test("a dismissed report cannot become assigned work", () => {
  let i = transitionIncident(createIncident(input), {
    version: 1,
    status: "under_review",
    note: "Review report",
  });
  i = transitionIncident(i, {
    version: 2,
    status: "dismissed",
    note: "No damage found during inspection.",
  });
  assert.equal(i.assigneeId, null);
  assert.throws(
    () =>
      transitionIncident(i, {
        version: 3,
        status: "assigned",
        assigneeId: "arjun",
        note: "Assign work",
      }),
    /not allowed/,
  );
});
test("crowd counts do not add app users; stale, offline, partial and invalid readings stay unknown", () => {
  const now = "2026-09-30T10:00:00Z";
  const signal = seed(now).signals[0];
  assert.equal(crowdState(signal, Date.parse(now)).count, 178);
  assert.equal(crowdState(signal, Date.parse(now)).activeUsers, 41);
  assert.equal(crowdState(signal, Date.parse(now)).level, "High");
  assert.equal(crowdState(signal, Date.parse(now) + 301_000).count, null);
  assert.equal(crowdState(signal, Date.parse(now) + 301_000).activeUsers, null);
  for (const change of [
    { coverage: "partial" as const },
    { cameraHealth: "offline" as const },
    { cameraAt: "bad date" },
    { cameraCount: -5 },
  ])
    assert.equal(
      crowdState({ ...signal, ...change }, Date.parse(now)).count,
      null,
    );
});
test("local store persists across instances and serializes simultaneous changes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "sanskriti-ops-"));
  const file = path.join(dir, "store.json");
  try {
    const store = makeStore(file);
    await Promise.all(
      Array.from({ length: 12 }, (_, n) =>
        store.transaction((data) => {
          data.incidents.push(
            createIncident({ ...input, requestId: `test-${n}` }),
          );
        }),
      ),
    );
    const reopened = await makeStore(file).transaction((data) => data, false);
    assert.equal(reopened.incidents.length, 16);
    assert.equal(new Set(reopened.incidents.map((i) => i.id)).size, 16);
    const original = await readFile(file, "utf8");
    await assert.rejects(
      store.transaction(() => {
        throw new Error("Rejected write");
      }),
    );
    assert.equal(await readFile(file, "utf8"), original);
    await writeFile(file, "{broken");
    await assert.rejects(store.transaction((data) => data, false));
    assert.equal(await readFile(file, "utf8"), "{broken");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("sandbox rejects remote hosts and cross-site mutations", () => {
  assert.doesNotThrow(() =>
    assertLocal(
      new Request("http://localhost:3100/api/workspace", {
        headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    assertLocal(
      new Request("http://127.0.0.1:3100/api/workspace", {
        headers: { origin: "http://127.0.0.1:3100" },
      }),
    ),
  );
  assert.throws(
    () => assertLocal(new Request("http://example.com/api/workspace")),
    /localhost/,
  );
  assert.throws(
    () =>
      assertLocal(
        new Request("http://127.0.0.1:3100/api/workspace", {
          headers: { origin: "https://example.com" },
        }),
      ),
    /Cross-origin/,
  );
});
