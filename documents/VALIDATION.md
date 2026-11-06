# Validation and clinical-safety boundaries

## Verification policy

Use deterministic fixtures and an injected clock for assessment, retries, and deadlines. Mock AI for repeatable automated tests; separately run a live-provider smoke test. Expected outcomes must be authored from the scenario specification, not copied from the engine output.

Demo rule values are engineering assumptions, not medical advice. Before implementation, record each configured threshold/window, unit, rationale, and version. If claiming a recognized clinical score, implement its complete published requirements and verify authoritative sources; otherwise do not name the prototype score after it.

## Critical scenario matrix

| ID | Input/action | Expected evidence |
|---|---|---|
| V01 | Seeded stable readings | Low concern when sufficient valid evidence exists; no patient-concern alert. |
| V02 | Gradual deteriorating fixture | Configured concern increases with evidence IDs; one active episode. |
| V03 | Relevant current note | Structured observations/excerpts affect the assessment as specified. |
| V04 | Negated symptom | No positive symptom inferred from the negated phrase. |
| V05 | Historical symptom | Historical observation distinguished from current symptom evidence. |
| V06 | Unrelated or instruction-bearing note | No unsupported clinical observations or execution of note instructions. |
| V07 | No readings/insufficient window | Unknown/incomplete assessment; no false reassurance. |
| V08 | Sensor silence | Freshness becomes delayed/offline at configured times; last concern remains timestamped. |
| V09 | Simulator network failure and reload | Pending entries remain durably queued and visible. |
| V10 | Reconnect with retries | Each valid event stored once with original time; accepted queue entries clear. |
| V11 | Same ID, different payload | Conflict surfaced; no silent overwrite. |
| V12 | Late/out-of-order readings | History preserved; current snapshot and alert eligibility stay correct. |
| V13 | Malformed or future event | Rejection/quarantine follows documented policy; no current risk corruption. |
| V14 | AI timeout/invalid schema | Analysis failure visible; reading-based assessment continues. |
| V15 | Caregiver response | Actor/time/action persist; acknowledgement alone does not resolve. |
| V16 | Unanswered deadline | Exactly one escalation per configured step; no false delivery claim. |
| V17 | Acknowledge before deadline | No unacknowledged-alert escalation after acknowledgement. |
| V18 | Unauthorized mutation | Server denies access; no data/action change. |
| V19 | Concurrent alert creation/action retry | One episode/action per identity; valid audit state. |
| V20 | App/server restart | Persisted care history and readings survive. |
| V21 | Dashboard loses network | Local banner and last-known time; no claim actions reached server. |
| V22 | Outbox capacity reached | Visible overflow/backpressure policy; no silent data loss. |

## Measurements to collect

- Generated, queued, accepted, duplicate, and rejected event counts per run.
- End-to-end event-to-display latency under a specified local/hosted setup.
- Time and number of requests to drain a known backlog.
- Alert creation, acknowledgement, action, and escalation timestamps.
- AI extraction success/failure on the authored note set with model/prompt version.
- Simulated warning lead time relative to the fixture's explicitly defined event marker.

These are prototype measurements. Synthetic lead time does not establish real-world 24–48-hour prediction. A small note set does not establish clinical NLP accuracy. Do not invent a performance target after seeing results to imply it was independently satisfied.

## Safety constraints

- Use synthetic identities, readings, and notes exclusively.
- Display demo status and analysis limitations in the interface and video.
- Do not diagnose, prescribe, or claim medical-device certification.
- Risk cannot be labeled Low merely because the model failed or the data is absent.
- Verify explanations against stored evidence; reject unsupported excerpts.
- Do not represent in-app escalation as a successfully delivered SMS/call.
- Record power-recovery limits: persisted-state recovery differs from continuous powered monitoring.
- Avoid raw note text in logs; keep provider keys server-side and outside version control.

## Evidence report format

Create `documents/verification/YYYY-MM-DD.md` during implementation with: commit/run identifier; environment; exact command or scenario; expected and actual outcome; pass/fail; screenshot/log location; unresolved defects. Never mark a planned test as executed.

Release requires all critical cases to pass or an explicit documented scope reduction with corresponding product/demo claims removed. Do not suppress checks merely to obtain a green build.
