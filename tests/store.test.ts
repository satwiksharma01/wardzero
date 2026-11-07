import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { makeReading } from "../src/domain/readings";
import { ReadingStore } from "../src/server/reading-store";

const now = new Date("2026-11-07T08:00:00.000Z");
let db: PGlite;
let store: ReadingStore;

beforeAll(async () => {
  db = new PGlite();
  store = new ReadingStore(db);
  await store.initialize();
});
afterAll(async () => {
  await db?.close();
});

describe("persisted reading ingestion", () => {
  it("starts with an honest empty snapshot", async () => {
    const snapshot = await store.snapshot(now);
    expect(snapshot.latest).toBeNull();
    expect(snapshot.monitoring).toBe("Waiting");
    expect(snapshot.total).toBe(0);
  });
  it("accepts once, deduplicates retries and rejects changed payloads", async () => {
    const event = makeReading(0, "stable", now, "unique-1");
    expect((await store.ingest([event], now))[0].status).toBe("accepted");
    expect((await store.ingest([event], now))[0].status).toBe("duplicate");
    expect(
      (await store.ingest([{ ...event, sequence: 99 }], now))[0].status,
    ).toBe("conflict");
    expect((await store.snapshot(now)).total).toBe(1);
  });
  it("preserves older history without replacing the current reading", async () => {
    const old = makeReading(
      1,
      "stable",
      new Date(now.getTime() - 60000),
      "old-1",
    );
    await store.ingest([old], now);
    const snapshot = await store.snapshot(now);
    expect(snapshot.latest?.eventId).toBe("unique-1");
    expect(snapshot.history[0].eventId).toBe("old-1");
    expect(snapshot.monitoring).toBe("Current");
    expect(snapshot.history[0].receivedAt).toBe(now.toISOString());
  });
  it("rejects future and malformed events independently within a batch", async () => {
    const future = makeReading(
      0,
      "stable",
      new Date(now.getTime() + 60000),
      "future",
    );
    const valid = makeReading(2, "stable", now, "valid-batch");
    const results = await store.ingest(
      [future, { nonsense: true }, valid],
      now,
    );
    expect(results.map((r) => r.status)).toEqual([
      "rejected",
      "rejected",
      "accepted",
    ]);
    expect((await store.snapshot(now)).total).toBe(3);
  });
  it("handles concurrent retries without duplicate storage", async () => {
    const event = makeReading(4, "stable", now, "concurrent");
    const results = await Promise.all([
      store.ingest([event], now),
      store.ingest([event], now),
    ]);
    expect(
      results
        .flat()
        .map((r) => r.status)
        .sort(),
    ).toEqual(["accepted", "duplicate"]);
  });
  it("rejects every positive future offset instead of accepting unassessed concern", async () => {
    for (const offset of [1, 1000, 5000]) {
      const event = makeReading(
        12,
        "deteriorating",
        new Date(now.getTime() + offset),
        `future-boundary-${offset}`,
      );
      expect((await store.ingest([event], now))[0].status).toBe("rejected");
    }
    const sameInstant = makeReading(5, "stable", now, "exact-clock-boundary");
    expect((await store.ingest([sameInstant], now))[0].status).toBe("accepted");
    const snapshot = await store.snapshot(new Date(now.getTime() + 6000));
    expect(snapshot.latest?.eventId).toBe("exact-clock-boundary");
    expect(snapshot.care.currentAssessment.concern).not.toBe("High");
    expect(snapshot.care.alerts).toHaveLength(0);
  });
});
