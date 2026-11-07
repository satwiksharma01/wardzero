import { expect, it } from "vitest";
import { replayEarlyWarning } from "./helpers/early-warning-run";
import { expectedEarlyWarning } from "./fixtures/early-warning";
import type { NoteProvider } from "../src/server/note-provider";

const provider: NoteProvider = {
  model: "explicit-deterministic-fixture",
  async extract(text) {
    const negated = text.includes("not tired");
    const historical = text.includes("last week");
    return {
      observations: [
        {
          code: "fatigue",
          excerpt: negated
            ? "She is not tired today"
            : historical
              ? "She was tired last week"
              : "More tired today",
          negated,
          temporality: historical ? "historical" : "current",
        },
        {
          code: "reduced_intake",
          excerpt: negated
            ? "Her intake is not reduced today"
            : historical
              ? "barely ate lunch during that visit"
              : "barely ate lunch",
          negated,
          temporality: historical ? "historical" : "current",
        },
      ],
    };
  },
};

it("stores explained concern before individual thresholds and computes synthetic lead from actual events", async () => {
  const full = await replayEarlyWarning("current-note", provider);
  expect(full.firstConcernSecond).toBe(
    expectedEarlyWarning.fullFirstConcernSecond,
  );
  expect(full.firstBothSourcesSecond).toBe(
    expectedEarlyWarning.firstBothSourcesSecond,
  );
  expect(full.individualMarkerSecond).toBe(
    expectedEarlyWarning.individualMarkerSecond,
  );
  expect(full.leadSeconds).toBe(expectedEarlyWarning.fullLeadSeconds);
  expect(full.firstAlertOpenedSecond).toBe(15);
  expect(full.alertCount).toBe(1);
  expect(full.noteStatus).toBe("Complete");
  expect(
    full.steps
      .find((step) => step.second === 20)
      ?.reasons.map((reason) => reason.code),
  ).toEqual(expect.arrayContaining(["combined-trend", "caregiver-context"]));
  expect(
    full.steps
      .find((step) => step.second === 15)
      ?.reasons.flatMap((reason) => reason.noteIds ?? []),
  ).toContain("early-current-note-observation");
});

it("keeps trend, negative/history, stable, and failed-analysis controls explicit", async () => {
  for (const variant of [
    "no-note",
    "negated-note",
    "historical-note",
    "failed-note",
  ] as const) {
    const result = await replayEarlyWarning(
      variant,
      variant === "failed-note"
        ? {
            model: "explicit-failure-fixture",
            async extract() {
              throw Error("Fixture failure");
            },
          }
        : provider,
    );
    expect(result.firstConcernSecond).toBe(20);
    expect(result.leadSeconds).toBe(40);
    expect(result.steps.find((step) => step.second === 15)?.concern).toBe(
      "Low",
    );
  }
  for (const variant of [
    "stable",
    "stable-negated",
    "stable-historical",
  ] as const) {
    const result = await replayEarlyWarning(variant, provider);
    expect(result.firstConcernSecond).toBeNull();
    expect(result.leadSeconds).toBeNull();
    expect(result.alertCount).toBe(0);
  }
  const noteOnly = await replayEarlyWarning("stable-current", provider);
  expect(noteOnly.firstConcernSecond).toBe(15);
  expect(noteOnly.individualMarkerSecond).toBeNull();
  expect(noteOnly.leadSeconds).toBeNull();
});
