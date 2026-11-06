import type { PGlite } from "@electric-sql/pglite";
import {
  FUTURE_SKEW_MS,
  monitoringStatus,
  readingSchema,
  type IngestResult,
  type Reading,
  type Snapshot,
  type StoredReading,
} from "../domain/readings";

type Row = { payload: Reading; received_at: Date | string };
const fromRow = (row: Row): StoredReading => ({
  ...row.payload,
  receivedAt: new Date(row.received_at).toISOString(),
});

export class ReadingStore {
  constructor(private readonly db: PGlite) {}

  async initialize() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS readings (
        event_id TEXT PRIMARY KEY,
        observed_at TIMESTAMPTZ NOT NULL,
        received_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS readings_time ON readings (observed_at DESC, event_id DESC);
    `);
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
        if (inserted.rows.length) return "accepted" as const;
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
      const result = await tx.query<Row>(
        "SELECT payload, received_at FROM readings ORDER BY observed_at DESC, event_id DESC LIMIT 60",
      );
      const count = await tx.query<{ total: number }>(
        "SELECT COUNT(*)::int AS total FROM readings",
      );
      const history = result.rows.map(fromRow).reverse();
      const latest = history.at(-1) ?? null;
      return {
        latest,
        history,
        total: count.rows[0].total,
        monitoring: monitoringStatus(latest?.observedAt ?? null, now),
        serverTime: now.toISOString(),
      };
    });
  }
}
