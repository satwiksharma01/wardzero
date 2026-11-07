import type { PGliteInterface } from "@electric-sql/pglite";
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
import { getRun, runTime } from "./run-context";

export class NoteStore {
  constructor(private readonly db: PGliteInterface) {}
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
    const wall = now;
    const run = await getRun(this.db);
    if (parsed.data.runId && parsed.data.runId !== run.id)
      throw new CareError(
        409,
        "The active run changed. Refresh before saving this observation.",
      );
    now = runTime(run, wall);
    const claimed = await this.db.transaction(async (tx) => {
      const prior = await tx.query<NoteRow>(
        "SELECT * FROM caregiver_notes WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (prior.rows.length) {
        const note = noteFromRow(prior.rows[0]);
        if (prior.rows[0].run_id !== run.id)
          throw new CareError(409, "This note belongs to an archived run.");
        if (note.text !== text || note.authorId !== actor.id)
          throw new CareError(
            409,
            "Note identity already belongs to different content or author.",
          );
        if (
          note.status === "Complete" ||
          (note.status === "Pending" &&
            wall.getTime() - prior.rows[0].analysis_started_at.getTime() <
              30000)
        )
          return false;
        await tx.query(
          "UPDATE caregiver_notes SET status='Pending', analysis_started_at=$2, failure_reason=NULL, prompt_version=$3 WHERE id=$1",
          [id, wall.toISOString(), NOTE_PROMPT_VERSION],
        );
      } else {
        await tx.query(
          `INSERT INTO caregiver_notes(id,text,author_id,author_name,recorded_at,analysis_started_at,status,prompt_version,run_id)
          VALUES($1,$2,$3,$4,$5,$6,'Pending',$7,$8)`,
          [
            id,
            text,
            actor.id,
            actor.name,
            now.toISOString(),
            wall.toISOString(),
            NOTE_PROMPT_VERSION,
            run.id,
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
        const sourceRun = await getRun(tx, run.id);
        if (sourceRun.active)
          await evaluateCare(tx, runTime(sourceRun, clock()), run.id);
      });
    }
    const saved = await this.db.query<NoteRow>(
      "SELECT * FROM caregiver_notes WHERE id=$1",
      [id],
    );
    return noteFromRow(saved.rows[0]);
  }
}
