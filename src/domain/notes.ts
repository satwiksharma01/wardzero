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
export const NOTE_PROMPT_VERSION = "notes-v3";
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

function observationContext(
  text: string,
  observation: Observation,
  inheritCoordination = false,
): string {
  const start = text.indexOf(observation.excerpt);
  // Anchor a broad excerpt to its symptom phrase so unrelated clauses do not
  // lend it their negation/history. This is a conservative lexical guard, not NLP validation.
  const terms = {
    fatigue: /tired|tierd|fatigu|exhaust|energy/i,
    reduced_intake: /intake|eat|ate|food|fluid|meal|lunch|drink/i,
    breathlessness: /breath|breth|short of/i,
    confusion: /confus|disorient/i,
  };
  const anchor =
    start +
    (observation.excerpt.search(terms[observation.code]) < 0
      ? 0
      : observation.excerpt.search(terms[observation.code]));
  let left = 0,
    right = text.length;
  for (const boundary of text.matchAll(
    /[.!?;\n]|\b(?:but|however|yet|although|whereas)\b|\band\s+(?=(?:she|he|they|the patient|patient)\b)/gi,
  )) {
    if (
      inheritCoordination &&
      boundary.index < anchor &&
      /^and\s/i.test(boundary[0])
    )
      continue;
    if (boundary.index < anchor) left = boundary.index + boundary[0].length;
    else {
      right = boundary.index;
      break;
    }
  }
  return text.slice(left, right);
}

export function validateObservations(
  text: string,
  raw: unknown,
): Observation[] {
  const { observations } = extractionSchema.parse(raw);
  for (const observation of observations) {
    if (!text.includes(observation.excerpt))
      throw new Error("Observation excerpt does not occur in the source note.");
    const context = observationContext(text, observation);
    // A coordinated clause can inherit history: "last week and she was confused".
    // Explicit current timing resets that scope; contrast/punctuation remain boundaries.
    const historicalContext =
      /\b(now|today|currently|this (?:morning|afternoon|evening)|at present)\b/i.test(
        context,
      )
        ? context
        : observationContext(text, observation, true);
    if (
      !observation.negated &&
      /\b(no|not|denies|without|never)\b/i.test(
        context.replace(/\bnot only\b/gi, ""),
      )
    )
      throw new Error("Observation contradicts explicit source negation.");
    if (
      observation.temporality === "current" &&
      /\b(last (week|month|year)|yesterday|previously|used to|(?:\d+|one|two|three|several) (?:days?|weeks?|months?|years?) ago)\b/i.test(
        historicalContext,
      )
    )
      throw new Error("Observation contradicts explicit historical context.");
    if (
      !observation.negated &&
      observation.temporality === "current" &&
      /\b(may|might|maybe|perhaps|possibly|uncertain|unsure|whether|if|tomorrow|plan to|please check|check for|watch for)\b/i.test(
        context,
      )
    )
      throw new Error(
        "Uncertain or planned observations require clarification.",
      );
    if (
      /\b(?:ignore (?:all|the|previous|earlier)|system override|(?:return|output) (?:a|an|the|\{)|replace (?:the|this) note)\b|<system>/i.test(
        context,
      )
    )
      throw new Error("Instructions are not patient observation evidence.");
    if (
      /\b(?:I am (?:the|a) caregiver|caregiver (?:is|feels?|reports feeling))\b/i.test(
        context,
      )
    )
      throw new Error("Observer symptoms are not patient observations.");
  }
  for (const observation of observations) {
    if (
      observation.temporality === "current" &&
      observations.some(
        (other) =>
          other.code === observation.code &&
          other.temporality === "current" &&
          other.negated !== observation.negated,
      )
    )
      throw new Error(
        "Conflicting current observations require clarification.",
      );
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
