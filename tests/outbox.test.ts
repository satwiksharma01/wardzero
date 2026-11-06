import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { Outbox, retryDelay } from "../src/client/outbox";
import { makeReading } from "../src/domain/readings";

const reading = (id: string) =>
  makeReading(0, "stable", new Date("2026-11-07T08:00:00Z"), id);
describe("durable sensor outbox", () => {
  it("preserves queued data while resetting transport controls only for a different run", async () => {
    const queue = new Outbox(`run-${crypto.randomUUID()}`);
    await queue.configureRun("first");
    await queue.enqueue(reading("old-run-data"));
    await queue.setBlocked(true);
    expect((await queue.configureRun("first")).blocked).toBe(true);
    const next = await queue.configureRun("second");
    expect(next.blocked).toBe(false);
    expect(next.pending).toBe(1);
    await queue.close();
  });
  it("survives reopening, retains original times, and removes only confirmed deliveries", async () => {
    const name = `outbox-${crypto.randomUUID()}`;
    const first = new Outbox(name);
    await first.enqueue(reading("a"));
    await first.enqueue(reading("b"));
    await first.setBlocked(true);
    await first.close();
    const reopened = new Outbox(name);
    expect((await reopened.summary()).blocked).toBe(true);
    expect((await reopened.summary()).pending).toBe(2);
    const batch = await reopened.pending(0);
    expect(batch[0].reading.observedAt).toBe("2026-11-07T08:00:00.000Z");
    await reopened.acknowledge(batch, [
      { eventId: "a", status: "accepted" },
      { eventId: "b", status: "conflict", reason: "Changed evidence" },
    ]);
    expect((await reopened.summary()).pending).toBe(0);
    expect((await reopened.summary()).rejected[0].reason).toBe(
      "Changed evidence",
    );
    await reopened.close();
  });
  it("enforces capacity atomically and does not lose entries after an invalid acknowledgement", async () => {
    const queue = new Outbox(`capacity-${crypto.randomUUID()}`, 2);
    await queue.enqueue(reading("one"));
    await queue.enqueue(reading("two"));
    await expect(queue.enqueue(reading("three"))).rejects.toThrow("capacity");
    const batch = await queue.pending(0);
    await expect(
      queue.acknowledge(batch, [{ eventId: "wrong", status: "accepted" }]),
    ).rejects.toThrow();
    expect((await queue.summary()).pending).toBe(2);
    await queue.acknowledge(batch, [
      { eventId: "one", status: "duplicate" },
      { eventId: "two", status: "accepted" },
    ]);
    expect((await queue.summary()).pending).toBe(0);
    expect((await queue.summary()).rejected).toHaveLength(0);
    await queue.close();
  });
  it("backs off failed attempts without resurrecting a confirmed event", async () => {
    const queue = new Outbox(`retry-${crypto.randomUUID()}`);
    await queue.enqueue(reading("retry"));
    const batch = await queue.pending(0);
    await queue.failed(batch, 1000);
    expect(await queue.pending(1000)).toHaveLength(0);
    expect(await queue.pending(2000)).toHaveLength(1);
    await queue.acknowledge(batch, [{ eventId: "retry", status: "accepted" }]);
    await queue.failed(batch, 3000);
    expect((await queue.summary()).pending).toBe(0);
    expect(retryDelay(100)).toBe(30000);
    await queue.close();
  });
});
