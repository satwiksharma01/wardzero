import { PGliteWorker } from "@electric-sql/pglite/worker";
import { ReadingStore } from "../server/reading-store";

let store: Promise<ReadingStore> | undefined;
export function getBrowserStore() {
  if (!store) {
    const worker = new Worker(
      new URL("./database-worker.ts", import.meta.url),
      { type: "module" },
    );
    let timer: ReturnType<typeof setTimeout>;
    let rejectStartup: (error: Error) => void;
    const failed = new Promise<never>((_, reject) => {
      rejectStartup = reject;
      timer = setTimeout(
        () => reject(new Error("Browser database startup timed out.")),
        20000,
      );
    });
    const onError = () =>
      rejectStartup(new Error("Browser database worker failed."));
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onError);
    store = Promise.race([
      PGliteWorker.create(worker, {
        id: "wardzero-pages-v1",
        dataDir: "idb://wardzero-pages-v1",
      }).then(async (database) => {
        // Worker handshake can finish before WASM/IndexedDB initialization does.
        await database.query("SELECT 1");
        return new ReadingStore(database);
      }),
      failed,
    ])
      .catch((error) => {
        worker.terminate();
        store = undefined;
        throw error;
      })
      .finally(() => {
        clearTimeout(timer);
        worker.removeEventListener("error", onError);
        worker.removeEventListener("messageerror", onError);
      });
  }
  return store;
}
