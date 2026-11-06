import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { ReadingStore } from "../src/server/reading-store";
import { makeReading } from "../src/domain/readings";

it("retains an old high-concern backlog without presenting it as current or opening a fresh alert", async () => {
  const db = new PGlite();
  try {
    const store = new ReadingStore(db);
    await store.initialize();
    const now = new Date("2026-11-07T08:00:00Z");
    const old = makeReading(
      12,
      "deteriorating",
      new Date(now.getTime() - 180000),
      "old-high-backlog",
    );
    await store.ingest([old], now);
    let snapshot = await store.snapshot(now);
    expect(snapshot.latest?.observedAt).toBe(old.observedAt);
    expect(snapshot.monitoring).toBe("Offline");
    expect(snapshot.care.currentAssessment.concern).toBe("Unknown");
    expect(snapshot.care.alerts).toHaveLength(0);
    for (const step of [0, 1, 2])
      await store.ingest(
        [
          makeReading(
            step,
            "stable",
            new Date(now.getTime() - (2 - step) * 5000),
            `current-${step}`,
          ),
        ],
        now,
      );
    snapshot = await store.snapshot(now);
    expect(snapshot.total).toBe(4);
    expect(snapshot.care.currentAssessment.concern).toBe("Low");
    expect(snapshot.care.alerts).toHaveLength(0);
  } finally {
    await db.close();
  }
});
