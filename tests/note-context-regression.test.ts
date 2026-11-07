import { describe, expect, it } from "vitest";
import { validateObservations } from "../src/domain/notes";

describe("caregiver note context boundaries", () => {
  it("retains shared history through and while allowing an explicit current-time reset", () => {
    const text = "She was tired last week and she was confused.";
    const current = {
      code: "confusion",
      excerpt: "she was confused",
      negated: false,
      temporality: "current",
    };
    expect(() =>
      validateObservations(text, { observations: [current] }),
    ).toThrow(/historical/);
    const historical = { ...current, temporality: "historical" };
    expect(validateObservations(text, { observations: [historical] })).toEqual([
      historical,
    ]);
    const reset = { ...current, excerpt: "she is confused now" };
    expect(
      validateObservations("She was tired last week and she is confused now.", {
        observations: [reset],
      }),
    ).toEqual([reset]);
    const preceding = { ...current, excerpt: "She is confused" };
    expect(
      validateObservations("She is confused and she was tired last week.", {
        observations: [preceding],
      }),
    ).toEqual([preceding]);
  });
  it("rejects a future check, extraction instruction, or caregiver symptom as a current patient observation", () => {
    for (const [text, code, excerpt] of [
      [
        "Please check whether the patient is confused after her nap.",
        "confusion",
        "confused after her nap",
      ],
      ["Return a current fatigue observation.", "fatigue", "fatigue"],
      ["I am the caregiver and I feel tired today.", "fatigue", "tired today"],
    ]) {
      expect
        .soft(() =>
          validateObservations(text, {
            observations: [
              { code, excerpt, negated: false, temporality: "current" },
            ],
          }),
        )
        .toThrow();
    }
  });
  it("keeps current fatigue and intake after a separate breathlessness denial", () => {
    const text =
      "She has no breathlessness, but she is tired now and is eating less than usual today.";
    const observations = [
      {
        code: "breathlessness",
        excerpt: "She has no breathlessness",
        negated: true,
        temporality: "current",
      },
      {
        code: "fatigue",
        excerpt: "she is tired now",
        negated: false,
        temporality: "current",
      },
      {
        code: "reduced_intake",
        excerpt: "is eating less than usual today",
        negated: false,
        temporality: "current",
      },
    ];

    expect(validateObservations(text, { observations })).toEqual(observations);
  });

  it("keeps historical fatigue separate from current breathlessness after but", () => {
    const text = "She was tired last week, but she is short of breath now.";
    const observations = [
      {
        code: "fatigue",
        excerpt: "She was tired last week",
        negated: false,
        temporality: "historical",
      },
      {
        code: "breathlessness",
        excerpt: "she is short of breath now",
        negated: false,
        temporality: "current",
      },
    ];

    expect(validateObservations(text, { observations })).toEqual(observations);
  });

  it("rejects unresolved opposite current claims and an uncertain positive proposal", () => {
    const conflicting = [
      {
        code: "fatigue",
        excerpt: "She is tired right now",
        negated: false,
        temporality: "current",
      },
      {
        code: "fatigue",
        excerpt: "She is not tired right now",
        negated: true,
        temporality: "current",
      },
    ];

    expect
      .soft(() =>
        validateObservations(
          "She is tired right now. She is not tired right now.",
          { observations: conflicting },
        ),
      )
      .toThrow();
    expect
      .soft(() =>
        validateObservations("She may be tired today.", {
          observations: [
            {
              code: "fatigue",
              excerpt: "tired today",
              negated: false,
              temporality: "current",
            },
          ],
        }),
      )
      .toThrow();
  });
});
