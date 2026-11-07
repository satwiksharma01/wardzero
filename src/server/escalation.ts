import type { PGliteInterface } from "@electric-sql/pglite";
import { getRun, runTime } from "./run-context";
import { DEMO_ACTORS } from "../domain/care";
import { enqueueEscalationEmail } from "./notification-store";

export function acknowledgementDelayMs() {
  const value = Number(process.env.WARDZERO_ACK_DEADLINE_MS ?? 120000);
  if (!Number.isInteger(value) || value < 1000 || value > 900000)
    throw new Error("Acknowledgement interval must be 1000–900000 ms.");
  return value;
}

export async function evaluateDeadlines(db: PGliteInterface, now: Date) {
  return db.transaction(async (tx) => {
    const wall = now;
    const run = await getRun(tx);
    now = runTime(run, wall);
    const overdue = await tx.query<{ id: string; severity: string }>(
      `UPDATE care_alerts SET escalated_at=$1, updated_at=$1
      WHERE state='Open' AND escalated_at IS NULL AND acknowledgement_due_at <= $1 AND run_id=$2 RETURNING id,severity`,
      [now.toISOString(), run.id],
    );
    for (const alert of overdue.rows) {
      await tx.query(
        `INSERT INTO care_events(id,alert_id,actor_id,actor_name,action,text,occurred_at)
        VALUES($1,$2,'system','WardZero','escalated',$3,$4)`,
        [
          crypto.randomUUID(),
          alert.id,
          `Acknowledgement overdue. Escalated in-app to ${DEMO_ACTORS.backup.name}. Optional email delivery is tracked separately.`,
          now.toISOString(),
        ],
      );
      await enqueueEscalationEmail(
        tx,
        { id: alert.id, severity: alert.severity, runId: run.id },
        wall,
      );
    }
    await tx.query(
      `INSERT INTO worker_heartbeat(id,last_tick_at) VALUES(1,$1)
      ON CONFLICT(id) DO UPDATE SET last_tick_at=EXCLUDED.last_tick_at`,
      [wall.toISOString()],
    );
    return overdue.rows.length;
  });
}
