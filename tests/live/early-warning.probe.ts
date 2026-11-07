import { expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { configuredNoteProvider } from "../../src/server/note-provider";
import {
  replayEarlyWarning,
  type EarlyWarningVariant,
} from "../helpers/early-warning-run";
import { expectedEarlyWarning } from "../fixtures/early-warning";

it("records actual live-note early warning and its synthetic control runs", async () => {
  process.loadEnvFile(".env.local");
  const live = configuredNoteProvider();
  expect(live?.model.startsWith("gemini:")).toBe(true);
  let lastCall = Date.now();
  const paced = {
    model: live!.model,
    async extract(text: string) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, lastCall + 5000 - Date.now())),
      );
      lastCall = Date.now();
      return live!.extract(text);
    },
  };
  const variants: EarlyWarningVariant[] = [
    "current-note",
    "no-note",
    "negated-note",
    "historical-note",
    "stable",
    "stable-negated",
    "stable-historical",
    "stable-current",
  ];
  const results = [];
  for (const variant of variants) {
    const result = await replayEarlyWarning(variant, paced);
    results.push({
      ...result,
      providerMode: result.noteModel ? "live-request" : "not-called",
    });
  }
  await mkdir("documents/verification", { recursive: true });
  await writeFile(
    "documents/verification/early-warning-live.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        synthetic: true,
        model: live!.model,
        inferenceWallTimeExcluded: true,
        expected: expectedEarlyWarning,
        results,
        limitation:
          "Authored engineering scenario, not clinical validation, field warning time, or a 24–48-hour prediction.",
      },
      null,
      2,
    ),
  );
  const full = results.find((result) => result.variant === "current-note")!;
  expect(full.noteStatus).toBe("Complete");
  expect(full.firstConcernSecond).toBe(15);
  expect(full.firstBothSourcesSecond).toBe(20);
  expect(full.individualMarkerSecond).toBe(60);
  expect(full.leadSeconds).toBe(45);
  for (const result of results.filter((result) => result.noteStatus !== null))
    expect(result.noteStatus).toBe("Complete");
  for (const variant of ["no-note", "negated-note", "historical-note"])
    expect(
      results.find((result) => result.variant === variant)?.firstConcernSecond,
    ).toBe(20);
  for (const variant of ["stable", "stable-negated", "stable-historical"])
    expect(
      results.find((result) => result.variant === variant)?.alertCount,
    ).toBe(0);
});
