import { expect, it } from "vitest";
import type { CareNote } from "../src/domain/notes";
import type { Assessment } from "../src/domain/assessment";
import { noteEvidenceUse } from "../src/domain/evidence";

const now = new Date("2026-11-07T08:00:00Z");
const note: CareNote = {
  id: "note-evidence",
  text: "More tired today.",
  authorId: "caregiver-primary",
  authorName: "Ananya",
  recordedAt: now.toISOString(),
  status: "Complete",
  observations: [
    {
      code: "fatigue",
      excerpt: "More tired today",
      negated: false,
      temporality: "current",
    },
  ],
  model: "fixture",
  promptVersion: "notes-v2",
  failureReason: null,
};
const assessment: Assessment = {
  concern: "Medium",
  ruleVersion: "fixture",
  evaluatedAt: now.toISOString(),
  latestObservedAt: now.toISOString(),
  reasons: [
    {
      code: "caregiver-context",
      message: "Recorded context",
      eventIds: [],
      noteIds: [note.id],
    },
  ],
};

it("distinguishes contribution, no contribution, abstention, negative history, and missing fresh vitals", () => {
  expect(noteEvidenceUse(note, now, assessment)).toBe(
    "Contributes to current concern",
  );
  expect(
    noteEvidenceUse(note, now, { ...assessment, concern: "Low", reasons: [] }),
  ).toBe("Current context; no concern rule triggered");
  expect(noteEvidenceUse({ ...note, observations: [] }, now, assessment)).toBe(
    "Abstained; no supported observation extracted",
  );
  expect(
    noteEvidenceUse(
      { ...note, observations: [{ ...note.observations[0], negated: true }] },
      now,
      assessment,
    ),
  ).toBe("Excluded; negated or historical observations only");
  expect(
    noteEvidenceUse(note, now, { ...assessment, concern: "Unknown" }),
  ).toBe("Fresh vital evidence required before applying context");
});

it("never labels failed, stale, future, or disconnected evidence as contributing", () => {
  expect(noteEvidenceUse({ ...note, status: "Failed" }, now, assessment)).toBe(
    "Not applied; analysis is Failed",
  );
  expect(
    noteEvidenceUse(note, new Date(now.getTime() + 120000), assessment),
  ).toBe("Stale; outside the 120-second context window");
  expect(
    noteEvidenceUse(note, new Date(now.getTime() + 119999), assessment),
  ).toBe("Contributes to current concern");
  expect(noteEvidenceUse(note, new Date(now.getTime() - 1), assessment)).toBe(
    "Not yet eligible; recorded time is ahead",
  );
  expect(noteEvidenceUse(note, now, assessment, true)).toBe(
    "Last known analysis; reconnect to confirm use",
  );
});
