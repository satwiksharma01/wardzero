import { describe, expect, it } from "vitest";
import {
  makeReading,
  readingSchema,
  monitoringStatus,
} from "../src/domain/readings";

const now = new Date("2026-11-07T08:00:00.000Z");

describe("sensor contract and time", () => {
  it("reproduces stable values for the same scenario step", () => {
    const first = makeReading(3, "stable", now, "event-1");
    expect(first).toEqual(makeReading(3, "stable", now, "event-1"));
    expect(readingSchema.safeParse(first).success).toBe(true);
    expect(first.metrics.oxygenPct).toBeGreaterThanOrEqual(97);
  });
  it("produces progressively deteriorating synthetic signals", () => {
    const first = makeReading(0, "deteriorating", now, "start");
    const last = makeReading(10, "deteriorating", now, "end");
    expect(last.metrics.oxygenPct).toBeLessThan(first.metrics.oxygenPct);
    expect(last.metrics.pulseBpm).toBeGreaterThan(first.metrics.pulseBpm);
  });
  it("rejects invalid units, impossible measurements, and unrelated patient IDs", () => {
    const event = makeReading(0, "stable", now, "event-1");
    expect(
      readingSchema.safeParse({
        ...event,
        metrics: { ...event.metrics, oxygenPct: 110 },
      }).success,
    ).toBe(false);
    expect(
      readingSchema.safeParse({ ...event, patientId: "another-patient" })
        .success,
    ).toBe(false);
    expect(
      readingSchema.safeParse({ ...event, units: "fahrenheit" }).success,
    ).toBe(false);
  });
  it("makes missing, delayed, and offline evidence explicit at boundaries", () => {
    expect(monitoringStatus(null, now)).toBe("Waiting");
    expect(monitoringStatus(now.toISOString(), now)).toBe("Current");
    expect(
      monitoringStatus(new Date(now.getTime() - 30000).toISOString(), now),
    ).toBe("Delayed");
    expect(
      monitoringStatus(new Date(now.getTime() - 90000).toISOString(), now),
    ).toBe("Offline");
  });
});
