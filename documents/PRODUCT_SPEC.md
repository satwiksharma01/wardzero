# Product specification

## Users and outcome

The primary caregiver needs to see a patient's current concern, understand supporting evidence, and record a response. A backup coordinator needs to see unanswered alerts. A reviewer needs a deterministic way to replay the complete flow.

Use synthetic data only. This is an educational prototype, not a validated clinical monitoring service.

## Screens

1. **Patient overview:** identity label, concern, monitoring status, latest readings with units and timestamps, trend windows, active alert, recent notes, and response history.
2. **Caregiver response:** evidence, assigned owner, acknowledgement, free-text action, resolution reason, and escalation history. This may be a panel on the overview.
3. **Demo controls:** start/reset scenario, advance virtual time, disconnect/reconnect simulator transport, trigger AI failure. Visibly separate from caregiver controls and protect mutations.

An administrative demo reset must never be reachable by an unauthenticated public visitor.

## Functional acceptance criteria

| ID | Requirement | Acceptance |
|---|---|---|
| FR01 | Sensor simulation | Stable and deteriorating seeded runs send valid events through ingestion, not direct UI mutation. |
| FR02 | Persistence | Refresh and server restart preserve accepted readings and care actions with a durable database. |
| FR03 | Temporal correctness | Charts use observed time; receipt time remains inspectable; future/invalid timestamps are rejected or quarantined under a documented policy. |
| FR04 | Concern | Valid evidence produces Low/Medium/High with assessment version and reasons; inadequate evidence yields Unknown rather than Low. |
| FR05 | Notes | English notes produce schema-validated observations with source excerpts, temporal context, and negation handling. |
| FR06 | Human response | A named authorized actor acknowledges, records action, and resolves with reason; history persists. |
| FR07 | Escalation | A configurable unacknowledged deadline creates one backup-coordinator escalation; repeats do not duplicate it. |
| FR08 | Freshness | Current/Delayed/Offline is computed from observation freshness, independently of patient concern. |
| FR09 | Recovery | Pending events survive simulator reload, replay in bounded batches, and are removed only after confirmed acceptance. |
| FR10 | Safe replay | Retrying an event creates one stored reading; late history cannot overwrite the latest snapshot or create a current emergency from stale evidence. |
| FR11 | AI failure | Missing/invalid AI output is visible; valid reading assessment continues; note analysis is not falsely marked complete. |
| FR12 | Demo repeatability | Reset creates a fresh run with deterministic fixtures and isolated history. |

## State semantics

- Concern: `Unknown | Low | Medium | High`. Unknown is an internal safety state in addition to the challenge's requested three assessed levels.
- Monitoring: `Waiting | Current | Delayed | Offline`; Waiting means no observations exist yet. Thresholds are explicit demo configuration, not clinical recommendations. The interface separately displays Connecting/Disconnected for dashboard transport state.
- Alert lifecycle: `Open → Acknowledged → ActionRecorded → Resolved`.
- Escalation is an independent event and does not imply resolution or real-world contact.
- Acknowledgement deadline stops after acknowledgement; unresolved follow-up reminders are a separate optional policy.
- Resolution requires an action and reason; no automatic resolution merely because later data looks better.
- One active patient-concern episode per patient/run; changing severity updates the episode with audit history. Monitoring alerts use a separate episode type.

## Safety and usability

Show observation age, missing signals, analysis status, and synthetic/demo labels. Never rely on color alone. Provide keyboard-accessible controls and useful loading/error states. Preserve typed notes on recoverable errors. Avoid diagnosis, medication advice, and invented emergency instructions.

## Boundaries

Initial offline support covers the simulator-to-platform transport. If the dashboard can still reach the server, it can show server-computed stale status. If the dashboard itself is offline, show a local connectivity banner and last-known timestamp; do not claim server actions or escalations were delivered. Full offline caregiver action sync is outside the initial scope.

## Success measures

Measure synthetic scenario outcomes, event-to-display latency, queue recovery counts, duplicate suppression, and alert acknowledgement latency. Define targets and record actual results before claiming performance. Do not interpret these measures as clinical accuracy.
