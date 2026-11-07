import { expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { ReadingStore } from "../src/server/reading-store";
import { makeReading } from "../src/domain/readings";

it("preserves an interrupted email send across disk reopen and recovers the expired lease", async () => {
  vi.stubEnv("WARDZERO_EMAIL_ENABLED", "true");
  vi.stubEnv("WARDZERO_EMAIL_API_KEY", "fixture-key");
  vi.stubEnv("WARDZERO_EMAIL_FROM", "sender@example.invalid");
  vi.stubEnv("WARDZERO_EMAIL_TO", "recipient@example.invalid");
  const testRoot = path.resolve(".data/tests");
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, "email-persistence-"));
  let db = new PGlite(directory);
  try {
    const start = new Date("2026-11-07T08:00:00Z");
    let store = new ReadingStore(db);
    await store.initialize();
    await store.ingest(
      [makeReading(12, "deteriorating", start, "disk-email")],
      start,
    );
    const due = new Date(start.getTime() + 120000);
    await store.evaluateDeadlines(due);
    const original = await store.notifications.claimDue(due);
    expect(original?.attempts).toBe(1);
    await db.close();
    db = new PGlite(directory);
    store = new ReadingStore(db);
    await store.initialize();
    expect(
      await store.notifications.claimDue(new Date(due.getTime() + 29999)),
    ).toBeNull();
    const recovery = new Date(due.getTime() + 30000);
    const send = vi.fn(async (payload, identity) => {
      expect(payload).toEqual(original?.payload);
      expect(identity).toBe(original?.idempotency_key);
      return { acceptedId: "disk-recovery-accepted" };
    });
    expect(
      await store.notifications.runDue(recovery, { send }, () => recovery),
    ).toEqual({ attempted: 1, accepted: 1 });
    const alert = (await store.snapshot(recovery)).care.alerts[0];
    expect(alert.emailDelivery).toMatchObject({
      state: "Accepted",
      attempts: 2,
      providerReference: "disk-recovery-accepted",
    });
    expect(alert.state).toBe("Open");
    expect(send).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllEnvs();
    await db.close();
    if (
      path.dirname(path.resolve(directory)) !== testRoot ||
      !path.basename(directory).startsWith("email-persistence-")
    )
      throw Error("Unsafe test cleanup path");
    await rm(directory, { recursive: true });
  }
});
