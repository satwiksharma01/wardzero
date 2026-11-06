import type { Transaction } from "@electric-sql/pglite";
import type { DemoRun } from "../domain/demo";
import { CareError } from "../domain/care";
export type RunRow = {
  id: string;
  scenario: string;
  created_at: Date;
  clock_offset_ms: number | string;
  active: boolean;
};
export const runFromRow = (row: RunRow): DemoRun => ({
  id: row.id,
  scenario: row.scenario,
  createdAt: row.created_at.toISOString(),
  clockOffsetMs: Number(row.clock_offset_ms),
  active: row.active,
});
export const runTime = (run: DemoRun, wall: Date) =>
  new Date(wall.getTime() + run.clockOffsetMs);
export async function getRun(
  tx: Pick<Transaction, "query">,
  id?: string,
): Promise<DemoRun> {
  const result = id
    ? await tx.query<RunRow>("SELECT * FROM demo_runs WHERE id=$1", [id])
    : await tx.query<RunRow>("SELECT * FROM demo_runs WHERE active");
  if (!result.rows.length) throw new CareError(404, "Demo run not found.");
  return runFromRow(result.rows[0]);
}
