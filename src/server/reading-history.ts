import type { Transaction } from "@electric-sql/pglite";
import type { Reading, StoredReading } from "../domain/readings";

export async function readHistory(
  tx: Pick<Transaction, "query">,
  runId = "local",
): Promise<StoredReading[]> {
  const result = await tx.query<{
    payload: Reading;
    received_at: Date | string;
  }>(
    "SELECT payload, received_at FROM readings WHERE run_id=$1 ORDER BY observed_at DESC, (payload->>'sequence')::int DESC, event_id DESC LIMIT 60",
    [runId],
  );
  return result.rows
    .map((row) => ({
      ...row.payload,
      receivedAt: new Date(row.received_at).toISOString(),
    }))
    .reverse();
}
