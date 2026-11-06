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
    const highTime = new Date(now.getTime() + 1000);
    await store.ingest(
      [makeReading(12, "deteriorating", highTime, "persisted-high")],
      highTime,
    );
    const alert = (await store.snapshot(highTime)).care.alerts[0];
    const { token } = await store.care.createSession("primary", highTime);
    await store.care.recordEvent(
      alert.id,
      token,
      { eventId: "persisted-ack", action: "acknowledge" },
      highTime,
    );
    await store.notes.submit(
      token,
      {
        id: "persisted-note",
        text: "Caregiver observation retained across restart.",
      },
      highTime,
      null,
      () => highTime,
    );
    await db.close();
    db = new PGlite(directory);
    store = new ReadingStore(db);
    await store.initialize();
    const snapshot = await store.snapshot(new Date(now.getTime() + 91000));
    expect(snapshot.total).toBe(2);
    expect(snapshot.latest?.eventId).toBe("persisted-high");
    expect(snapshot.latest?.observedAt).toBe(highTime.toISOString());
    expect(snapshot.monitoring).toBe("Offline");
    expect(snapshot.care.alerts[0].id).toBe(alert.id);
    expect(snapshot.care.alerts[0].state).toBe("Acknowledged");
    expect(snapshot.care.alerts[0].events.at(-1)?.id).toBe("persisted-ack");
    expect(snapshot.care.notes[0].id).toBe("persisted-note");
    expect(snapshot.care.notes[0].status).toBe("Unavailable");
    expect((await store.care.actorForSession(token, highTime))?.id).toBe(
      "caregiver-primary",
    );
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
