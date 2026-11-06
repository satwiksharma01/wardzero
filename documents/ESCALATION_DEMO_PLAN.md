# Fourth cycle: escalation and isolated demo runs

Date: 7 November 2026. Define → Plan → Build → Verify → Review → Ship.

## Define

T10: an unanswered alert has a persisted acknowledgement deadline and escalates exactly once to the backup coordinator. Acknowledgement stops this timer. Escalation is delivered in the coordinator's in-app view and is recorded in the audit trail; no SMS/call delivery is claimed. It must work while the browser is closed and recover overdue deadlines after server restart.

T11: a protected reset creates a new isolated run without deleting earlier readings, notes, alerts, or audit events. A shared server-side demo clock supports labeled time advances. The simulator, note assessment, alert deadlines, and response timestamps use that clock; sessions use actual wall time. Preset scenarios make the full demo reproducible.

## Plan

1. Persist deadline, escalation timestamp, backup actor, and worker heartbeat in numbered migrations.
2. Implement an idempotent transaction evaluator and a one-second Node server timer, initialized by Next.js instrumentation. GET snapshots remain read-only.
3. Show deadlines, escalation history, backup response rights, and worker status.
4. Add run identity and clock offset; scope readings, assessments, notes, episodes, and snapshot queries to the active run.
5. Add authorized reset/advance/preset controls and archive access for prior runs. Old queued readings retain their original run and never change the active run's assessment.
6. Verify boundary times, acknowledgement races, restart recovery, browser-closed execution, run isolation, and two repeatable demo cycles.

## Policy

Default acknowledgement interval: 120 seconds. Environment may configure 1–900 seconds for a labeled test/demo. Once overdue while still Open, record a single in-app escalation and make the backup coordinator eligible to respond alongside the primary caregiver. Keep the assigned primary identity visible. Acknowledged/ActionRecorded/Resolved episodes do not receive unacknowledged-alert escalation.

The in-process timer requires the local Node server to remain running. Persistent deadlines allow catch-up after restart, but do not provide monitoring while the computer/server is powered off. A hosted multi-instance deployment will need a shared external scheduler and production identity.
