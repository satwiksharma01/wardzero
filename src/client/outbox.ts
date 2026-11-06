import { z } from "zod";
import type { Reading } from "../domain/readings";

export type QueueEntry = {
  id: string;
  reading: Reading;
  state: "pending" | "rejected";
  attempts: number;
  nextAttemptAt: number;
  reason?: string;
};
export type QueueSummary = {
  pending: number;
  rejected: QueueEntry[];
  blocked: boolean;
};
const resultSchema = z.array(
  z.object({
    eventId: z.string().nullable(),
    status: z.enum(["accepted", "duplicate", "conflict", "rejected"]),
    reason: z.string().optional(),
  }),
);
const requestValue = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Browser storage failed."));
  });
export const retryDelay = (attempts: number) =>
  Math.min(30000, 1000 * 2 ** Math.min(attempts, 5));

export class Outbox {
  private database: Promise<IDBDatabase> | null = null;
  constructor(
    private readonly name = "wardzero-sensor-outbox",
    private readonly capacity = 500,
  ) {}
  private open() {
    this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("events", { keyPath: "id" });
        request.result.createObjectStore("settings", { keyPath: "key" });
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () =>
        reject(request.error ?? new Error("Browser storage unavailable."));
      request.onblocked = () =>
        reject(
          new Error("Close other simulator tabs to unlock browser storage."),
        );
    });
    return this.database;
  }
  private async transaction<T>(
    mode: IDBTransactionMode,
    run: (tx: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    const db = await this.open();
    const tx = db.transaction(["events", "settings"], mode);
    const completion = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(tx.error ?? new Error("Browser storage transaction failed."));
    });
    try {
      const value = await run(tx);
      await completion;
      return value;
    } catch (error) {
      try {
        tx.abort();
      } catch {}
      await completion.catch(() => {});
      throw error;
    }
  }
  async enqueue(reading: Reading) {
    return this.transaction("readwrite", async (tx) => {
      const store = tx.objectStore("events");
      if ((await requestValue(store.count())) >= this.capacity)
        throw new Error(
          `Sensor queue reached its ${this.capacity}-reading capacity. Reconnect or inspect rejected entries before generating more.`,
        );
      await requestValue(
        store.add({
          id: reading.eventId,
          reading,
          state: "pending",
          attempts: 0,
          nextAttemptAt: 0,
        } satisfies QueueEntry),
      );
    });
  }
  async pending(now = Date.now()): Promise<QueueEntry[]> {
    return this.transaction("readonly", async (tx) => {
      const entries: QueueEntry[] = await requestValue(
        tx.objectStore("events").getAll(),
      );
      return entries
        .filter(
          (entry) => entry.state === "pending" && entry.nextAttemptAt <= now,
        )
        .sort(
          (a, b) =>
            a.reading.observedAt.localeCompare(b.reading.observedAt) ||
            a.id.localeCompare(b.id),
        )
        .slice(0, 50);
    });
  }
  async summary(): Promise<QueueSummary> {
    return this.transaction("readonly", async (tx) => {
      const [entries, setting]: [QueueEntry[], { value: boolean } | undefined] =
        await Promise.all([
          requestValue(tx.objectStore("events").getAll()),
          requestValue(tx.objectStore("settings").get("blocked")),
        ]);
      return {
        pending: entries.filter((entry) => entry.state === "pending").length,
        rejected: entries.filter((entry) => entry.state === "rejected"),
        blocked: setting?.value ?? false,
      };
    });
  }
  async setBlocked(blocked: boolean) {
    await this.transaction("readwrite", async (tx) => {
      await requestValue(
        tx.objectStore("settings").put({ key: "blocked", value: blocked }),
      );
    });
  }
  async acknowledge(batch: QueueEntry[], rawResults: unknown) {
    const results = resultSchema.parse(rawResults);
    if (
      results.length !== batch.length ||
      results.some(
        (result, index) =>
          result.eventId !== batch[index].id &&
          !(result.status === "rejected" && result.eventId === null),
      )
    )
      throw new Error(
        "Invalid delivery acknowledgement. Queued readings were retained.",
      );
    await this.transaction("readwrite", async (tx) => {
      const store = tx.objectStore("events");
      for (let index = 0; index < batch.length; index++) {
        const current: QueueEntry | undefined = await requestValue(
          store.get(batch[index].id),
        );
        if (!current) continue;
        const result = results[index];
        if (result.status === "accepted" || result.status === "duplicate")
          await requestValue(store.delete(current.id));
        else
          await requestValue(
            store.put({
              ...current,
              state: "rejected",
              reason: result.reason ?? "Reading rejected by the platform.",
            }),
          );
      }
    });
  }
  async failed(batch: QueueEntry[], now = Date.now()) {
    await this.transaction("readwrite", async (tx) => {
      const store = tx.objectStore("events");
      for (const item of batch) {
        const current: QueueEntry | undefined = await requestValue(
          store.get(item.id),
        );
        if (current?.state === "pending")
          await requestValue(
            store.put({
              ...current,
              attempts: current.attempts + 1,
              nextAttemptAt: now + retryDelay(current.attempts),
            }),
          );
      }
    });
  }
  async close() {
    if (this.database) (await this.database).close();
    this.database = null;
  }
}
