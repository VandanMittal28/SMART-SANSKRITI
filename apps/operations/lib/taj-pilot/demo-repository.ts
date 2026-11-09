import { z } from "zod";
import { DemoEngine } from "./demo-engine.ts";
import { runScenario, SCENARIOS, type ScenarioName } from "./scenarios.ts";
import type { AlertRepository, StaffAction, ZoneId } from "./contracts.ts";
export const DEMO_STORAGE_KEY = "sanskriti: taj-pilot:demo:v1";
export interface DemoStorage { getItem(key: string): string | null | Promise<string | null>; setItem(key: string, value: string): void | Promise<void> }
const actionSchema = z.object({ type: z.enum(["assign", "acknowledge", "record-action", "resolve"]), note: z.string().max(1000), assignee: z.string().optional() }).strict();
const commandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("scenario"), name: z.enum(SCENARIOS) }).strict(),
  z.object({ kind: z.literal("input"), zone: z.enum(["east-gate", "main-gateway", "mausoleum"]), count: z.number().int().min(0).max(100000).nullable() }).strict(),
  z.object({ kind: z.literal("advance"), ms: z.number().int().positive().max(3600000) }).strict(),
  z.object({ kind: z.literal("action"), id: z.string(), version: z.number().int().positive(), action: actionSchema }).strict(),
]);
type Command = z.infer<typeof commandSchema>;
const journalSchema = z.object({ version: z.literal(1), mode: z.literal("demo"), commands: z.array(commandSchema).max(2000) }).strict();
async function replay(commands: Command[]) {
  const engine = new DemoEngine();
  for (const c of commands) {
    if (c.kind === "scenario") runScenario(engine, c.name);
    else if (c.kind === "input") engine.setInput(c.zone, c.count);
    else if (c.kind === "advance") engine.advance(c.ms);
    else await engine.applyAction(c.id, c.version, c.action);
  }
  return engine;
}
export class DemoRepository implements AlertRepository {
  private engine = new DemoEngine();
  private commands: Command[] = [];
  private saved: string | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private storage: DemoStorage;
  private constructor(storage: DemoStorage) { this.storage = storage; }
  static async open(storage: DemoStorage) {
    const repo = new DemoRepository(storage);
    const raw = await storage.getItem(DEMO_STORAGE_KEY);
    if (raw !== null) {
      if (raw.length > 2_000_000) throw new Error("Demo storage is too large. Reset this demo explicitly.");
      try { repo.commands = journalSchema.parse(JSON.parse(raw)).commands; repo.engine = await replay(repo.commands); }
      catch { throw new Error("Saved demo could not be read. It has not been overwritten. Reset demo to start again."); }
    }
    repo.saved = raw; return repo;
  }
  static async resetStored(storage: DemoStorage) {
    await storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: 1, mode: "demo", commands: [] }));
    return DemoRepository.open(storage);
  }
  get clock() { return this.engine.clock; }
  get snapshots() { return this.engine.snapshots; }
  get states() { return this.engine.states; }
  async listAlerts() { return this.engine.listAlerts(); }
  private commit(command: Command) {
    const operation = this.queue.then(async () => {
      const parsed = commandSchema.parse(command);
      const commands = parsed.kind === "scenario" && parsed.name === "Reset" ? [] : [...this.commands, parsed];
      if (commands.length > 2000) throw new Error("Demo history limit reached. Reset the demo to continue.");
      const candidate = await replay(commands);
      // Detect an external tab change before committing; no silent overwrites.
      if (await this.storage.getItem(DEMO_STORAGE_KEY) !== this.saved) throw new Error("Demo changed in another tab. Reload before continuing.");
      const serialized = JSON.stringify({ version: 1, mode: "demo", commands });
      if (new TextEncoder().encode(serialized).length > 2_000_000) throw new Error("Demo storage limit reached. Reset to continue.");
      try { await this.storage.setItem(DEMO_STORAGE_KEY, serialized); }
      catch (error) { throw new Error(`Demo could not be saved. No change was applied. ${error instanceof Error ? error.message : "Check storage access and retry."}`); }
      this.commands = commands; this.engine = candidate; this.saved = serialized;
    });
    this.queue = operation.catch(() => undefined); return operation;
  }
  runScenario(name: ScenarioName) { return this.commit({ kind: "scenario", name }); }
  resetDemo() { return this.runScenario("Reset"); }
  setInput(zone: ZoneId, count: number | null) { return this.commit({ kind: "input", zone, count }); }
  advance(ms: number) { return this.commit({ kind: "advance", ms }); }
  async applyAction(id: string, version: number, action: StaffAction) {
    await this.commit({ kind: "action", id, version, action });
    return (await this.listAlerts()).find(a => a.id === id)!;
  }
}
