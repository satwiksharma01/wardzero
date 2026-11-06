import { randomUUID } from "node:crypto";
import type { Transaction } from "@electric-sql/pglite";
import { assess, type SavedAssessment } from "../domain/assessment";
import {
  DEMO_ACTORS,
  type AlertEpisode,
  type CareSnapshot,
} from "../domain/care";
import { PATIENT_ID, type StoredReading } from "../domain/readings";
import { readHistory } from "./reading-history";

type AlertRow = {
  id: string;
  severity: AlertEpisode["severity"];
  state: AlertEpisode["state"];
  assigned_actor_id: string;
  opened_at: Date;
  updated_at: Date;
  evidence_at: Date;
  assessment: SavedAssessment;
};

export async function evaluateCare(tx: Transaction, now: Date) {
  const history = await readHistory(tx);
  const assessment: SavedAssessment = {
    ...assess(history, now),
    id: randomUUID(),
  };
  await tx.query("INSERT INTO assessments(id, payload) VALUES($1, $2::jsonb)", [
    assessment.id,
    JSON.stringify(assessment),
  ]);
  const active = await tx.query<AlertRow>(
    "SELECT * FROM care_alerts WHERE state <> 'Resolved' FOR UPDATE",
  );
  const alert = active.rows[0];
  if (alert) {
    const raised = alert.severity === "Medium" && assessment.concern === "High";
    const matchesPeak = assessment.concern === alert.severity || raised;
    await tx.query(
      `UPDATE care_alerts SET evidence_at = GREATEST(evidence_at, $2::timestamptz),
      severity = $3, assessment = $4::jsonb, updated_at = $5 WHERE id = $1`,
      [
        alert.id,
        assessment.latestObservedAt ?? alert.evidence_at.toISOString(),
        raised ? "High" : alert.severity,
        JSON.stringify(matchesPeak ? assessment : alert.assessment),
        now.toISOString(),
      ],
    );
    if (raised)
      await tx.query(
        `INSERT INTO care_events(id, alert_id, actor_id, actor_name, action, text, occurred_at)
      VALUES($1,$2,'system','WardZero','severity-raised','Concern increased from Medium to High.',$3)`,
        [randomUUID(), alert.id, now.toISOString()],
      );
    return;
  }
  if (assessment.concern !== "Medium" && assessment.concern !== "High") return;
  const resolved = await tx.query<{ latest: Date | null }>(
    "SELECT MAX(evidence_at) AS latest FROM care_alerts WHERE state = 'Resolved'",
  );
  if (
    resolved.rows[0].latest &&
    Date.parse(assessment.latestObservedAt!) <=
      resolved.rows[0].latest.getTime()
  )
    return;
  const id = randomUUID();
  await tx.query(
    `INSERT INTO care_alerts(id, patient_id, severity, state, assigned_actor_id, opened_at, updated_at, evidence_at, assessment)
    VALUES($1,$2,$3,'Open',$4,$5,$5,$6,$7::jsonb)`,
    [
      id,
      PATIENT_ID,
      assessment.concern,
      DEMO_ACTORS.primary.id,
      now.toISOString(),
      assessment.latestObservedAt,
      JSON.stringify(assessment),
    ],
  );
  await tx.query(
    `INSERT INTO care_events(id, alert_id, actor_id, actor_name, action, text, occurred_at)
    VALUES($1,$2,'system','WardZero','opened',$3,$4)`,
    [
      randomUUID(),
      id,
      `${assessment.concern} concern opened an alert assigned to ${DEMO_ACTORS.primary.name}.`,
      now.toISOString(),
    ],
  );
}

export async function readCare(
  tx: Transaction,
  history: StoredReading[],
  now: Date,
): Promise<CareSnapshot> {
  const saved = await tx.query<{ payload: SavedAssessment }>(
    "SELECT payload FROM assessments ORDER BY sequence DESC LIMIT 1",
  );
  const rows = await tx.query<AlertRow>(
    "SELECT * FROM care_alerts ORDER BY (state = 'Resolved'), opened_at DESC, id DESC LIMIT 5",
  );
  const events = await tx.query<{
    id: string;
    alert_id: string;
    actor_id: string;
    actor_name: string;
    action: string;
    text: string;
    occurred_at: Date;
  }>(
    "SELECT * FROM care_events WHERE alert_id = ANY($1::text[]) ORDER BY sequence",
    [rows.rows.map((row) => row.id)],
  );
  return {
    currentAssessment: assess(history, now),
    lastAssessment: saved.rows[0]?.payload ?? null,
    alerts: rows.rows.map((row) => ({
      id: row.id,
      severity: row.severity,
      state: row.state,
      assignedActorId: row.assigned_actor_id,
      openedAt: row.opened_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      assessment: row.assessment,
      events: events.rows
        .filter((event) => event.alert_id === row.id)
        .map((event) => ({
          id: event.id,
          action: event.action,
          actorId: event.actor_id,
          actorName: event.actor_name,
          text: event.text,
          occurredAt: event.occurred_at.toISOString(),
        })),
    })),
  };
}
