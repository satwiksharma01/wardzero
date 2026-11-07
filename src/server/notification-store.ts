import type { PGliteInterface, Transaction } from "@electric-sql/pglite";
import type { EmailDelivery } from "../domain/notifications";
import {
  emailConfiguration,
  isEmailFailure,
  type EmailConfig,
  type EmailPayload,
  type EmailProvider,
} from "./email-provider";

const RETRY_WINDOW_MS = 23 * 3600000;
const MAX_ATTEMPTS = 6;
async function maintainJobs(tx: Pick<Transaction, "query">, now: Date) {
  await tx.query(
    `UPDATE notification_jobs j SET state='Cancelled',lease_until=NULL,next_attempt_at=NULL,last_error_code='episode_or_run_closed'
    FROM care_alerts a,demo_runs r WHERE j.alert_id=a.id AND j.run_id=r.id AND (a.state <> 'Open' OR NOT r.active)
    AND (j.state IN ('Pending','Retry') OR j.state='Sending' AND j.lease_until <= $1)`,
    [now.toISOString()],
  );
  await tx.query(
    `UPDATE notification_jobs SET state='Failed',lease_until=NULL,next_attempt_at=NULL,
    last_error_code=CASE WHEN created_at <= $2 THEN 'idempotency_window_expired' ELSE 'attempt_limit' END
    WHERE (state IN ('Pending','Retry') OR state='Sending' AND lease_until <= $1)
    AND (created_at <= $2 OR attempts >= $3)`,
    [
      now.toISOString(),
      new Date(now.getTime() - RETRY_WINDOW_MS).toISOString(),
      MAX_ATTEMPTS,
    ],
  );
}
type Job = {
  id: string;
  alert_id: string;
  run_id: string;
  state: EmailDelivery["state"];
  idempotency_key: string;
  payload: EmailPayload | null;
  attempts: number;
  created_at: Date;
  next_attempt_at: Date | null;
  lease_until: Date | null;
  accepted_at: Date | null;
  provider_reference: string | null;
  last_error_code: string | null;
};

export async function enqueueEscalationEmail(
  tx: Pick<Transaction, "query">,
  alert: { id: string; severity: string; runId: string },
  wall: Date,
  config: EmailConfig | null = emailConfiguration(),
) {
  const id = `email/escalation/${alert.id}`;
  const payload: EmailPayload | null = config
    ? {
        from: config.from,
        to: [config.to],
        subject: "WardZero synthetic episode needs review",
        text: `Synthetic ${alert.severity} concern episode ${alert.id} remains unacknowledged. In-app escalation was recorded for run ${alert.runId}. Review the app's care response. Provider acceptance is not caregiver acknowledgement. Synthetic demo; not for clinical use.`,
      }
    : null;
  await tx.query(
    `INSERT INTO notification_jobs(id,alert_id,run_id,state,idempotency_key,payload,created_at,next_attempt_at,last_error_code)
    VALUES($1,$2,$3,$4,$1,$5::jsonb,$6,$7,$8) ON CONFLICT(alert_id) DO NOTHING`,
    [
      id,
      alert.id,
      alert.runId,
      config ? "Pending" : "Disabled",
      payload ? JSON.stringify(payload) : null,
      wall.toISOString(),
      config ? wall.toISOString() : null,
      config ? null : "not_enabled_or_configured",
    ],
  );
}

export async function readEmailDeliveries(
  tx: Pick<Transaction, "query">,
  alertIds: string[],
): Promise<Map<string, EmailDelivery>> {
  const rows = await tx.query<
    Pick<
      Job,
      | "alert_id"
      | "state"
      | "attempts"
      | "accepted_at"
      | "provider_reference"
      | "next_attempt_at"
      | "last_error_code"
    >
  >(
    "SELECT alert_id,state,attempts,accepted_at,provider_reference,next_attempt_at,last_error_code FROM notification_jobs WHERE alert_id=ANY($1::text[])",
    [alertIds],
  );
  return new Map(
    rows.rows.map((row) => [
      row.alert_id,
      {
        state: row.state,
        attempts: row.attempts,
        providerReference: row.provider_reference,
        providerAcceptedAt: row.accepted_at?.toISOString() ?? null,
        nextAttemptAt: row.next_attempt_at?.toISOString() ?? null,
        errorCode: row.last_error_code,
      },
    ]),
  );
}

export class NotificationStore {
  constructor(private readonly db: PGliteInterface) {}

  async claimDue(now: Date) {
    return this.db.transaction(async (tx) => {
      await maintainJobs(tx, now);
      const due = await tx.query<Job>(
        `SELECT * FROM notification_jobs WHERE
        (state IN ('Pending','Retry') AND next_attempt_at <= $1) OR (state='Sending' AND lease_until <= $1)
        ORDER BY created_at,id LIMIT 1 FOR UPDATE`,
        [now.toISOString()],
      );
      const job = due.rows[0];
      if (!job) return null;
      const expired =
        now.getTime() - job.created_at.getTime() >= RETRY_WINDOW_MS;
      if (expired || job.attempts >= MAX_ATTEMPTS || !job.payload) {
        await tx.query(
          "UPDATE notification_jobs SET state='Failed',lease_until=NULL,next_attempt_at=NULL,last_error_code=$2 WHERE id=$1",
          [
            job.id,
            expired
              ? "idempotency_window_expired"
              : job.attempts >= MAX_ATTEMPTS
                ? "attempt_limit"
                : "invalid_payload",
          ],
        );
        return null;
      }
      const claimed = await tx.query<Job>(
        "UPDATE notification_jobs SET state='Sending',attempts=attempts+1,lease_until=$2,next_attempt_at=NULL WHERE id=$1 RETURNING *",
        [job.id, new Date(now.getTime() + 30000).toISOString()],
      );
      return { ...claimed.rows[0], payload: job.payload };
    });
  }

  async runDue(
    now: Date,
    provider: EmailProvider | null,
    clock: () => Date = () => new Date(),
  ) {
    const result = { attempted: 0, accepted: 0 };
    if (!provider) {
      await this.db.transaction((tx) => maintainJobs(tx, now));
      return result;
    }
    let claimTime = now;
    for (let index = 0; index < 5; index++) {
      const job = await this.claimDue(claimTime);
      if (!job) break;
      result.attempted++;
      try {
        const accepted = await provider.send(job.payload, job.idempotency_key);
        const finished = clock();
        const saved = await this.db.query(
          "UPDATE notification_jobs SET state='Accepted',accepted_at=$3,provider_reference=$4,lease_until=NULL,last_error_code=NULL WHERE id=$1 AND state='Sending' AND attempts=$2 RETURNING id",
          [job.id, job.attempts, finished.toISOString(), accepted.acceptedId],
        );
        result.accepted += saved.rows.length;
      } catch (error) {
        const failure = isEmailFailure(error)
          ? error
          : { retryable: true, code: "network_or_timeout", retryAfterMs: 0 };
        const finished = clock();
        const delay = Math.max(
          1000 * 2 ** (job.attempts - 1),
          failure.retryAfterMs,
        );
        const next = new Date(finished.getTime() + delay);
        const canRetry =
          failure.retryable &&
          job.attempts < MAX_ATTEMPTS &&
          next.getTime() - job.created_at.getTime() < RETRY_WINDOW_MS;
        await this.db.query(
          "UPDATE notification_jobs SET state=$3,next_attempt_at=$4,lease_until=NULL,last_error_code=$5 WHERE id=$1 AND state='Sending' AND attempts=$2",
          [
            job.id,
            job.attempts,
            canRetry ? "Retry" : "Failed",
            canRetry ? next.toISOString() : null,
            failure.code,
          ],
        );
      }
      claimTime = clock();
    }
    return result;
  }
}
