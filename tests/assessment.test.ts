import { describe, expect, it } from "vitest";
import { assess } from "../src/domain/assessment";
import { makeReading, type StoredReading } from "../src/domain/readings";

const now = new Date("2026-11-07T08:00:00Z");
const fixture = (
  steps: number[],
  scenario: "stable" | "deteriorating",
): StoredReading[] =>
  steps.map((step, index) => {
    const reading = makeReading(
      step,
      scenario,
      new Date(now.getTime() - (steps.length - index - 1) * 5000),
      `reading-${index}`,
    );
    return { ...reading, receivedAt: now.toISOString() };
  });

describe("explained synthetic concern", () => {
  it("keeps absent, insufficient, and stale evidence Unknown", () => {
    expect(assess([], now).concern).toBe("Unknown");
    expect(assess(fixture([0], "stable"), now).concern).toBe("Unknown");
    expect(
      assess(fixture([0, 1, 2], "stable"), new Date(now.getTime() + 90000))
        .concern,
    ).toBe("Unknown");
  });
  it("gives Low only with three distinct, recent stable observations", () => {
    const readings = fixture([0, 1, 2], "stable");
    const assessment = assess(readings, now);
    expect(assessment.concern).toBe("Low");
    expect(assessment.reasons[0].eventIds).toEqual(
      readings.map((r) => r.eventId),
    );
    expect(
      assess(
        readings.map((r) => ({ ...r, observedAt: now.toISOString() })),
        now,
      ).concern,
    ).toBe("Unknown");
  });
  it("raises Medium for a combined trend before absolute demo limits", () => {
    const readings = fixture([0, 2, 4], "deteriorating");
    const assessment = assess([...readings].reverse(), now);
    expect(assessment.concern).toBe("Medium");
    expect(assessment.reasons.some((r) => r.code === "combined-trend")).toBe(
      true,
    );
    expect(
      assessment.reasons.find((r) => r.code === "combined-trend")?.message,
    ).toContain("2 percentage points");
  });
  it("raises High immediately at an exact high-concern limit", () => {
    const reading = fixture([0], "stable")[0];
    reading.metrics.oxygenPct = 92;
    const assessment = assess([reading], now);
    expect(assessment.concern).toBe("High");
    expect(assessment.reasons[0].eventIds).toEqual([reading.eventId]);
  });
  it("does not use future or replayed old high readings for current concern", () => {
    const oldHigh = fixture([12], "deteriorating")[0];
    oldHigh.observedAt = new Date(now.getTime() - 121000).toISOString();
    const future = {
      ...oldHigh,
      eventId: "future",
      observedAt: new Date(now.getTime() + 1000).toISOString(),
    };
    expect(assess([oldHigh, future], now).concern).toBe("Unknown");
    expect(
      assess([...fixture([0, 1, 2], "stable"), oldHigh, future], now).concern,
    ).toBe("Low");
  });
});
