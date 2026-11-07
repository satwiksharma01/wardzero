import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { ReadingStore } from "../src/server/reading-store";
import { makeReading } from "../src/domain/readings";

it("raises episode severity once, preserves its peak, and never auto-resolves on normal readings", async () => {
  const db = new PGlite();
  try {
    const store = new ReadingStore(db);
    await store.initialize();
    const now = new Date("2026-11-07T08:00:00Z");
    const medium = makeReading(6, "deteriorating", now, "medium");
    await store.ingest([medium], now);
    const id = (await store.snapshot(now)).care.alerts[0].id;
    expect((await store.snapshot(now)).care.alerts[0].severity).toBe("Medium");
    const later = new Date(now.getTime() + 5000);
    const high = makeReading(12, "deteriorating", later, "high");
    await Promise.all([
      store.ingest([high], later),
      store.ingest([high], later),
    ]);
    const last = new Date(later.getTime() + 5000);
    await store.ingest([makeReading(0, "stable", last, "normal")], last);
    const snapshot = await store.snapshot(last);
    expect(snapshot.care.alerts).toHaveLength(1);
    expect(snapshot.care.alerts[0].id).toBe(id);
    expect(snapshot.care.alerts[0].severity).toBe("High");
    expect(snapshot.care.alerts[0].assessment.concern).toBe("High");
    expect(snapshot.care.alerts[0].state).toBe("Open");
    expect(
      snapshot.care.alerts[0].events.filter(
        (event) => event.action === "severity-raised",
      ),
    ).toHaveLength(1);
    const { token } = await store.care.createSession("primary", last);
    await expect(
      store.care.recordEvent(
        id,
        token,
        { eventId: "spoof", action: "acknowledge", actorId: "invented" },
        last,
      ),
    ).rejects.toMatchObject({ status: 400 });
    const calls = await Promise.allSettled([
      store.care.recordEvent(
        id,
        token,
        { eventId: "ack-a", action: "acknowledge" },
        last,
      ),
      store.care.recordEvent(
        id,
        token,
        { eventId: "ack-b", action: "acknowledge" },
        last,
      ),
    ]);
    expect(
      calls.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(calls.filter((result) => result.status === "rejected")).toHaveLength(
      1,
    );
  } finally {
    await db.close();
  }
});

it("adopts an existing first-slice database without losing readings and applies migrations once", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE TABLE readings(event_id TEXT PRIMARY KEY, observed_at TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL, payload JSONB NOT NULL)",
    );
    const now = new Date("2026-11-07T08:00:00Z");
    const event = makeReading(0, "stable", now, "legacy");
    await db.query("INSERT INTO readings VALUES($1,$2,$2,$3::jsonb)", [
      event.eventId,
      now.toISOString(),
      JSON.stringify(event),
    ]);
    const store = new ReadingStore(db);
    await store.initialize();
    await store.initialize();
    expect((await store.snapshot(now)).latest?.eventId).toBe("legacy");
    expect(
      (await db.query("SELECT version FROM schema_migrations ORDER BY version"))
        .rows,
    ).toEqual([1, 2, 3, 4, 5, 6].map((version) => ({ version })));
    expect((await db.query("SELECT * FROM notification_jobs")).rows).toEqual(
      [],
    );
  } finally {
    await db.close();
  }
});
