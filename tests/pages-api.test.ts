import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { ReadingStore } from "../src/server/reading-store";
import { createDemoApi } from "../src/pages-demo/api";
import { SAMPLE_NOTE } from "../src/pages-demo/note-fixture";
import { sha256 } from "../src/domain/crypto";

let db: PGlite;
let api: typeof fetch;
let token: string | null = null;
const now = new Date("2026-11-08T08:00:00Z");
beforeAll(async () => {
  db = new PGlite();
  const store = new ReadingStore(db);
  await store.initialize();
  api = createDemoApi(
    async () => store,
    {
      get: () => token,
      set: (value) => {
        token = value;
      },
    },
    () => now,
  );
});
afterAll(async () => {
  await db.close();
});
const post = (path: string, body: unknown) =>
  api(path, { method: "POST", body: JSON.stringify(body) });

it("keeps SHA-256 session and command identities compatible with the Node implementation", async () => {
  for (const value of ["", "sample-command", "a".repeat(64), "नर्स"])
    expect(await sha256(value)).toBe(
      createHash("sha256").update(value).digest("hex"),
    );
});

it("runs the care flow through browser transport without live AI or external delivery", async () => {
  expect(
    (
      await post("/api/demo", {
        action: "reset",
        id: "pages-run",
        scenario: "stable",
      })
    ).status,
  ).toBe(401);
  expect((await post("/api/demo/session", { role: "primary" })).status).toBe(
    200,
  );
  expect(
    (
      await post("/api/demo", {
        action: "seed",
        id: "baseline",
        runId: "local",
        scenario: "stable",
      })
    ).status,
  ).toBe(200);
  expect(
    (await (await api("/api/patient")).json()).care.currentAssessment.concern,
  ).toBe("Low");
  const example = await (
    await post("/api/notes", { id: "sample", text: SAMPLE_NOTE })
  ).json();
  expect(example.note).toMatchObject({
    status: "Complete",
    model: "demo:fixed-example (not live AI)",
  });
  const custom = await (
    await post("/api/notes", {
      id: "custom",
      text: "Patient is tired and confused today.",
    })
  ).json();
  expect(custom.note).toMatchObject({
    status: "Unavailable",
    observations: [],
    model: null,
  });
  const snapshot = await (await api("/api/patient")).json();
  expect(snapshot.care.currentAssessment.concern).toBe("Medium");
  const alert = snapshot.care.alerts[0].id;
  await post("/api/demo/session", { role: "backup" });
  expect(
    (
      await post(`/api/alerts/${alert}/events`, {
        action: "acknowledge",
        eventId: "too-early",
      })
    ).status,
  ).toBe(403);
  await post("/api/demo/session", { role: "primary" });
  await post("/api/demo", {
    action: "advance",
    id: "deadline",
    runId: "local",
    seconds: 130,
  });
  await post("/api/demo/session", { role: "backup" });
  expect(
    (
      await post(`/api/alerts/${alert}/events`, {
        action: "acknowledge",
        eventId: "ack",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await post(`/api/alerts/${alert}/events`, {
        action: "record-action",
        eventId: "act",
        text: "Reviewed the synthetic patient context.",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await post(`/api/alerts/${alert}/events`, {
        action: "resolve",
        eventId: "resolve",
        text: "Demo review completed and documented.",
      })
    ).status,
  ).toBe(200);
  const resolved = (await (await api("/api/patient")).json()).care.alerts[0];
  expect(resolved.state).toBe("Resolved");
  expect(resolved.emailDelivery.state).toBe("Disabled");
});

it("rejects malformed, oversized, unknown and unauthorized browser commands", async () => {
  expect(
    (await post("/api/demo/session", { role: "administrator" })).status,
  ).toBe(400);
  expect((await api("/api/demo", { method: "POST", body: "{" })).status).toBe(
    400,
  );
  expect(
    (await api("/api/notes", { method: "POST", body: "x".repeat(128001) }))
      .status,
  ).toBe(400);
  expect((await post("/api/readings/batch", { readings: [] })).status).toBe(
    400,
  );
  expect((await api("/api/missing")).status).toBe(404);
  expect(
    (
      await post("/api/demo", {
        action: "reset",
        id: "forbidden",
        scenario: "stable",
      })
    ).status,
  ).toBe(403);
});

it("releases callers when browser database startup never finishes", async () => {
  const unavailable = createDemoApi(() => new Promise(() => {}), {
    get: () => null,
    set: () => {},
  });
  const controller = new AbortController();
  const pending = unavailable("/api/patient", { signal: controller.signal });
  controller.abort(new DOMException("Startup timed out", "TimeoutError"));
  await expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
  await expect(
    unavailable("/api/patient", { signal: controller.signal }),
  ).rejects.toMatchObject({ name: "TimeoutError" });
});
