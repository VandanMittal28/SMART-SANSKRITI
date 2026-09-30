import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { seed, type Snapshot } from "./domain.ts";

// A serialized, atomic local store for the single-process sandbox only.
// Replace this adapter with transactional storage before multi-user deployment.
export function makeStore(file: string) {
  let queue: Promise<unknown> = Promise.resolve();
  async function read(): Promise<Snapshot> {
    try {
      const data = JSON.parse(await readFile(file, "utf8")) as Snapshot;
      if (
        data.schemaVersion !== 1 ||
        !Array.isArray(data.incidents) ||
        !Array.isArray(data.signals)
      )
        throw new Error("Unsupported local store. Back it up before recovery.");
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const data = seed();
      await save(data);
      return data;
    }
  }
  async function save(data: Snapshot) {
    await mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await rename(temp, file);
  }
  function transaction<T>(
    run: (data: Snapshot) => T | Promise<T>,
    mutate = true,
  ): Promise<T> {
    const pending = queue.then(async () => {
      const data = await read();
      const result = await run(data);
      if (mutate) await save(data);
      return result;
    });
    queue = pending.catch(() => undefined);
    return pending;
  }
  return { transaction };
}
const globalStore = globalThis as typeof globalThis & {
  operationsStore?: ReturnType<typeof makeStore>;
};
export const store = (globalStore.operationsStore ??= makeStore(
  path.join(process.cwd(), ".data", "operations.json"),
));
