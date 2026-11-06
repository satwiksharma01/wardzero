# Second slice: explained concern and caregiver response

Date: 7 November 2026. Workflow: Define → Plan → Build → Verify → Review → Ship.

## Define

Implement T04–T06 for the current synthetic patient. A fresh reading should produce an explained assessment; Medium/High concern should open one persistent alert; the assigned caregiver should acknowledge, record an action, and resolve with a reason. Resolution must not pretend the measured concern has disappeared.

Acceptance: stable inputs give Low after enough evidence; insufficient or stale evidence gives Unknown; worsening inputs produce explicit evidence; reading retries and concurrent ingestion produce one episode; actions persist with actor/time; invalid transitions, anonymous actions, and the wrong assigned actor are rejected.

## Plan

1. Define versioned synthetic scenario rules and their unit tests.
2. Add numbered database migrations, assessment persistence, and one-active-alert uniqueness.
3. Evaluate readings and update alerts transactionally with accepted ingestion.
4. Add local demo caregiver sessions and authorized, idempotent care events.
5. Display evidence, ownership, response controls, and audit history.
6. Verify domain/storage/API/browser paths, review the change, and update the running local app.

## Rule assumptions

These are transparent engineering parameters for the synthetic demo, not a clinical score or validated treatment guidance.

- Window: last 120 seconds; current evidence must be less than 90 seconds old and not future-dated. At least three readings at distinct observation times are needed for a Low or trend-only assessment. One configured high-concern reading can raise concern immediately.
- Example high-concern triggers: oxygen <=92%, pulse >=115 bpm, temperature >=39 °C, or respiratory rate >=26/min.
- Example medium-concern triggers: oxygen <=95%, pulse >=100 bpm, temperature >=38 °C, respiratory rate >=22/min, or oxygen falling >=2 percentage points together with pulse rising >=10 bpm across at least three distinct observations spanning >=10 seconds.
- High wins over Medium; normal fresh but insufficient evidence stays Unknown. Stable fixtures with enough evidence become Low.
- Every reason includes the exact observed values and supporting event IDs. Persist the rule version and assessment time.
- Stale current evidence yields Unknown without erasing the last persisted assessment or resolving an existing alert.

## Alert policy

Create at most one open patient-concern episode for the current single-patient demo. Severity can increase within an episode but cannot silently downgrade. Updates retain history. Resolution requires acknowledgement, action text, and a separate resolution reason. Replayed evidence cannot reopen a resolved episode: a new episode requires a newer observation time than the resolved episode's evidence watermark. Current run isolation will be added with T11; this slice uses the existing single workspace.

## Local identity boundary

Use a server-issued opaque demo-session cookie stored in the database. Only a same-origin loopback request can activate an allowlisted demo identity. The assigned primary caregiver may perform care transitions; the backup coordinator is read-only until a later explicit reassignment/escalation policy exists. Actor identity never comes from the care-action payload. Sessions expire after eight hours; session tokens are hashed in storage and not returned in JSON.

Demo identity activation is role simulation on a loopback-only app, not production identity verification. Real sign-in remains a prerequisite for public hosting. No third-party auth service or paid integration is added.

## Verify and review

Use fixed-clock domain tests, transactional storage/concurrency tests, session/authorization tests, persistence reopen, real API requests, and a browser journey through acknowledgement/action/resolution. Keep mobile controls readable. AI note interpretation and escalation remain separate roadmap tasks.
