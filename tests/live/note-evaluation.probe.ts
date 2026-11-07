import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { configuredNoteProvider } from "../../src/server/note-provider";
import { NOTE_PROMPT_VERSION } from "../../src/domain/notes";
import { noteEvaluationCases } from "../fixtures/note-evaluation";
import { noteConfirmationCases } from "../fixtures/note-confirmation";
import {
  summarizeNoteEvaluation,
  type NoteEvaluationOutcome,
} from "../helpers/note-metrics";

it("measures independently authored synthetic English notes with live Gemini", async () => {
  process.loadEnvFile(".env.local");
  const provider = configuredNoteProvider();
  expect(provider?.model.startsWith("gemini:")).toBe(true);
  const sourceHashes = Object.fromEntries(
    await Promise.all(
      ["src/domain/notes.ts", "src/server/note-provider.ts"].map(
        async (file) => [
          file,
          createHash("sha256")
            .update(await readFile(file))
            .digest("hex"),
        ],
      ),
    ),
  );
  const outcomes: (NoteEvaluationOutcome & {
    text: string;
    rationale: string;
    elapsedMs: number;
    failure?: string;
    partition: "development" | "confirmation";
  })[] = [];
  const fixtures = [
    ...noteEvaluationCases.map((fixture) => ({
      ...fixture,
      partition: "development" as const,
    })),
    ...noteConfirmationCases.map((fixture) => ({
      ...fixture,
      partition: "confirmation" as const,
    })),
  ];
  let lastStart = 0;
  for (const fixture of fixtures) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, lastStart + 5000 - Date.now())),
    );
    lastStart = Date.now();
    const started = Date.now();
    try {
      const result = await provider!.extract(fixture.text);
      outcomes.push({
        ...fixture,
        observations: result.observations,
        status: "Complete",
        elapsedMs: Date.now() - started,
      });
    } catch (error) {
      outcomes.push({
        ...fixture,
        observations: [],
        status: "Failed",
        elapsedMs: Date.now() - started,
        failure:
          error instanceof Error
            ? error.message.slice(0, 400)
            : "Unknown extraction failure",
      });
    }
    if (outcomes.length % 8 === 0)
      console.info(
        `Live note evaluation: ${outcomes.length}/${fixtures.length} complete`,
      );
  }
  outcomes.sort((a, b) => a.id.localeCompare(b.id));
  const summary = summarizeNoteEvaluation(outcomes);
  const report = {
    verifiedAt: new Date().toISOString(),
    runType: "live",
    model: provider!.model,
    promptVersion: NOTE_PROMPT_VERSION,
    suiteVersion: "synthetic-english-v1",
    confirmationVersion: "synthetic-confirmation-v1",
    confirmationSHA256: createHash("sha256")
      .update(JSON.stringify(noteConfirmationCases))
      .digest("hex"),
    fixtureSHA256: createHash("sha256")
      .update(JSON.stringify(noteEvaluationCases))
      .digest("hex"),
    unit: "unique (code, negated, temporality) triples per note; current-positive metrics use code only",
    authorship:
      "Synthetic expectations authored in a fresh context before model output; not authored by a clinician.",
    limitations:
      "Small development evaluation. Used to diagnose and improve this prototype; not a held-out clinical accuracy benchmark. Failures count as missed expected observations and never as correct abstention.",
    concurrency: 1,
    requestSpacingMs: 5000,
    sourceHashes,
    summary,
    developmentSummary: summarizeNoteEvaluation(
      outcomes.filter((outcome) => outcome.partition === "development"),
    ),
    confirmationSummary: summarizeNoteEvaluation(
      outcomes.filter((outcome) => outcome.partition === "confirmation"),
    ),
    cases: outcomes,
  };
  await mkdir("documents/verification", { recursive: true });
  await writeFile(
    `documents/verification/note-evaluation-${NOTE_PROMPT_VERSION}.json`,
    JSON.stringify(report, null, 2),
  );
  expect(summary.completed).toBeGreaterThan(0);
  expect(summary.unsupportedCurrentPositiveCases).toEqual([]);
});
