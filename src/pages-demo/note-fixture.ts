import type { NoteProvider } from "../server/note-provider";

export const SAMPLE_NOTE = "More tired today and barely ate lunch.";

// This exact example is declared in the demo UI; arbitrary notes never use a mock fallback.
export function sampleNoteProvider(text: string): NoteProvider | null {
  if (text.trim() !== SAMPLE_NOTE) return null;
  return {
    model: "demo:fixed-example (not live AI)",
    async extract() {
      return {
        observations: [
          {
            code: "fatigue",
            excerpt: "More tired today",
            negated: false,
            temporality: "current",
          },
          {
            code: "reduced_intake",
            excerpt: "barely ate lunch",
            negated: false,
            temporality: "current",
          },
        ],
      };
    },
  };
}
