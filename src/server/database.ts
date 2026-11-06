import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { ReadingStore } from "./reading-store";

const globalDatabase = globalThis as typeof globalThis & {
  wardzeroStore?: Promise<ReadingStore>;
};

export function getStore(): Promise<ReadingStore> {
  // Keep one connection across development hot reloads. Local PGlite is single-process only.
  globalDatabase.wardzeroStore ??= (async () => {
    const name = process.env.WARDZERO_DATA_NAME || "wardzero";
    if (!/^[a-zA-Z0-9_-]+$/.test(name))
      throw new Error("Invalid local database name");
    const database = new PGlite(path.join(process.cwd(), ".data", name));
    const store = new ReadingStore(database);
    await store.initialize();
    return store;
  })().catch((error) => {
    delete globalDatabase.wardzeroStore;
    throw error;
  });
  return globalDatabase.wardzeroStore;
}
