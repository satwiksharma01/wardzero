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

export class ReadingStore {
  constructor(private readonly db: PGlite) {}
  get care() {
    return new CareStore(this.db);
  }
  get notes() {
    return new NoteStore(this.db);
  }

  async initialize() {
    await migrate(this.db);
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
      if (Date.parse(reading.observedAt) > now.getTime() + FUTURE_SKEW_MS) {
        results.push({
          eventId: reading.eventId,
          status: "rejected",
          reason: "Observation is more than five seconds in the future.",
        });
        continue;
      }
      const result = await this.db.transaction(async (tx) => {
        const inserted = await tx.query(
          `INSERT INTO readings (event_id, observed_at, received_at, payload)
          VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
          [
            reading.eventId,
            reading.observedAt,
            now.toISOString(),
            JSON.stringify(reading),
          ],
        );
        if (inserted.rows.length) {
          // Historic replay is retained without generating a new current-care episode.
          const age = now.getTime() - Date.parse(reading.observedAt);
          if (age >= 0 && age < 90000) await evaluateCare(tx, now);
          return "accepted" as const;
        }
        // JSONB equality ignores key order while detecting an identity reused for different evidence.
        const same = await tx.query<{ equal: boolean }>(
          "SELECT payload = $2::jsonb AS equal FROM readings WHERE event_id = $1",
          [reading.eventId, JSON.stringify(reading)],
        );
        return same.rows[0].equal
          ? ("duplicate" as const)
          : ("conflict" as const);
      });
      results.push({
        eventId: reading.eventId,
        status: result,
        ...(result === "conflict"
          ? { reason: "Event ID already belongs to different evidence." }
          : {}),
      });
    }
    return results;
  }

  async snapshot(now: Date): Promise<Snapshot> {
    return this.db.transaction(async (tx) => {
      const count = await tx.query<{ total: number }>(
        "SELECT COUNT(*)::int AS total FROM readings",
      );
      const history = await readHistory(tx);
      const latest = history.at(-1) ?? null;
      return {
        latest,
        history,
        total: count.rows[0].total,
        monitoring: monitoringStatus(latest?.observedAt ?? null, now),
        serverTime: now.toISOString(),
        care: await readCare(tx, history, now),
      };
    });
  }
}
