import { PGlite } from "@electric-sql/pglite";
import { ReadingStore } from "../../src/server/reading-store";
import { assess, type EvidenceReason } from "../../src/domain/assessment";
import type { NoteProvider } from "../../src/server/note-provider";
import type { CareNote } from "../../src/domain/notes";
import {
  EARLY_WARNING_START,
  earlyWarningTimeline,
  earlyWarningNote,
  negatedEarlyNote,
  historicalEarlyNote,
} from "../fixtures/early-warning";

export type EarlyWarningVariant =
  | "current-note"
  | "no-note"
  | "negated-note"
  | "historical-note"
  | "failed-note"
  | "stable"
  | "stable-negated"
  | "stable-historical"
  | "stable-current";

export async function replayEarlyWarning(
  variant: EarlyWarningVariant,
  provider: NoteProvider | null,
) {
  const db = new PGlite();
  const base = Date.parse(EARLY_WARNING_START);
  const at = (second: number) => new Date(base + second * 1000);
  try {
    const store = new ReadingStore(db);
    await store.initialize();
    const { token } = await store.care.createSession("primary", at(0));
    const stable = variant.startsWith("stable");
    const hasNote = variant !== "no-note" && variant !== "stable";
    const text = variant.includes("negated")
      ? negatedEarlyNote
      : variant.includes("historical")
        ? historicalEarlyNote
        : earlyWarningNote;
    const steps: {
      second: number;
      concern: string;
      reasons: EvidenceReason[];
      readingIds: string[];
      metrics: Record<string, number> | null;
    }[] = [];
    let firstConcernSecond: number | null = null;
    let firstBothSourcesSecond: number | null = null;
    let individualMarkerSecond: number | null = null;
    let noteStatus: CareNote["status"] | null = null;
    let noteAnalysisElapsedMs: number | null = null;
    const seconds = [
      ...new Set([...earlyWarningTimeline.map((step) => step.second), 15]),
    ].sort((a, b) => a - b);
    for (const second of seconds) {
      const sample = earlyWarningTimeline.find(
        (step) => step.second === second,
      );
      if (sample) {
        const reading = {
          eventId: `early-${variant}-${second}`,
          patientId: "patient-001",
          deviceId: "simulator-001",
          runId: "local",
          sequence: second,
          observedAt: at(second).toISOString(),
          metrics: stable ? earlyWarningTimeline[0].metrics : sample.metrics,
        };
        const results = await store.ingest([reading], at(second));
        if (results[0].status !== "accepted")
          throw Error("Scenario reading was not accepted.");
      }
      if (second === 15 && hasNote) {
        const started = Date.now();
        const note = await store.notes.submit(
          token,
          { id: `early-${variant}-observation`, text },
          at(second),
          provider,
          () => at(second),
        );
        noteStatus = note.status;
        noteAnalysisElapsedMs = Date.now() - started;
      }
      const snapshot = await store.snapshot(at(second));
      const assessment = snapshot.care.currentAssessment;
      if (
        firstConcernSecond === null &&
        ["Medium", "High"].includes(assessment.concern)
      )
        firstConcernSecond = second;
      const reasonCodes = new Set(
        assessment.reasons.map((reason) => reason.code),
      );
      if (
        firstBothSourcesSecond === null &&
        reasonCodes.has("combined-trend") &&
        reasonCodes.has("caregiver-context")
      )
        firstBothSourcesSecond = second;
      // One observation removes trend/note contributions; its first Medium/High is the individual-limit comparator.
      if (
        sample &&
        snapshot.latest &&
        individualMarkerSecond === null &&
        ["Medium", "High"].includes(
          assess([snapshot.latest], at(second)).concern,
        )
      )
        individualMarkerSecond = second;
      steps.push({
        second,
        concern: assessment.concern,
        reasons: assessment.reasons,
        readingIds: snapshot.history.map((reading) => reading.eventId),
        metrics: snapshot.latest?.metrics ?? null,
      });
    }
    const final = await store.snapshot(at(90));
    return {
      variant,
      synthetic: true,
      timeMode:
        "Injected synthetic clock; note analysis wall time is excluded from lead time.",
      noteStatus,
      noteModel: final.care.notes[0]?.model ?? null,
      noteAnalysisElapsedMs,
      firstConcernSecond,
      firstBothSourcesSecond,
      individualMarkerSecond,
      leadSeconds:
        individualMarkerSecond === null || firstConcernSecond === null
          ? null
          : individualMarkerSecond - firstConcernSecond,
      firstAlertOpenedSecond: final.care.alerts.length
        ? (Date.parse(final.care.alerts.at(-1)!.openedAt) - base) / 1000
        : null,
      alertCount: final.care.alerts.length,
      alerts: final.care.alerts,
      notes: final.care.notes,
      steps,
    };
  } finally {
    await db.close();
  }
}
