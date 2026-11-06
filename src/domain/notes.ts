import { z } from "zod";
import type { Assessment } from "./assessment";

export const observationSchema = z
  .object({
    code: z.enum(["fatigue", "reduced_intake", "breathlessness", "confusion"]),
    excerpt: z.string().min(1).max(240),
    negated: z.boolean(),
    temporality: z.enum(["current", "historical"]),
  })
  .strict();
export const extractionSchema = z
  .object({ observations: z.array(observationSchema).max(8) })
  .strict();
export type Observation = z.infer<typeof observationSchema>;
export type CareNote = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  recordedAt: string;
  status: "Pending" | "Complete" | "Failed" | "Unavailable";
  observations: Observation[];
  model: string | null;
  promptVersion: string;
  failureReason: string | null;
};
export const NOTE_PROMPT_VERSION = "notes-v1";
export const noteInputSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/),
    text: z.string().trim().min(5).max(2000),
    runId: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
  })
  .strict();

export function validateObservations(
  text: string,
  raw: unknown,
): Observation[] {
  const { observations } = extractionSchema.parse(raw);
  for (const observation of observations) {
    if (!text.includes(observation.excerpt))
      throw new Error("Observation excerpt does not occur in the source note.");
    const start = text.indexOf(observation.excerpt);
    const sentenceStart =
      Math.max(
        text.lastIndexOf(".", start),
        text.lastIndexOf(";", start),
        text.lastIndexOf("\n", start),
      ) + 1;
    const following = text.indexOf(".", start + observation.excerpt.length);
    const context = text.slice(
      Math.max(sentenceStart, start - 80),
      following < 0
        ? Math.min(text.length, start + observation.excerpt.length + 40)
        : following,
    );
    if (
      !observation.negated &&
      /\b(no|not|denies|without|never)\b/i.test(context)
    )
      throw new Error("Observation contradicts explicit source negation.");
    if (
      observation.temporality === "current" &&
      /\b(last (week|month|year)|yesterday|previously|used to)\b/i.test(context)
    )
      throw new Error("Observation contradicts explicit historical context.");
  }
  return observations;
}

export function fuseNotes(
  base: Assessment,
  notes: CareNote[],
  now: Date,
): Assessment {
  if (base.concern === "Unknown") return base;
  const supported = notes
    .filter(
      (note) =>
        note.status === "Complete" &&
        now.getTime() - Date.parse(note.recordedAt) >= 0 &&
        now.getTime() - Date.parse(note.recordedAt) < 120000,
    )
    .flatMap((note) =>
      note.observations
        .filter((obs) => !obs.negated && obs.temporality === "current")
        .map((obs) => ({ note, obs })),
    );
  const codes = new Set(supported.map((entry) => entry.obs.code));
  if (!(
    codes.has("breathlessness") ||
    codes.has("confusion") ||
    (codes.has("fatigue") && codes.has("reduced_intake"))
  ))
    return base;
  return {
    ...base,
    concern: base.concern === "High" ? "High" : "Medium",
    ruleVersion: `${base.ruleVersion}+${NOTE_PROMPT_VERSION}`,
    reasons: [
      ...base.reasons.filter((reason) => reason.code !== "stable-demo"),
      {
        code: "caregiver-context",
        message: `Current caregiver observations support review: ${supported.map(({ obs }) => `“${obs.excerpt}”`).join("; ")}.`,
        eventIds: [
          ...new Set(base.reasons.flatMap((reason) => reason.eventIds)),
        ],
        noteIds: [...new Set(supported.map((entry) => entry.note.id))],
      },
    ],
  };
}
