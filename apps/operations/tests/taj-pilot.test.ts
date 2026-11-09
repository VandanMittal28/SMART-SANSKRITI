import test from "node:test";
import assert from "node:assert/strict";
import { InputAdapter, type RegisteredSource } from "../lib/taj-pilot/input-adapter.ts";
import { evaluate } from "../lib/taj-pilot/crowd-core.ts";
import { DEMO_RULE, type Observation, type ZoneSnapshot } from "../lib/taj-pilot/contracts.ts";
import { MockWorkspace, INITIAL_CLOCK as clock } from "../lib/taj-pilot/mock-workspace.ts";
const source: RegisteredSource = { sourceId: "synthetic-test-source", credential: "test-only-credential", siteId: "taj-mahal", mode: "test", zoneId: "east-gate", calibrated: true, thresholdStatus: "demo" };
const adapter = () => new InputAdapter([source], { siteId: "taj-mahal", mode: "test" });
const event = (overrides: Partial<Observation> = {}): Observation => ({ eventId: "event-1", sourceId: source.sourceId, sequence: 1, observedAt: new Date(clock).toISOString(), health: "online", count: 120, ...overrides });
const snapshot = (at: number, count = 120): ZoneSnapshot => ({ siteId: "taj-mahal", mode: "demo", zoneId: "east-gate", estimatedCount: count, observedAt: new Date(at).toISOString(), freshness: "fresh", sourceHealth: "online", calibrated: true, thresholdStatus: "demo" });
test("pilot input derives scope from registration and authenticates before accepting retries", () => {
  const input = adapter();
  assert.equal(input.accept(event(), source.credential, clock).snapshot.mode, "test");
  assert.equal(input.accept(event(), source.credential, clock + 61_000).duplicate, true);
  assert.equal(input.snapshot("east-gate", clock + 61_000).estimatedCount, null);
  assert.throws(() => input.accept(event(), "wrong", clock), /Unauthorized/);
  assert.throws(() => input.accept({ ...event(), mode: "real" }, source.credential, clock));
  for (const scope of [{ siteId: "other-site", mode: "test" as const }, { siteId: "taj-mahal", mode: "real" as const }]) {
    assert.throws(() => new InputAdapter([source], scope).accept(event(), source.credential, clock), /Unauthorized/);
  }
  assert.throws(() => input.accept(event({ sourceId: "unknown" }), source.credential, clock), /Unauthorized/);
});
test("pilot input rejects conflicts, ordering, invalid counts and timestamps", () => {
  const input = adapter(); input.accept(event(), source.credential, clock);
  assert.throws(() => input.accept(event({ count: 121 }), source.credential, clock), /Conflicting/);
  assert.throws(() => input.accept(event({ eventId: "new" }), source.credential, clock), /Out-of-order/);
  for (const overrides of [{ count: -1 }, { count: 1.5 }, { health: "offline" as const }, { count: null }, { observedAt: "invalid" }, { sequence: -1 }]) assert.throws(() => adapter().accept(event(overrides), source.credential, clock));
  for (const at of [clock - 60_001, clock + 1]) assert.throws(() => adapter().accept(event({ observedAt: new Date(at).toISOString() }), source.credential, clock), /stale or in the future/);
  input.accept(event({ eventId: "second", sequence: 2, observedAt: new Date(clock + 1000).toISOString() }), source.credential, clock + 1000);
  assert.throws(() => input.accept(event({ eventId: "third", sequence: 3 }), source.credential, clock + 1000), /Out-of-order/);
  assert.equal(input.accept(event(), source.credential, clock + 1000).snapshot.observedAt, new Date(clock + 1000).toISOString());
});
test("pilot source health and coverage fail closed", () => {
  assert.equal(adapter().snapshot("east-gate", clock).freshness, "missing");
  assert.equal(adapter().accept(event({ health: "offline", count: null }), source.credential, clock).snapshot.estimatedCount, null);
  assert.equal(new InputAdapter([{ ...source, calibrated: false }], { siteId: "taj-mahal", mode: "test" }).accept(event(), source.credential, clock).snapshot.estimatedCount, null);
  assert.throws(() => new InputAdapter([source, { ...source, sourceId: "overlapping" }], { siteId: "taj-mahal", mode: "test" }), /one authoritative source/);
});
test("sustained breach, hysteresis and recovery are deterministic", () => {
  let state = evaluate(snapshot(clock), DEMO_RULE, clock);
  assert.equal(state.condition, "Rising");
  state = evaluate(snapshot(clock + 29_999), DEMO_RULE, clock + 29_999, state);
  assert.equal(state.active, false);
  state = evaluate(snapshot(clock + 30_000), DEMO_RULE, clock + 30_000, state);
  assert.equal(state.condition, "Congestion");
  state = evaluate(snapshot(clock + 31_000, 60), DEMO_RULE, clock + 31_000, state);
  assert.equal(state.condition, "Recovering");
  state = evaluate(snapshot(clock + 40_000, 80), DEMO_RULE, clock + 40_000, state);
  assert.equal(state.condition, "Congestion");
  state = evaluate(snapshot(clock + 50_000, 60), DEMO_RULE, clock + 50_000, state);
  state = evaluate(snapshot(clock + 70_000, 60), DEMO_RULE, clock + 70_000, state);
  assert.equal(state.condition, "Recovered"); assert.equal(state.active, false);
});
test("Unknown interrupts duration without silently recovering an active alert", () => {
  let state = evaluate(snapshot(clock), DEMO_RULE, clock);
  state = evaluate(snapshot(clock + 90_000), DEMO_RULE, clock + 90_000, state);
  assert.equal(state.active, false);
  state = evaluate(snapshot(clock + 120_000), DEMO_RULE, clock + 120_000, state);
  assert.equal(state.active, true);
  for (const invalid of [{ calibrated: false }, { sourceHealth: "offline" as const }, { freshness: "stale" as const }, { observedAt: null }, { mode: "real" as const, thresholdStatus: "demo" as const }]) {
    const next = evaluate({ ...snapshot(clock + 120_000), ...invalid }, DEMO_RULE, clock + 120_000, state);
    assert.equal(next.condition, "Unknown"); assert.equal(next.active, true); assert.equal(next.recoverySince, null);
  }
  assert.throws(() => evaluate(snapshot(clock), DEMO_RULE, clock, state), /monotonic/);
  assert.equal(evaluate(snapshot(clock), DEMO_RULE, clock + 60_001).condition, "Unknown");
});
test("temporary workflow runs twice, keeps one open case, requires notes and never auto-resolves", async () => {
  const workspace = new MockWorkspace();
  const run = async () => {
    workspace.setInput("east-gate", 120); workspace.advance(30_000);
    workspace.setInput("east-gate", 120);
    let alerts = await workspace.listAlerts(); assert.equal(alerts.length, 1);
    let alert = alerts[0];
    await assert.rejects(workspace.applyAction(alert.id, alert.version, { type: "resolve", note: "" }));
    alert = await workspace.applyAction(alert.id, alert.version, { type: "assign", assignee: "demo-staff-1", note: "" });
    await assert.rejects(workspace.applyAction(alert.id, 1, { type: "acknowledge", note: "" }), /changed/);
    alert = await workspace.applyAction(alert.id, alert.version, { type: "acknowledge", note: "" });
    await assert.rejects(workspace.applyAction(alert.id, alert.version, { type: "record-action", note: " " }));
    alert = await workspace.applyAction(alert.id, alert.version, { type: "record-action", note: "Opened simulated queue lane" });
    workspace.setInput("east-gate", 40); workspace.advance(20_000);
    alert = (await workspace.listAlerts())[0];
    assert.equal(alert.status, "action-recorded"); assert.equal(alert.condition, "Recovered");
    await assert.rejects(workspace.applyAction(alert.id, alert.version, { type: "resolve", note: "" }));
    alert = await workspace.applyAction(alert.id, alert.version, { type: "resolve", note: "Recovery verified" });
    workspace.setInput("east-gate", null); assert.equal(workspace.states["east-gate"].condition, "Unknown");
    return alert;
  };
  const first = await run(); workspace.resetDemo(); assert.equal((await workspace.listAlerts()).length, 0);
  assert.deepEqual(await run(), first);
});
