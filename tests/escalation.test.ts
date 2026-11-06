import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { ReadingStore } from "../src/server/reading-store";
import { makeReading } from "../src/domain/readings";

let db: PGlite;
let store: ReadingStore;
const now = new Date("2026-11-07T08:00:00Z");
beforeAll(async () => {
  db = new PGlite();
  store = new ReadingStore(db);
  await store.initialize();
});
afterAll(async () => {
  await db.close();
});

it("escalates once at the exact persisted deadline and lets the backup record a response", async () => {
  await store.ingest(
    [makeReading(12, "deteriorating", now, "overdue-source")],
    now,
  );
  const alert = (await store.snapshot(now)).care.alerts[0];
  expect(alert.acknowledgementDueAt).toBe(
    new Date(now.getTime() + 120000).toISOString(),
  );
  await store.evaluateDeadlines(new Date(now.getTime() + 119999));
  expect((await store.snapshot(now)).care.alerts[0].escalatedAt).toBeNull();
  await Promise.all([
    store.evaluateDeadlines(new Date(now.getTime() + 120000)),
    store.evaluateDeadlines(new Date(now.getTime() + 120000)),
  ]);
  const escalated = (await store.snapshot(now)).care.alerts[0];
  expect(escalated.escalatedAt).toBe(
    new Date(now.getTime() + 120000).toISOString(),
  );
  expect(
    escalated.events.filter((event) => event.action === "escalated"),
  ).toHaveLength(1);
  const { token } = await store.care.createSession("backup", now);
  await store.care.recordEvent(
    alert.id,
    token,
    { eventId: "backup-ack", action: "acknowledge" },
    new Date(now.getTime() + 120001),
  );
  expect((await store.snapshot(now)).care.alerts[0].state).toBe("Acknowledged");
});

it("does not escalate an alert acknowledged before its deadline", async () => {
  const db2 = new PGlite();
  try {
    const second = new ReadingStore(db2);
    await second.initialize();
    await second.ingest(
      [makeReading(12, "deteriorating", now, "early-source")],
      now,
    );
    const alert = (await second.snapshot(now)).care.alerts[0];
    const { token } = await second.care.createSession("primary", now);
    await second.care.recordEvent(
      alert.id,
      token,
      { eventId: "early-ack", action: "acknowledge" },
      new Date(now.getTime() + 1000),
    );
    await second.evaluateDeadlines(new Date(now.getTime() + 180000));
    expect((await second.snapshot(now)).care.alerts[0].escalatedAt).toBeNull();
  } finally {
    await db2.close();
  }
});
