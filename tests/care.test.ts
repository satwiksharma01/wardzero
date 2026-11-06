import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { ReadingStore } from "../src/server/reading-store";
import { CareStore } from "../src/server/care-store";
import { makeReading } from "../src/domain/readings";

const now = new Date("2026-11-07T08:00:00Z");
let db: PGlite;
let readings: ReadingStore;
let care: CareStore;
let token: string;
let alertId: string;
beforeAll(async () => {
  db = new PGlite();
  readings = new ReadingStore(db);
  care = new CareStore(db);
  await readings.initialize();
  token = (await care.createSession("primary", now)).token;
});
afterAll(async () => {
  await db?.close();
});

describe("transactional care loop", () => {
  it("creates one episode with persisted assessment despite concurrent retries", async () => {
    const event = makeReading(12, "deteriorating", now, "alert-source");
    await Promise.all([
      readings.ingest([event], now),
      readings.ingest([event], now),
    ]);
    const snapshot = await readings.snapshot(now);
    expect(snapshot.care.currentAssessment.concern).toBe("High");
    expect(snapshot.care.alerts).toHaveLength(1);
    alertId = snapshot.care.alerts[0].id;
    expect(snapshot.care.alerts[0].state).toBe("Open");
    expect(snapshot.care.alerts[0].assessment.reasons[0].eventIds).toContain(
      "alert-source",
    );
  });
  it("blocks anonymous, forged, expired and unassigned sessions", async () => {
    expect(await care.actorForSession("forged", now)).toBeNull();
    expect(
      await care.actorForSession(token, new Date(now.getTime() + 8 * 3600000)),
    ).toBeNull();
    await expect(
      care.recordEvent(
        alertId,
        null,
        { eventId: "anonymous", action: "acknowledge" },
        now,
      ),
    ).rejects.toMatchObject({ status: 401 });
    const backup = (await care.createSession("backup", now)).token;
    await expect(
      care.recordEvent(
        alertId,
        backup,
        { eventId: "unassigned", action: "acknowledge" },
        now,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("requires acknowledgement and action before resolution", async () => {
    await expect(
      care.recordEvent(
        alertId,
        token,
        { eventId: "too-soon", action: "resolve", text: "Checked" },
        now,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await care.recordEvent(
      alertId,
      token,
      { eventId: "ack", action: "acknowledge" },
      now,
    );
    expect((await readings.snapshot(now)).care.alerts[0].state).toBe(
      "Acknowledged",
    );
    await expect(
      care.recordEvent(
        alertId,
        token,
        { eventId: "no-action", action: "resolve", text: "Checked" },
        now,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await care.recordEvent(
      alertId,
      token,
      {
        eventId: "action",
        action: "record-action",
        text: "Contacted the care coordinator and recorded the review.",
      },
      now,
    );
    await care.recordEvent(
      alertId,
      token,
      {
        eventId: "resolve",
        action: "resolve",
        text: "Coordinator reviewed the simulated scenario.",
      },
      now,
    );
    const episode = (await readings.snapshot(now)).care.alerts[0];
    expect(episode.state).toBe("Resolved");
    expect(
      episode.events.filter((e) => e.actorId === "caregiver-primary"),
    ).toHaveLength(3);
    expect((await readings.snapshot(now)).care.currentAssessment.concern).toBe(
      "High",
    );
  });
  it("deduplicates action retries and rejects identity reuse with changed text", async () => {
    expect(
      (
        await care.recordEvent(
          alertId,
          token,
          {
            eventId: "resolve",
            action: "resolve",
            text: "Coordinator reviewed the simulated scenario.",
          },
          now,
        )
      ).status,
    ).toBe("duplicate");
    await expect(
      care.recordEvent(
        alertId,
        token,
        { eventId: "resolve", action: "resolve", text: "Different reason" },
        now,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("does not reopen on replayed evidence but opens on newer concern", async () => {
    await readings.ingest(
      [
        makeReading(
          12,
          "deteriorating",
          new Date(now.getTime() - 1000),
          "late-high",
        ),
      ],
      now,
    );
    expect((await readings.snapshot(now)).care.alerts).toHaveLength(1);
    const later = new Date(now.getTime() + 10000);
    await readings.ingest(
      [makeReading(12, "deteriorating", later, "new-high")],
      later,
    );
    expect((await readings.snapshot(later)).care.alerts).toHaveLength(2);
  });
  it("keeps last assessment and unresolved alert when monitoring goes stale", async () => {
    const snapshot = await readings.snapshot(new Date(now.getTime() + 100000));
    expect(snapshot.monitoring).toBe("Offline");
    expect(snapshot.care.currentAssessment.concern).toBe("Unknown");
    expect(snapshot.care.lastAssessment?.concern).toBe("High");
    expect(snapshot.care.alerts[0].state).toBe("Open");
  });
});
