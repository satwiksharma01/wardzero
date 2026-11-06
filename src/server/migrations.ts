import type { PGlite } from "@electric-sql/pglite";

const migrations = [
  {
    version: 1,
    sql: `
    CREATE TABLE IF NOT EXISTS readings (
      event_id TEXT PRIMARY KEY, observed_at TIMESTAMPTZ NOT NULL,
      received_at TIMESTAMPTZ NOT NULL, payload JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS readings_time ON readings (observed_at DESC, event_id DESC);
  `,
  },
  {
    version: 2,
    sql: `
    CREATE TABLE assessments (
      sequence BIGSERIAL PRIMARY KEY, id TEXT UNIQUE NOT NULL, payload JSONB NOT NULL
    );
    CREATE TABLE care_alerts (
      id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, run_id TEXT NOT NULL DEFAULT 'local',
      severity TEXT NOT NULL CHECK (severity IN ('Medium','High')),
      state TEXT NOT NULL CHECK (state IN ('Open','Acknowledged','ActionRecorded','Resolved')),
      assigned_actor_id TEXT NOT NULL, opened_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
      evidence_at TIMESTAMPTZ NOT NULL, assessment JSONB NOT NULL
    );
    CREATE UNIQUE INDEX one_active_episode ON care_alerts (patient_id, run_id) WHERE state <> 'Resolved';
    CREATE TABLE care_events (
      sequence BIGSERIAL PRIMARY KEY, id TEXT UNIQUE NOT NULL, alert_id TEXT NOT NULL REFERENCES care_alerts(id),
      actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, action TEXT NOT NULL,
      text TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL, request JSONB
    );
    CREATE INDEX care_events_alert ON care_events (alert_id, sequence);
    CREATE TABLE demo_sessions (
      token_hash TEXT PRIMARY KEY, actor_key TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL
    );
  `,
  },
  {
    version: 3,
    sql: `
    CREATE TABLE caregiver_notes (
      id TEXT PRIMARY KEY, text TEXT NOT NULL, author_id TEXT NOT NULL, author_name TEXT NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL, analysis_started_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Pending','Complete','Failed','Unavailable')),
      observations JSONB NOT NULL DEFAULT '[]', model TEXT, prompt_version TEXT NOT NULL, failure_reason TEXT
    );
    CREATE INDEX caregiver_notes_time ON caregiver_notes(recorded_at DESC, id DESC);
  `,
  },
  {
    version: 4,
    sql: `
    ALTER TABLE care_alerts ADD COLUMN acknowledgement_due_at TIMESTAMPTZ;
    UPDATE care_alerts SET acknowledgement_due_at=opened_at+interval '120 seconds';
    ALTER TABLE care_alerts ALTER COLUMN acknowledgement_due_at SET NOT NULL;
    ALTER TABLE care_alerts ADD COLUMN backup_actor_id TEXT NOT NULL DEFAULT 'coordinator-backup';
    ALTER TABLE care_alerts ADD COLUMN escalated_at TIMESTAMPTZ;
    CREATE TABLE worker_heartbeat(id INT PRIMARY KEY CHECK(id=1), last_tick_at TIMESTAMPTZ NOT NULL);
  `,
  },
  {
    version: 5,
    sql: `
    CREATE TABLE demo_runs(id TEXT PRIMARY KEY, scenario TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), clock_offset_ms BIGINT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL);
    CREATE UNIQUE INDEX one_active_run ON demo_runs(active) WHERE active;
    INSERT INTO demo_runs(id,scenario,active) VALUES('local','stable',true);
    ALTER TABLE readings ADD COLUMN run_id TEXT NOT NULL DEFAULT 'local' REFERENCES demo_runs(id);
    UPDATE readings SET payload=payload || jsonb_build_object('runId',run_id);
    CREATE INDEX reading_run_time ON readings(run_id,observed_at DESC);
    ALTER TABLE assessments ADD COLUMN run_id TEXT NOT NULL DEFAULT 'local' REFERENCES demo_runs(id);
    ALTER TABLE caregiver_notes ADD COLUMN run_id TEXT NOT NULL DEFAULT 'local' REFERENCES demo_runs(id);
    ALTER TABLE care_alerts ADD CONSTRAINT alert_run_reference FOREIGN KEY(run_id) REFERENCES demo_runs(id);
    CREATE TABLE demo_commands(id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES demo_runs(id), request JSONB NOT NULL, payload JSONB, created_at TIMESTAMPTZ NOT NULL);
  `,
  },
];

export async function migrate(db: PGlite) {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
  for (const migration of migrations) {
    await db.transaction(async (tx) => {
      const existing = await tx.query(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [migration.version],
      );
      if (existing.rows.length) return;
      await tx.exec(migration.sql);
      await tx.query("INSERT INTO schema_migrations(version) VALUES($1)", [
        migration.version,
      ]);
    });
  }
}
