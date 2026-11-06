import { createHash } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { CareError, DEMO_ACTORS } from "../domain/care";
import {
  demoResetSchema,
  demoAdvanceSchema,
  demoSeedSchema,
  type DemoRunSummary,
} from "../domain/demo";
import {
  makeReading,
  type Reading,
  type IngestResult,
} from "../domain/readings";
import { CareStore } from "./care-store";
import { getRun, runFromRow, runTime, type RunRow } from "./run-context";

export class DemoStore {
  constructor(
    private readonly db: PGlite,
    private readonly ingest: (
      events: unknown[],
      wall: Date,
    ) => Promise<IngestResult[]>,
  ) {}
  private async authorize(token: string | null, wall: Date) {
    const actor = await new CareStore(this.db).actorForSession(token, wall);
    if (!actor)
      throw new CareError(
        401,
        "Activate a primary caregiver demo identity first.",
      );
    if (actor.id !== DEMO_ACTORS.primary.id)
      throw new CareError(
        403,
        "Demo controls require the primary caregiver identity.",
      );
  }
  async reset(token: string | null, input: unknown, wall: Date) {
    const parsed = demoResetSchema.safeParse(input);
    if (!parsed.success)
      throw new CareError(400, "Invalid demo reset request.");
    await this.authorize(token, wall);
    const request = parsed.data;
    return this.db.transaction(async (tx) => {
      const existing = await tx.query<RunRow>(
        "SELECT * FROM demo_runs WHERE id=$1",
        [request.id],
      );
      if (existing.rows.length) {
        if (
          !existing.rows[0].active ||
          existing.rows[0].scenario !== request.scenario
        )
          throw new CareError(
            409,
            "Run identity already belongs to a different or archived run.",
          );
        return runFromRow(existing.rows[0]);
      }
      await tx.query("UPDATE demo_runs SET active=false WHERE active");
      await tx.query(
        "INSERT INTO demo_runs(id,scenario,created_at,active) VALUES($1,$2,$3,true)",
        [request.id, request.scenario, wall.toISOString()],
      );
      return getRun(tx, request.id);
    });
  }
  async advance(token: string | null, input: unknown, wall: Date) {
    const parsed = demoAdvanceSchema.safeParse(input);
    if (!parsed.success)
      throw new CareError(
        400,
        "Advance time by 1–3600 seconds with a valid run identity.",
      );
    await this.authorize(token, wall);
    const request = parsed.data;
    return this.db.transaction(async (tx) => {
      const run = await getRun(tx);
      if (run.id !== request.runId)
        throw new CareError(
          409,
          "The active run changed. Refresh before advancing time.",
        );
      const existing = await tx.query<{ equal: boolean }>(
        "SELECT request=$2::jsonb AS equal FROM demo_commands WHERE id=$1",
        [request.id, JSON.stringify({ kind: "advance", ...request })],
      );
      if (existing.rows.length) {
        if (!existing.rows[0].equal)
          throw new CareError(409, "Demo command identity conflicts.");
        return run;
      }
      if (run.clockOffsetMs + request.seconds * 1000 > 86400000)
        throw new CareError(
          409,
          "Reset the demo before advancing beyond one day.",
        );
      await tx.query(
        "INSERT INTO demo_commands(id,run_id,request,created_at) VALUES($1,$2,$3::jsonb,$4)",
        [
          request.id,
          run.id,
          JSON.stringify({ kind: "advance", ...request }),
          wall.toISOString(),
        ],
      );
      await tx.query(
        "UPDATE demo_runs SET clock_offset_ms=clock_offset_ms+$2 WHERE id=$1",
        [run.id, request.seconds * 1000],
      );
      return getRun(tx, run.id);
    });
  }
  async seed(token: string | null, input: unknown, wall: Date) {
    const parsed = demoSeedSchema.safeParse(input);
    if (!parsed.success)
      throw new CareError(400, "Choose a valid demo preset.");
    await this.authorize(token, wall);
    const request = parsed.data;
    const readings = await this.db.transaction(async (tx) => {
      const run = await getRun(tx);
      if (run.id !== request.runId)
        throw new CareError(
          409,
          "The active run changed. Refresh before loading a preset.",
        );
      const existing = await tx.query<{ equal: boolean; payload: Reading[] }>(
        "SELECT request=$2::jsonb AS equal,payload FROM demo_commands WHERE id=$1",
        [request.id, JSON.stringify({ kind: "seed", ...request })],
      );
      if (existing.rows.length) {
        if (!existing.rows[0].equal)
          throw new CareError(409, "Demo command identity conflicts.");
        return existing.rows[0].payload;
      }
      const now = runTime(run, wall);
      const steps = request.scenario === "stable" ? [0, 1, 2] : [8, 10, 12];
      const events = steps.map((step, index) =>
        makeReading(
          step,
          request.scenario,
          new Date(now.getTime() - (2 - index) * 5000),
          `${createHash("sha256").update(request.id).digest("hex")}-${index}`,
          run.id,
        ),
      );
      await tx.query(
        "INSERT INTO demo_commands(id,run_id,request,payload,created_at) VALUES($1,$2,$3::jsonb,$4::jsonb,$5)",
        [
          request.id,
          run.id,
          JSON.stringify({ kind: "seed", ...request }),
          JSON.stringify(events),
          wall.toISOString(),
        ],
      );
      return events;
    });
    return this.ingest(readings, wall);
  }
  async list(): Promise<DemoRunSummary[]> {
    const result = await this.db.query<
      RunRow & {
        reading_count: number;
        note_count: number;
        alert_count: number;
      }
    >(`SELECT r.*,
      (SELECT COUNT(*)::int FROM readings WHERE run_id=r.id) AS reading_count,
      (SELECT COUNT(*)::int FROM caregiver_notes WHERE run_id=r.id) AS note_count,
      (SELECT COUNT(*)::int FROM care_alerts WHERE run_id=r.id) AS alert_count
      FROM demo_runs r ORDER BY active DESC,created_at DESC,id DESC LIMIT 10`);
    return result.rows.map((row) => ({
      ...runFromRow(row),
      readingCount: row.reading_count,
      noteCount: row.note_count,
      alertCount: row.alert_count,
    }));
  }
}
