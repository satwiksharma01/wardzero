import type { Assessment } from "./assessment";
import type { CareNote } from "./notes";

export function noteEvidenceUse(
  note: CareNote,
  now: Date,
  assessment: Assessment | null,
  disconnected = false,
): string {
  if (disconnected) return "Last known analysis; reconnect to confirm use";
  if (note.status !== "Complete")
    return `Not applied; analysis is ${note.status}`;
  const age = now.getTime() - Date.parse(note.recordedAt);
  if (!Number.isFinite(age)) return "Timing unavailable; not applied";
  if (age < 0) return "Not yet eligible; recorded time is ahead";
  if (age >= 120000) return "Stale; outside the 120-second context window";
  if (!note.observations.length)
    return "Abstained; no supported observation extracted";
  if (
    !note.observations.some(
      (observation) =>
        !observation.negated && observation.temporality === "current",
    )
  )
    return "Excluded; negated or historical observations only";
  if (!assessment || assessment.concern === "Unknown")
    return "Fresh vital evidence required before applying context";
  if (assessment.reasons.some((reason) => reason.noteIds?.includes(note.id)))
    return "Contributes to current concern";
  return "Current context; no concern rule triggered";
}
