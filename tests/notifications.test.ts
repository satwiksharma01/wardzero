import { afterEach, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { ReadingStore } from "../src/server/reading-store";
import { makeReading } from "../src/domain/readings";
import {
  NotificationStore,
  readEmailDeliveries,
} from "../src/server/notification-store";
import {
  EmailFailure,
  createEmailProvider,
} from "../src/server/email-provider";

const databases: PGlite[] = [];
afterEach(async () => {
  for (const db of databases.splice(0)) await db.close();
  vi.unstubAllEnvs();
});
async function setup(enabled = true) {
  vi.stubEnv("WARDZERO_EMAIL_ENABLED", String(enabled));
  vi.stubEnv("WARDZERO_EMAIL_API_KEY", "fixture-key");
  vi.stubEnv("WARDZERO_EMAIL_FROM", "sender@example.invalid");
  vi.stubEnv("WARDZERO_EMAIL_TO", "recipient@example.invalid");
  const db = new PGlite();
  databases.push(db);
  const readings = new ReadingStore(db);
  await readings.initialize();
  const start = new Date("2026-11-07T08:00:00Z");
  await readings.ingest(
    [makeReading(12, "deteriorating", start, "email-source")],
    start,
  );
  const now = new Date(start.getTime() + 120000);
  await Promise.all([
    readings.evaluateDeadlines(now),
    readings.evaluateDeadlines(now),
  ]);
  const alert = (await readings.snapshot(now)).care.alerts[0];
  const queue = new NotificationStore(db);
  const state = async () =>
    (await readEmailDeliveries(db, [alert.id])).get(alert.id)!;
  return { db, readings, now, alert, queue, state };
}

it("persists one disabled job per escalation and never sends disabled history later", async () => {
  const { db, queue, now, state } = await setup(false);
  expect((await state()).state).toBe("Disabled");
  const send = vi.fn(async () => ({ acceptedId: "must-not-send" }));
  await queue.runDue(now, { send }, () => now);
  expect(send).not.toHaveBeenCalled();
  expect(
    (
      await db.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM notification_jobs",
      )
    ).rows[0].count,
  ).toBe(1);
});

it("retries a lost acknowledgement with the exact key/payload and keeps provider acceptance separate from care", async () => {
  const { queue, now, state, readings } = await setup();
  const requests: { payload: unknown; key: string }[] = [];
  const provider = {
    async send(payload: unknown, key: string) {
      requests.push({ payload, key });
      if (requests.length === 1)
        throw new EmailFailure(true, "network_or_timeout");
      return { acceptedId: "accepted-once" };
    },
  };
  await queue.runDue(now, provider, () => now);
  expect((await state()).state).toBe("Retry");
  await queue.runDue(new Date(now.getTime() + 999), provider, () => now);
  expect(requests).toHaveLength(1);
  const retryAt = new Date(now.getTime() + 1000);
  await queue.runDue(retryAt, provider, () => retryAt);
  expect(requests[0]).toEqual(requests[1]);
  expect(await state()).toMatchObject({
    state: "Accepted",
    attempts: 2,
    providerReference: "accepted-once",
  });
  expect((await readings.snapshot(retryAt)).care.alerts[0].state).toBe("Open");
  await queue.runDue(new Date(now.getTime() + 10000), provider, () => now);
  expect(requests).toHaveLength(2);
});

it("stops permanent failures and never retries beyond the provider idempotency window", async () => {
  const first = await setup();
  await first.queue.runDue(
    first.now,
    {
      async send() {
        throw new EmailFailure(false, "http_401");
      },
    },
    () => first.now,
  );
  expect(await first.state()).toMatchObject({
    state: "Failed",
    attempts: 1,
    errorCode: "http_401",
  });
  const second = await setup();
  const late = new Date(second.now.getTime() + 23 * 3600000);
  const send = vi.fn(async () => ({ acceptedId: "too-late" }));
  await second.queue.runDue(late, { send }, () => late);
  expect(send).not.toHaveBeenCalled();
  expect(await second.state()).toMatchObject({
    state: "Failed",
    errorCode: "idempotency_window_expired",
  });
});

it("recovers provider acceptance after an in-flight idempotency conflict with the same request", async () => {
  const { queue, now, state } = await setup();
  const requests: { key: string | null; body: BodyInit | null | undefined }[] =
    [];
  const provider = createEmailProvider(
    {
      apiKey: "fixture-key",
      from: "sender@example.invalid",
      to: "recipient@example.invalid",
    },
    async (_url, init) => {
      requests.push({
        key: new Headers(init?.headers).get("Idempotency-Key"),
        body: init?.body,
      });
      return requests.length === 1
        ? Response.json(
            { name: "concurrent_idempotent_requests" },
            { status: 409 },
          )
        : Response.json({ id: "concurrent-accepted" });
    },
  );
  await queue.runDue(now, provider, () => now);
  expect((await state()).state).toBe("Retry");
  const retry = new Date(now.getTime() + 1000);
  await queue.runDue(retry, provider, () => retry);
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(await state()).toMatchObject({
    state: "Accepted",
    attempts: 2,
    providerReference: "concurrent-accepted",
  });
});

it("recovers an expired send lease with the same identity and caps transient attempts", async () => {
  const { queue, now, state } = await setup();
  const claim = await queue.claimDue(now);
  expect(claim).not.toBeNull();
  expect(await queue.claimDue(new Date(now.getTime() + 29999))).toBeNull();
  const recovered = await queue.claimDue(new Date(now.getTime() + 30000));
  expect(recovered?.idempotency_key).toBe(claim?.idempotency_key);
  expect(recovered?.payload).toEqual(claim?.payload);
  expect(recovered?.attempts).toBe(2);
  for (let hour = 1; hour <= 6; hour++) {
    const time = new Date(now.getTime() + hour * 3600000);
    await queue.runDue(
      time,
      {
        async send() {
          throw new EmailFailure(true, "http_503");
        },
      },
      () => time,
    );
  }
  expect(await state()).toMatchObject({ state: "Failed", attempts: 6 });
});

it("cancels pending delivery after acknowledgement or archive and uses wall time rather than demo offset", async () => {
  const first = await setup();
  const { token } = await first.readings.care.createSession(
    "primary",
    first.now,
  );
  await first.readings.care.recordEvent(
    first.alert.id,
    token,
    { eventId: "email-ack", action: "acknowledge" },
    first.now,
  );
  const send = vi.fn(async () => ({ acceptedId: "obsolete" }));
  await first.queue.runDue(first.now, { send }, () => first.now);
  expect(await first.state()).toMatchObject({
    state: "Cancelled",
    attempts: 0,
  });
  expect(send).not.toHaveBeenCalled();
  const second = await setup();
  const actor = await second.readings.care.createSession("primary", second.now);
  await second.readings.demo.advance(
    actor.token,
    { id: "email-clock", runId: "local", seconds: 3600 },
    second.now,
  );
  await second.queue.runDue(
    second.now,
    {
      async send() {
        throw new EmailFailure(true, "http_503", 30000);
      },
    },
    () => second.now,
  );
  expect(Date.parse((await second.state()).nextAttemptAt!)).toBe(
    second.now.getTime() + 30000,
  );
  await second.readings.demo.reset(
    actor.token,
    { id: "email-new-run", scenario: "stable" },
    second.now,
  );
  await second.queue.runDue(
    new Date(second.now.getTime() + 30000),
    { send },
    () => second.now,
  );
  expect((await second.state()).state).toBe("Cancelled");
});

it("maintains closed and expired jobs while the provider is disabled without claiming live work", async () => {
  const first = await setup();
  await first.queue.runDue(first.now, null, () => first.now);
  expect(await first.state()).toMatchObject({ state: "Pending", attempts: 0 });
  const { token } = await first.readings.care.createSession(
    "primary",
    first.now,
  );
  await first.readings.care.recordEvent(
    first.alert.id,
    token,
    { eventId: "disabled-email-ack", action: "acknowledge" },
    first.now,
  );
  await first.queue.runDue(first.now, null, () => first.now);
  expect(await first.state()).toMatchObject({
    state: "Cancelled",
    attempts: 0,
  });
  const second = await setup();
  const expired = new Date(second.now.getTime() + 23 * 3600000);
  await second.queue.runDue(expired, null, () => expired);
  expect(await second.state()).toMatchObject({
    state: "Failed",
    attempts: 0,
    errorCode: "idempotency_window_expired",
  });
});
