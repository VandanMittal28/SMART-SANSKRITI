import test from "node:test";
import assert from "node:assert/strict";
import { DemoRepository, DEMO_STORAGE_KEY, type DemoStorage } from "../lib/taj-pilot/demo-repository.ts";
import { createAdvisory, advisoryVisible } from "../lib/taj-pilot/advisory.ts";
class MemoryStorage implements DemoStorage {
  data = new Map<string, string>(); fail = false;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.fail) throw new Error("Quota exceeded"); this.data.set(k,v); }
}
async function fullJourney(repo: DemoRepository) {
  await repo.runScenario("Normal"); await repo.runScenario("Rising queue");
  assert.equal(repo.states["east-gate"].condition, "Rising");
  assert.equal((await repo.listAlerts()).length, 0);
  await repo.runScenario("Congestion");
  let alert = (await repo.listAlerts())[0];
  assert.equal(alert.condition, "Congestion");
  alert = await repo.applyAction(alert.id, alert.version, { type: "assign", assignee: "demo-staff-1", note: "" });
  alert = await repo.applyAction(alert.id, alert.version, { type: "acknowledge", note: "" });
  await repo.applyAction(alert.id, alert.version, { type: "record-action", note: "Opened simulated lane" });
  await repo.runScenario("Recovery");
  alert = (await repo.listAlerts())[0];
  assert.equal(alert.status, "action-recorded");
  alert = await repo.applyAction(alert.id, alert.version, { type: "resolve", note: "Verified recovery" });
  await repo.runScenario("Offline"); assert.equal(repo.states["east-gate"].condition, "Unknown");
  return alert;
}
test("integrated six-scenario journey repeats with identical histories and survives reload", async () => {
  const storage = new MemoryStorage(); let repo = await DemoRepository.open(storage);
  const first = await fullJourney(repo);
  repo = await DemoRepository.open(storage);
  assert.deepEqual((await repo.listAlerts())[0], first);
  assert.equal(repo.states["east-gate"].condition,"Unknown");
  await repo.runScenario("Reset"); assert.equal((await repo.listAlerts()).length,0);
  assert.deepEqual(await fullJourney(repo), first);
});
test("failed persistence leaves clock, alerts, and saved journal unchanged", async () => {
  const storage = new MemoryStorage(); const repo = await DemoRepository.open(storage);
  await repo.runScenario("Congestion"); const before = storage.getItem(DEMO_STORAGE_KEY);
  const alerts = await repo.listAlerts(); const clock = repo.clock;
  storage.fail = true;
  await assert.rejects(repo.applyAction(alerts[0].id, alerts[0].version, { type:"assign",assignee:"demo-staff-1",note:"" }), /could not be saved/);
  await assert.rejects(repo.advance(10000), /could not be saved/);
  await assert.rejects(repo.resetDemo(), /could not be saved/);
  assert.equal(repo.clock,clock); assert.deepEqual(await repo.listAlerts(),alerts); assert.equal(storage.getItem(DEMO_STORAGE_KEY),before);
});
test("reset touches only demo storage; malformed records are not silently replaced", async () => {
  const storage = new MemoryStorage(); storage.setItem("real-records", "unchanged"); storage.setItem(DEMO_STORAGE_KEY, "corrupt");
  await assert.rejects(DemoRepository.open(storage), /not been overwritten/);
  assert.equal(storage.getItem(DEMO_STORAGE_KEY),"corrupt");
  const repo = await DemoRepository.resetStored(storage); assert.equal((await repo.listAlerts()).length,0);
  assert.equal(storage.getItem("real-records"),"unchanged");
  storage.setItem(DEMO_STORAGE_KEY,JSON.stringify({version:1,mode:"real",commands:[]}));
  await assert.rejects(DemoRepository.open(storage), /not been overwritten/);
});
test("sequential stale-tab edits reject without overwriting newer work", async () => {
  const storage = new MemoryStorage(); const first = await DemoRepository.open(storage); const second = await DemoRepository.open(storage);
  await first.runScenario("Congestion"); const before = storage.getItem(DEMO_STORAGE_KEY);
  await assert.rejects(second.runScenario("Normal"), /another tab/);
  assert.equal(storage.getItem(DEMO_STORAGE_KEY),before);
});
test("bilingual preview expires and is suppressed for Unknown, changed condition and real mode", async () => {
  const repo = await DemoRepository.open(new MemoryStorage()); await repo.runScenario("Congestion");
  const s = repo.snapshots[0], condition = repo.states["east-gate"].condition;
  const preview = createAdvisory(s,condition,repo.clock)!;
  assert.ok(preview.en.length); assert.match(preview.hi,/कृपया/);
  assert.equal(advisoryVisible(preview,s,condition,repo.clock),true);
  assert.equal(advisoryVisible(preview,s,condition,preview.expiresAt),false);
  assert.equal(advisoryVisible(preview,s,"Recovered",repo.clock),false);
  assert.equal(createAdvisory({...s,mode:"real"},condition,repo.clock),null);
  await repo.runScenario("Offline");
  assert.equal(createAdvisory(repo.snapshots[0],repo.states["east-gate"].condition,repo.clock),null);
  assert.equal(advisoryVisible(preview,repo.snapshots[0],repo.states["east-gate"].condition,repo.clock),false);
});
