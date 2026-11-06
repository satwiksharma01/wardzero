import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { ReadingStore } from "../src/server/reading-store";
import { makeReading } from "../src/domain/readings";

it("preserves readings and observation time after closing and reopening the database", async () => {
  const testRoot = path.resolve(".data/tests");
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, "persistence-"));
  let db = new PGlite(directory);
  try {
    const now = new Date("2026-11-07T08:00:00Z");
    let store = new ReadingStore(db);
    await store.initialize();
    await store.ingest([makeReading(0, "stable", now, "persisted-event")], now);
    await db.close();
    db = new PGlite(directory);
    store = new ReadingStore(db);
    await store.initialize();
    const snapshot = await store.snapshot(new Date(now.getTime() + 90000));
    expect(snapshot.total).toBe(1);
    expect(snapshot.latest?.eventId).toBe("persisted-event");
    expect(snapshot.latest?.observedAt).toBe(now.toISOString());
    expect(snapshot.monitoring).toBe("Offline");
  } finally {
    await db.close();
    // Delete only the directory created by this test inside its verified workspace root.
    if (
      path.dirname(path.resolve(directory)) !== testRoot ||
      !path.basename(directory).startsWith("persistence-")
    )
      throw new Error("Unsafe test cleanup path");
    await rm(directory, { recursive: true });
  }
});
