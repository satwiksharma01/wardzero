import type { Transaction } from "@electric-sql/pglite";
import type { Reading, StoredReading } from "../domain/readings";

export async function readHistory(
  tx: Pick<Transaction, "query">,
): Promise<StoredReading[]> {
  const result = await tx.query<{
    payload: Reading;
    received_at: Date | string;
  }>(
    "SELECT payload, received_at FROM readings ORDER BY observed_at DESC, event_id DESC LIMIT 60",
  );
  return result.rows
    .map((row) => ({
      ...row.payload,
      receivedAt: new Date(row.received_at).toISOString(),
    }))
    .reverse();
}
