import type { Transaction } from "@electric-sql/pglite";
import type { CareNote } from "../domain/notes";

export type NoteRow = {
  id: string;
  run_id: string;
  text: string;
  author_id: string;
  author_name: string;
  recorded_at: Date;
  analysis_started_at: Date;
  status: CareNote["status"];
  observations: CareNote["observations"];
  model: string | null;
  prompt_version: string;
  failure_reason: string | null;
};
export const noteFromRow = (row: NoteRow): CareNote => ({
  id: row.id,
  text: row.text,
  authorId: row.author_id,
  authorName: row.author_name,
  recordedAt: row.recorded_at.toISOString(),
  status: row.status,
  observations: row.observations,
  model: row.model,
  promptVersion: row.prompt_version,
  failureReason: row.failure_reason,
});

export async function readNotes(
  tx: Pick<Transaction, "query">,
  runId = "local",
): Promise<CareNote[]> {
  const result = await tx.query<NoteRow>(
    "SELECT * FROM caregiver_notes WHERE run_id=$1 ORDER BY recorded_at DESC, id DESC LIMIT 20",
    [runId],
  );
  return result.rows.map(noteFromRow);
}
