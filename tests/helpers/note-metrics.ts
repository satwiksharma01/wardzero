import type { Observation } from "../../src/domain/notes";

export type ObservationLabel = Pick<
  Observation,
  "code" | "negated" | "temporality"
>;
export type NoteEvaluationOutcome = {
  id: string;
  category: string;
  expected: ObservationLabel[];
  observations: ObservationLabel[];
  status: "Complete" | "Failed";
};
const key = (label: ObservationLabel) =>
  `${label.code}/${label.negated}/${label.temporality}`;
const positive = (labels: ObservationLabel[]) =>
  labels
    .filter((label) => !label.negated && label.temporality === "current")
    .map((label) => label.code);
const counts = () => ({ truePositive: 0, falsePositive: 0, falseNegative: 0 });
type Counts = ReturnType<typeof counts>;
function addCounts(target: Counts, expected: Set<string>, actual: Set<string>) {
  target.truePositive += [...actual].filter((label) =>
    expected.has(label),
  ).length;
  target.falsePositive += [...actual].filter(
    (label) => !expected.has(label),
  ).length;
  target.falseNegative += [...expected].filter(
    (label) => !actual.has(label),
  ).length;
}
function withRates(value: Counts) {
  const predicted = value.truePositive + value.falsePositive;
  const expected = value.truePositive + value.falseNegative;
  return {
    ...value,
    precision: predicted ? value.truePositive / predicted : null,
    recall: expected ? value.truePositive / expected : null,
  };
}

export function summarizeNoteEvaluation(outcomes: NoteEvaluationOutcome[]) {
  const all = counts();
  const current = counts();
  let failures = 0,
    abstentions = 0,
    correctAbstentions = 0,
    exactCases = 0;
  const unsupportedCurrentPositiveCases: string[] = [];
  const byCategory: Record<
    string,
    {
      cases: number;
      failures: number;
      exactCases: number;
      unsupportedCurrentPositiveCases: number;
    }
  > = {};
  for (const outcome of outcomes) {
    const group = (byCategory[outcome.category] ??= {
      cases: 0,
      failures: 0,
      exactCases: 0,
      unsupportedCurrentPositiveCases: 0,
    });
    group.cases++;
    const actual = outcome.status === "Complete" ? outcome.observations : [];
    const expectedKeys = new Set(outcome.expected.map(key));
    const actualKeys = new Set(actual.map(key));
    addCounts(all, expectedKeys, actualKeys);
    const expectedPositive = new Set(positive(outcome.expected));
    const actualPositive = new Set(positive(actual));
    addCounts(current, expectedPositive, actualPositive);
    if ([...actualPositive].some((code) => !expectedPositive.has(code))) {
      unsupportedCurrentPositiveCases.push(outcome.id);
      group.unsupportedCurrentPositiveCases++;
    }
    if (outcome.status === "Failed") {
      failures++;
      group.failures++;
      continue;
    }
    if (!actual.length) {
      abstentions++;
      if (!outcome.expected.length) correctAbstentions++;
    }
    if (
      expectedKeys.size === actualKeys.size &&
      [...expectedKeys].every((label) => actualKeys.has(label))
    ) {
      exactCases++;
      group.exactCases++;
    }
  }
  return {
    cases: outcomes.length,
    completed: outcomes.length - failures,
    failures,
    abstentions,
    correctAbstentions,
    exactCases,
    unsupportedCurrentPositiveCases,
    allObservations: withRates(all),
    currentPositive: withRates(current),
    byCategory,
  };
}
