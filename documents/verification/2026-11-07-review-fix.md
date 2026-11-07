# Final review correction — future evidence

A fresh read-only reviewer inspected connected ingestion, care, note, run, and outbox paths and found one P2 issue predating the release diff: an accepted +1-second High reading later appeared as High in the dashboard without a persisted assessment/alert. Deadline evaluation and duplicate retry did not repair it.

Added a regression covering +1 ms, +1 second, +5 seconds, and exact-now acceptance. On the previous code it failed with **accepted instead of rejected**. Applied [ADR-005](../decisions/005-reject-future-observations.md): reject all positive future skew and retain explicit rejection reasons. No invisible future-care queue is promised.

## Executed verification

- `npm test`: **47 tests passed** across 13 files, 11.79 seconds.
- `npm run test:e2e`: **eight Chrome journeys passed**, 42.1 seconds; includes normal generation, durable replay, live-shaped mock-provider flow, care transitions, repeated scenarios, accessibility, and preserved drafts.
- Fresh reviewer independently re-probed the correction in memory: all positive offsets rejected, exact-now High still opens one alert. Verdict: approved, no further correction findings.
- `npm run build`: passed with TypeScript and all 11 runtime-data/private-environment trace checks.
- `npm run test:worker:production`: passed again on the corrected build, 10.4 seconds; autonomous browser-closed escalation and backup acknowledgement remain intact.

This tightens the initial ingestion policy without changing clinical-demo thresholds or assessment semantics. Distributed-device clock synchronization remains outside this local shared-clock prototype.
