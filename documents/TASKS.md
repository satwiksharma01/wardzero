# Implementation checklist

Status: first local slice implemented; T00/T01 partially complete, T02/T03 complete, T04 freshness started. Budgets are in [ROADMAP.md](ROADMAP.md). Follow [WORKFLOW.md](WORKFLOW.md) for each slice. Keep work in focused increments and record actual evidence.

## T00 — Confirm participation and constraints

- [ ] Record registration status, actual submission cutoff/timezone, submission fields, and any additional rules.
- [ ] Confirm familiar stack, available AI credentials, hosting access, and actual work budget.
- [ ] Resolve architecture proposals in DECISIONS.md or explicitly retain a documented fallback.

Dependencies: none. Verification: inspect authenticated submission requirements manually; do not infer unknown fields. Files: documents/DECISIONS.md, documents/ROADMAP.md. Scope: small.

## T01 — Prove environment and persistence

- [x] Scaffold the chosen application and locked dependency installation.
- [x] Demonstrate database write/read across close/reopen using filesystem-backed embedded PostgreSQL.
- [ ] Complete one schema-validated live AI extraction probe when provider access is available.
- [x] Record exact working setup/build/test commands in documents/SETUP.md.

Dependencies: T00. Verification: run the clean build, restart persistence probe, and AI success/failure probes. Proposed files: package/config, database schema/client, environment example. Scope: medium; split scaffolding from probes if needed.

## T02 — Define event and scenario contracts

- [x] Define reading units, event identity, timestamp policy, batch limits, and response schema.
- [x] Create stable/deteriorating deterministic fixtures and an injected clock.
- [x] Define expected outcomes independently of implementation output.

Dependencies: T01. Verification: contract tests reject malformed units/timestamps and reproduce fixture order. Proposed files: domain/contracts, simulation/fixtures, domain/clock, focused tests. Scope: medium.

## T03 — Deliver one persisted reading to the dashboard

- [x] Ingest, persist, and retrieve a valid reading through real API calls.
- [x] Display values, units, observed time, and receipt time where inspectable.
- [x] Reject invalid input and duplicate/conflicting identity appropriately.

Dependencies: T02. Verification: integration test with database plus manual simulator-to-screen check and refresh. Proposed files: ingestion route, reading repository, snapshot route, patient page, integration test. Scope: medium.

## Checkpoint A

- [x] Build passes and persisted events are visible through the application path.
- [x] Record evidence and fix contract/time errors before expanding.

## T04 — Implement concern and freshness

Freshness and time ordering are implemented; concern scoring is still pending. The UI explicitly says Not assessed.

- [ ] Version configurable demo rules for trends, minimum evidence, and freshness eligibility.
- [ ] Produce evidence-linked Low/Medium/High or Unknown independently of monitoring status.
- [ ] Keep delayed history from masquerading as current data.

Dependencies: T03. Verification: stable, deteriorating, missing, old, and future-data tests with fixed clock. Proposed files: assessment engine, freshness module, assessment persistence, status UI, tests. Scope: medium.

## T05 — Open one alert episode

- [ ] Persist one active episode per patient/run/type and update severity with audit history.
- [ ] Link alert to assessment evidence and owner.
- [ ] Prevent duplicates under ingestion retry/concurrency.

Dependencies: T04. Verification: retry and concurrent-request integration tests; inspect evidence in UI. Proposed files: alert service/repository, schema migration, alert panel, tests. Scope: medium.

## T06 — Record authorized caregiver response

- [ ] Implement acknowledgement, action recording, and resolution with transition validation.
- [ ] Enforce role/patient access on server and persist actor/time/reason.
- [ ] Preserve separate acknowledgement and resolution semantics.

Dependencies: T05. Verification: complete journey, invalid transition, unauthorized actor, and duplicate action retry. Proposed files: authorization adapter, care event route/service, response UI, tests. Scope: medium; separate auth setup if necessary.

## T07 — Add bounded AI note interpretation

- [ ] Persist notes and analysis status; extract allowlisted observations with verified source excerpts.
- [ ] Incorporate validated observations into assessment while preserving evidence provenance.
- [ ] Handle negation, history, unrelated text, instructions in notes, timeout, and invalid output explicitly.

Dependencies: T04, T06. Verification: deterministic mocked-provider tests plus recorded live-provider smoke test; note-only changes must demonstrate actual contribution. Proposed files: note route/service, AI adapter/schema, note UI, tests. Scope: medium; split provider adapter from integration if necessary.

## Checkpoint B

- [ ] Demonstrate sensor → platform → AI-supported assessment → alert → recorded response.
- [ ] Verify reasons match stored evidence and no clinical validation claims appear.

## T08 — Persist the simulator outbox

- [ ] Save events before transmission; retain pending events across reload.
- [ ] Implement bounded retry, batch acknowledgement, rejection inspection, and queue capacity behavior.
- [ ] Expose disconnect/reconnect and queue depth in demo controls.

Dependencies: T03. Verification: actual request failure, reload, reconnect, duplicate acknowledgement, and capacity edge case. Proposed files: outbox store, transport, simulator UI, tests. Scope: medium.

## T09 — Verify replay correctness and outage UI

- [ ] Replay backlog with original observation times and no duplicate persistence.
- [ ] Show delayed/offline monitoring without converting unknown evidence into low concern.
- [ ] Distinguish simulator transport outage from dashboard network loss.

Dependencies: T04, T08. Verification: fixed-clock recovery integration test and browser outage journey. Proposed files: replay integration, connectivity indicator, history/snapshot handling, tests. Scope: medium.

## T10 — Escalate unanswered alerts

- [ ] Persist configurable acknowledgement deadlines and backup role.
- [ ] Run an idempotent evaluator and stop acknowledgement escalation when acknowledged.
- [ ] Demonstrate autonomous evaluation or label any request-driven demo fallback precisely.

Dependencies: T06. Verification: before/at/after deadline, acknowledged alert, repeated worker run, and closed-browser execution where supported. Proposed files: escalation evaluator, scheduler entry, coordinator view, tests. Scope: medium.

## Checkpoint C

- [ ] Durable recovery, stale-state behavior, AI failure, and escalation scenarios pass.
- [ ] Record exact limits of connectivity/power recovery and notification delivery.

## T11 — Make the demo repeatable

- [ ] Protect reset and seed a new isolated run with synchronized virtual time.
- [ ] Provide stable, deterioration, outage, and no-response controls.
- [ ] Show scenario/run identity clearly and reset without deleting unrelated runs.

Dependencies: T07, T09, T10. Verification: execute the full script twice with identical expected outcomes. Proposed files: demo route/service, scenario controls, browser test. Scope: medium.

## T12 — Validate and polish the caregiver journey

- [ ] Execute every critical case in VALIDATION.md and fix failures.
- [ ] Check keyboard access, readable small-screen layout, timestamps, errors, and note preservation.
- [ ] Complete build/type/lint checks configured by the project and record results.

Dependencies: T11. Verification: focused regression tests, browser journey, and verification report with actual commands. Proposed files: affected interface files, focused tests, documents/verification report. Scope: split fixes into small tasks as discovered.

## T13 — Package, record, and submit

- [ ] Reproduce setup from a clean environment and finalize architecture/limitations documentation.
- [ ] Record and inspect the three-minute video; verify repository, deployment, and video permissions.
- [ ] Submit through the required flow before verified cutoff and retain confirmation.

Dependencies: T12. Verification: independent link-open check, video playback, setup run, and submission receipt. Files: documents/SETUP.md, documents/SUBMISSION.md, documents/verification report, video artifact. Scope: medium.

## Release gate

- [ ] All core deliverables have evidence; optional omissions are explicit.
- [ ] No secrets or real patient data are included.
- [ ] Documentation matches actual behavior, commands, and limitations.
- [ ] Submission confirmation is retained; completion is not inferred from an upload alone.
