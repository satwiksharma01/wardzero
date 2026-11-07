import { expect, it } from "vitest";
import { summarizeNoteEvaluation } from "./helpers/note-metrics";

const fatigue = {
  code: "fatigue",
  negated: false,
  temporality: "current",
} as const;
const breathlessness = {
  code: "breathlessness",
  negated: false,
  temporality: "current",
} as const;

it("counts false positives, misses, duplicate labels, and wrong temporal context explicitly", () => {
  const report = summarizeNoteEvaluation([
    {
      id: "correct",
      category: "positive",
      expected: [fatigue],
      observations: [fatigue, fatigue],
      status: "Complete",
    },
    {
      id: "wrong",
      category: "positive",
      expected: [fatigue],
      observations: [breathlessness],
      status: "Complete",
    },
    {
      id: "history",
      category: "historical",
      expected: [{ ...fatigue, temporality: "historical" }],
      observations: [fatigue],
      status: "Complete",
    },
  ]);
  expect(report.allObservations).toEqual({
    truePositive: 1,
    falsePositive: 2,
    falseNegative: 2,
    precision: 1 / 3,
    recall: 1 / 3,
  });
  expect(report.currentPositive).toEqual({
    truePositive: 1,
    falsePositive: 2,
    falseNegative: 1,
    precision: 1 / 3,
    recall: 1 / 2,
  });
  expect(report.exactCases).toBe(1);
  expect(report.unsupportedCurrentPositiveCases).toEqual(["wrong", "history"]);
});

it("counts provider failures as misses, never as successful abstention or exact cases", () => {
  const report = summarizeNoteEvaluation([
    {
      id: "failed-positive",
      category: "positive",
      expected: [fatigue],
      observations: [],
      status: "Failed",
    },
    {
      id: "failed-empty",
      category: "ambiguous",
      expected: [],
      observations: [],
      status: "Failed",
    },
    {
      id: "abstain",
      category: "ambiguous",
      expected: [],
      observations: [],
      status: "Complete",
    },
  ]);
  expect(report.failures).toBe(2);
  expect(report.abstentions).toBe(1);
  expect(report.correctAbstentions).toBe(1);
  expect(report.exactCases).toBe(1);
  expect(report.currentPositive).toEqual({
    truePositive: 0,
    falsePositive: 0,
    falseNegative: 1,
    precision: null,
    recall: 0,
  });
  expect(report.byCategory.ambiguous).toMatchObject({
    cases: 2,
    failures: 1,
    exactCases: 1,
  });
});
