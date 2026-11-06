import type { PGlite } from "@electric-sql/pglite";
import { CareError } from "../domain/care";
import {
  NOTE_PROMPT_VERSION,
  noteInputSchema,
  validateObservations,
  type CareNote,
} from "../domain/notes";
import { CareStore } from "./care-store";
import { evaluateCare } from "./care-assessment";
import type { NoteProvider } from "./note-provider";
import { noteFromRow, type NoteRow } from "./note-history";

export class NoteStore {
  constructor(private readonly db: PGlite) {}
  async submit(
    token: string | null,
    input: unknown,
    now: Date,
    provider: NoteProvider | null,
    clock: () => Date = () => new Date(),
  ): Promise<CareNote> {
    const parsed = noteInputSchema.safeParse(input);
    if (!parsed.success)
      throw new CareError(
        400,
        "A note needs a valid identity and 5–2000 characters.",
      );
    const { id, text } = parsed.data;
    const actor = await new CareStore(this.db).actorForSession(token, now);
    if (!actor)
      throw new CareError(
        401,
        "Activate a demo caregiver session before adding notes.",
      );
    const claimed = await this.db.transaction(async (tx) => {
      const prior = await tx.query<NoteRow>(
        "SELECT * FROM caregiver_notes WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (prior.rows.length) {
        const note = noteFromRow(prior.rows[0]);
        if (note.text !== text || note.authorId !== actor.id)
          throw new CareError(
            409,
            "Note identity already belongs to different content or author.",
          );
        if (
          note.status === "Complete" ||
          (note.status === "Pending" &&
            now.getTime() - prior.rows[0].analysis_started_at.getTime() < 30000)
        )
          return false;
        await tx.query(
          "UPDATE caregiver_notes SET status='Pending', analysis_started_at=$2, failure_reason=NULL WHERE id=$1",
          [id, now.toISOString()],
        );
      } else {
        await tx.query(
          `INSERT INTO caregiver_notes(id,text,author_id,author_name,recorded_at,analysis_started_at,status,prompt_version)
          VALUES($1,$2,$3,$4,$5,$5,'Pending',$6)`,
          [
            id,
            text,
            actor.id,
            actor.name,
            now.toISOString(),
            NOTE_PROMPT_VERSION,
          ],
        );
      }
      return true;
    });
    if (claimed) {
      let status: CareNote["status"] = "Unavailable";
      let observations: CareNote["observations"] = [];
      let failureReason: string | null =
        "AI provider is not configured. Reading-based assessment remains available.";
      if (provider) {
        try {
          observations = validateObservations(
            text,
            await provider.extract(text),
          );
          status = "Complete";
          failureReason = null;
        } catch {
          status = "Failed";
          failureReason =
            "AI interpretation failed or returned unsupported evidence. Retry analysis; no observations were applied.";
        }
      }
      await this.db.transaction(async (tx) => {
        await tx.query(
          "UPDATE caregiver_notes SET status=$2, observations=$3::jsonb, model=$4, failure_reason=$5 WHERE id=$1",
          [
            id,
            status,
            JSON.stringify(observations),
            provider?.model ?? null,
            failureReason,
          ],
        );
        await evaluateCare(tx, clock());
      });
    }
    const saved = await this.db.query<NoteRow>(
      "SELECT * FROM caregiver_notes WHERE id=$1",
      [id],
    );
    return noteFromRow(saved.rows[0]);
  }
}
