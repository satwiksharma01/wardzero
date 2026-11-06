import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { ReadingStore } from "../src/server/reading-store";
import { makeReading } from "../src/domain/readings";

let db: PGlite;
let store: ReadingStore;
let token: string;
const wall = new Date("2026-11-07T08:00:00Z");
beforeAll(async () => {
  db = new PGlite();
  store = new ReadingStore(db);
  await store.initialize();
  token = (await store.care.createSession("primary", wall)).token;
});
afterAll(async () => {
  await db.close();
});

it("creates isolated runs idempotently and keeps old queued evidence in its original archive", async () => {
  await store.ingest(
    [makeReading(12, "deteriorating", wall, "original-high")],
    wall,
  );
  const oldAlert = (await store.snapshot(wall)).care.alerts[0].id;
  await store.notes.submit(
    token,
    { id: "old-run-note", text: "Observation from the original demo run." },
    wall,
    null,
    () => wall,
  );
  await expect(
    store.demo.reset(null, { id: "run-a", scenario: "stable" }, wall),
  ).rejects.toMatchObject({ status: 401 });
  const first = await store.demo.reset(
    token,
    { id: "run-a", scenario: "stable" },
    wall,
  );
  expect(first.id).toBe("run-a");
  expect(
    (await store.demo.reset(token, { id: "run-a", scenario: "stable" }, wall))
      .id,
  ).toBe("run-a");
  const current = await store.snapshot(wall);
  expect(current.run.id).toBe("run-a");
  expect(current.total).toBe(0);
  expect(current.care.alerts).toHaveLength(0);
  expect(current.care.notes).toHaveLength(0);
  const backup = (await store.care.createSession("backup", wall)).token;
  await expect(
    store.demo.reset(backup, { id: "forbidden-run", scenario: "stable" }, wall),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    store.notes.submit(
      token,
      { id: "old-run-note", text: "Observation from the original demo run." },
      wall,
      null,
      () => wall,
    ),
  ).rejects.toMatchObject({ status: 409 });
  const backlog = makeReading(0, "stable", wall, "old-queued");
  expect((await store.ingest([backlog], wall))[0].status).toBe("accepted");
  expect((await store.snapshot(wall)).total).toBe(0);
  const archived = await store.snapshot(wall, "local");
  expect(archived.total).toBe(2);
  expect(archived.care.alerts[0].id).toBe(oldAlert);
  expect(archived.care.notes).toHaveLength(1);
  await expect(
    store.care.recordEvent(
      oldAlert,
      token,
      { eventId: "archived-action", action: "acknowledge" },
      wall,
    ),
  ).rejects.toMatchObject({ status: 409 });
});

it("uses one advanced clock for reading freshness, deadlines and response timestamps without expiring sessions", async () => {
  await store.ingest(
    [makeReading(12, "deteriorating", wall, "run-a-high", "run-a")],
    wall,
  );
  const alert = (await store.snapshot(wall)).care.alerts[0];
  await store.demo.advance(
    token,
    { id: "advance-a", runId: "run-a", seconds: 130 },
    wall,
  );
  await store.demo.advance(
    token,
    { id: "advance-a", runId: "run-a", seconds: 130 },
    wall,
  );
  let snapshot = await store.snapshot(wall);
  expect(snapshot.serverTime).toBe(
    new Date(wall.getTime() + 130000).toISOString(),
  );
  expect(snapshot.monitoring).toBe("Offline");
  expect(snapshot.care.currentAssessment.concern).toBe("Unknown");
  await store.evaluateDeadlines(wall);
  snapshot = await store.snapshot(wall);
  expect(snapshot.care.alerts[0].escalatedAt).toBe(snapshot.serverTime);
  await store.care.recordEvent(
    alert.id,
    token,
    { eventId: "advanced-ack", action: "acknowledge" },
    wall,
  );
  expect(
    (await store.snapshot(wall)).care.alerts[0].events.at(-1)?.occurredAt,
  ).toBe(snapshot.serverTime);
  expect((await store.care.actorForSession(token, wall))?.id).toBe(
    "caregiver-primary",
  );
  for (let step = 0; step < 9; step++)
    await store.demo.advance(
      token,
      { id: `long-advance-${step}`, runId: "run-a", seconds: 3600 },
      wall,
    );
  await store.care.recordEvent(
    alert.id,
    token,
    {
      eventId: "long-clock-action",
      action: "record-action",
      text: "Recorded after advancing more than eight demo hours.",
    },
    wall,
  );
  expect((await store.care.actorForSession(token, wall))?.id).toBe(
    "caregiver-primary",
  );
});

it("replays presets consistently and preserves previous runs without deleting data", async () => {
  for (const id of ["repeat-1", "repeat-2"]) {
    await store.demo.reset(token, { id, scenario: "stable" }, wall);
    await store.demo.seed(
      token,
      { id: `seed-${id}`, runId: id, scenario: "stable" },
      wall,
    );
    await store.demo.seed(
      token,
      { id: `seed-${id}`, runId: id, scenario: "stable" },
      wall,
    );
    let snapshot = await store.snapshot(wall);
    expect(snapshot.total).toBe(3);
    expect(snapshot.care.currentAssessment.concern).toBe("Low");
    await store.demo.seed(
      token,
      { id: `worsen-${id}`, runId: id, scenario: "deteriorating" },
      wall,
    );
    snapshot = await store.snapshot(wall);
    expect(snapshot.care.currentAssessment.concern).toBe("High");
    expect(snapshot.care.alerts).toHaveLength(1);
  }
  expect((await store.snapshot(wall, "repeat-1")).total).toBe(6);
  expect((await store.demo.list()).length).toBeGreaterThanOrEqual(4);
});

it("keeps a late AI completion in its original run when a reset happens during inference", async () => {
  const source = (await store.snapshot(wall)).run.id;
  let signalStarted!: () => void;
  let finish!: (value: { observations: [] }) => void;
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  const pending = store.notes.submit(
    token,
    {
      id: "in-flight-note",
      text: "A note being analyzed during reset.",
      runId: source,
    },
    wall,
    {
      model: "controlled-test",
      async extract() {
        signalStarted();
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    },
    () => wall,
  );
  await started;
  await store.demo.reset(
    token,
    { id: "after-inference-reset", scenario: "stable" },
    wall,
  );
  finish({ observations: [] });
  await pending;
  const current = await store.snapshot(wall);
  expect(current.care.notes).toHaveLength(0);
  expect(current.care.alerts).toHaveLength(0);
  const archived = await store.snapshot(wall, source);
  expect(
    archived.care.notes.find((note) => note.id === "in-flight-note")?.status,
  ).toBe("Complete");
});
