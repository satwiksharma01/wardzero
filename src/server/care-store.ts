import { createHash, randomBytes } from "node:crypto";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import {
  CareError,
  careActionSchema,
  DEMO_ACTORS,
  type Actor,
  type AlertState,
  type DemoRole,
} from "../domain/care";

export const SESSION_SECONDS = 8 * 3600;
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function actorForSession(
  tx: Pick<Transaction, "query">,
  token: string | null,
  now: Date,
): Promise<Actor | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await tx.query<{ actor_key: DemoRole }>(
    "SELECT actor_key FROM demo_sessions WHERE token_hash = $1 AND expires_at > $2",
    [hashToken(token), now.toISOString()],
  );
  return result.rows.length
    ? (DEMO_ACTORS[result.rows[0].actor_key] ?? null)
    : null;
}

export class CareStore {
  constructor(private readonly db: PGlite) {}

  async createSession(role: DemoRole, now: Date) {
    const actor = DEMO_ACTORS[role];
    if (!actor) throw new CareError(400, "Unknown demo identity.");
    const token = randomBytes(32).toString("hex");
    await this.db.transaction(async (tx) => {
      await tx.query("DELETE FROM demo_sessions WHERE expires_at <= $1", [
        now.toISOString(),
      ]);
      await tx.query(
        "INSERT INTO demo_sessions(token_hash, actor_key, expires_at) VALUES($1,$2,$3)",
        [
          hashToken(token),
          role,
          new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString(),
        ],
      );
    });
    return { token, actor };
  }

  actorForSession(token: string | null, now: Date) {
    return actorForSession(this.db, token, now);
  }

  async recordEvent(
    alertId: string,
    token: string | null,
    input: unknown,
    now: Date,
  ) {
    const parsed = careActionSchema.safeParse(input);
    if (!parsed.success)
      throw new CareError(
        400,
        "Choose a valid action; action notes and resolution reasons need 5–1000 characters.",
      );
    const action = parsed.data;
    return this.db.transaction(async (tx) => {
      const actor = await actorForSession(tx, token, now);
      if (!actor)
        throw new CareError(401, "Activate a demo caregiver session first.");
      const alert = await tx.query<{
        state: AlertState;
        assigned_actor_id: string;
      }>(
        "SELECT state, assigned_actor_id FROM care_alerts WHERE id = $1 FOR UPDATE",
        [alertId],
      );
      if (!alert.rows.length) throw new CareError(404, "Alert not found.");
      if (alert.rows[0].assigned_actor_id !== actor.id)
        throw new CareError(
          403,
          "Only the assigned caregiver can record a response.",
        );
      const existing = await tx.query<{ equal: boolean }>(
        "SELECT (alert_id = $2 AND actor_id = $3 AND request = $4::jsonb) AS equal FROM care_events WHERE id = $1",
        [action.eventId, alertId, actor.id, JSON.stringify(action)],
      );
      if (existing.rows.length) {
        if (!existing.rows[0].equal)
          throw new CareError(
            409,
            "Action ID already belongs to a different request.",
          );
        return { status: "duplicate" as const };
      }
      const allowedFrom: Record<typeof action.action, AlertState> = {
        acknowledge: "Open",
        "record-action": "Acknowledged",
        resolve: "ActionRecorded",
      };
      const nextState: Record<typeof action.action, AlertState> = {
        acknowledge: "Acknowledged",
        "record-action": "ActionRecorded",
        resolve: "Resolved",
      };
      if (alert.rows[0].state !== allowedFrom[action.action])
        throw new CareError(
          409,
          "This alert changed. Refresh and follow its current response step.",
        );
      const text =
        "text" in action
          ? action.text
          : "Accepted responsibility for reviewing this alert.";
      await tx.query(
        `INSERT INTO care_events(id, alert_id, actor_id, actor_name, action, text, occurred_at, request)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
        [
          action.eventId,
          alertId,
          actor.id,
          actor.name,
          action.action,
          text,
          now.toISOString(),
          JSON.stringify(action),
        ],
      );
      await tx.query(
        "UPDATE care_alerts SET state = $2, updated_at = $3 WHERE id = $1",
        [alertId, nextState[action.action], now.toISOString()],
      );
      return { status: "recorded" as const };
    });
  }
}
