import type { PGlite } from "@electric-sql/pglite";
import {
  FUTURE_SKEW_MS,
  monitoringStatus,
  readingSchema,
  type IngestResult,
  type Snapshot,
} from "../domain/readings";
import { migrate } from "./migrations";
import { readHistory } from "./reading-history";
import { evaluateCare, readCare } from "./care-assessment";
import { CareStore } from "./care-store";
import { NoteStore } from "./note-store";
import { evaluateDeadlines } from "./escalation";
import { getRun, runTime } from "./run-context";
import { DemoStore } from "./demo-store";
import { isCareError } from "../domain/care";
import { NotificationStore } from "./notification-store";

export class ReadingStore {
  constructor(private readonly db: PGlite) {}
  get care() {
    return new CareStore(this.db);
  }
  get notes() {
    return new NoteStore(this.db);
  }
  get demo() {
    return new DemoStore(this.db, (events, wall) => this.ingest(events, wall));
  }
  get notifications() {
    return new NotificationStore(this.db);
  }

  async initialize() {
    await migrate(this.db);
  }
  evaluateDeadlines(now: Date) {
    return evaluateDeadlines(this.db, now);
  }

  async ingest(events: unknown[], now: Date): Promise<IngestResult[]> {
    if (!events.length || events.length > 100)
      throw new Error("Batch must contain 1–100 readings.");
    const results: IngestResult[] = [];
    for (const event of events) {
      const parsed = readingSchema.safeParse(event);
      if (!parsed.success) {
        results.push({
          eventId: null,
          status: "rejected",
          reason: "Invalid reading shape, identity, timestamp, or measurement.",
        });
        continue;
      }
      const reading = parsed.data;
      const result: IngestResult = await this.db.transaction(
        async (tx): Promise<IngestResult> => {
          const wall = now;
          let run;
          try {
            run = await getRun(tx, reading.runId);
          } catch (error) {
            if (isCareError(error))
              return {
                eventId: reading.eventId,
                status: "rejected",
                reason: "Unknown source demo run.",
              };
            throw error;
          }
          const observedNow = runTime(run, wall);
          if (
            Date.parse(reading.observedAt) >
            observedNow.getTime() + FUTURE_SKEW_MS
          )
            return {
              eventId: reading.eventId,
              status: "rejected",
              reason:
                "Observation is in the future relative to the source run clock.",
            };
          const inserted = await tx.query(
            `INSERT INTO readings (event_id, observed_at, received_at, payload,run_id)
          VALUES ($1, $2, $3, $4::jsonb,$5) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
            [
              reading.eventId,
              reading.observedAt,
              observedNow.toISOString(),
              JSON.stringify(reading),
              run.id,
            ],
          );
          if (inserted.rows.length) {
            // Historic replay is retained without generating a new current-care episode.
            const age = observedNow.getTime() - Date.parse(reading.observedAt);
            if (run.active && age >= 0 && age < 90000)
              await evaluateCare(tx, observedNow, run.id);
            return { eventId: reading.eventId, status: "accepted" };
          }
          // JSONB equality ignores key order while detecting an identity reused for different evidence.
          const same = await tx.query<{ equal: boolean }>(
            "SELECT payload = $2::jsonb AS equal FROM readings WHERE event_id = $1",
            [reading.eventId, JSON.stringify(reading)],
          );
          return same.rows[0].equal
            ? { eventId: reading.eventId, status: "duplicate" }
            : {
                eventId: reading.eventId,
                status: "conflict",
                reason: "Event ID already belongs to different evidence.",
              };
        },
      );
      results.push(result);
    }
    return results;
  }

  async snapshot(now: Date, runId?: string): Promise<Snapshot> {
    return this.db.transaction(async (tx) => {
      const wall = now;
      const run = await getRun(tx, runId);
      now = runTime(run, wall);
      const count = await tx.query<{ total: number }>(
        "SELECT COUNT(*)::int AS total FROM readings WHERE run_id=$1",
        [run.id],
      );
      const history = await readHistory(tx, run.id);
      const latest = history.at(-1) ?? null;
      return {
        latest,
        history,
        total: count.rows[0].total,
        monitoring: monitoringStatus(latest?.observedAt ?? null, now),
        serverTime: now.toISOString(),
        care: await readCare(tx, history, now, run.id),
        run,
        wallTime: wall.toISOString(),
      };
    });
  }
}
