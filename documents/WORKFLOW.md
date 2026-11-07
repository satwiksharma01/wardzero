# Project workflow

Confirmed by the participant on 7 November 2026. Apply this sequence to each meaningful feature slice and to the final release:

**DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP**

| Stage | Shortcut vocabulary | Work | Gate evidence |
|---|---|---|---|
| Define | /spec | Refine the problem, users, scope, and expected behavior. | PRODUCT_SPEC.md and measurable acceptance criteria. |
| Plan | /plan | Choose the smallest complete slice, dependencies, and test approach. | TASKS.md, architecture decisions, and a named milestone. |
| Build | /build | Implement the planned behavior in small increments. | Working code and focused regression tests. |
| Verify | /test | Execute tests, build, and browser checks; debug observed failures. | Dated verification report with actual results. |
| Review | /review | Check correctness, architecture, readability, security, and performance. | Findings resolved or explicitly recorded with scope limits. |
| Ship | /ship | Package the verified result and deploy/submit at the appropriate milestone. | Reproducible setup, working links, and release/submission evidence. |

These slash names describe our workflow; they do not assert that custom slash commands have been installed. Repeat Verify and Review after relevant fixes. A local slice can be ready for handoff while public deployment remains pending; never label that as a live release.

## Completed cycle: first persisted patient slice

- Define: use the existing single-patient synthetic-data spec.
- Plan: implement T01 foundation (excluding unavailable live AI probe), T02 contracts, T03 ingestion and display, and freshness from T04.
- Build: Next.js/TypeScript; embedded PGlite locally, with a documented PostgreSQL server migration path.
- Verify: malformed/future events, duplicates/conflicts, out-of-order arrival, persistence across reopen, freshness boundaries, production build, and browser journey.
- Review: verify the real simulator/API/database path and limits of local-only access.
- Ship: local runnable milestone; public deployment, AI, risk scoring, and caregiver response remain later tasks.

Deadline and registration verification remain open external questions and do not block reversible local implementation. The user has now authorized building the roadmap.

## Completed cycle: explained concern and caregiver response

- Define/Plan: [CARE_LOOP_PLAN.md](CARE_LOOP_PLAN.md) specifies T04–T06 and rule assumptions.
- Build: versioned assessment, transactional episodes, local demo sessions, caregiver transitions, and audit UI.
- Verify: domain/storage/session/migration/persistence tests plus real-browser response journey and mobile checks.
- Review: evidence provenance, no automatic resolution, idempotency, stale behavior, and authorization regression experiment.
- Ship: refreshed local preview; AI notes, offline outbox, autonomous escalation, and public identity/deployment remain pending.

## UI design contract

No product reference screens were supplied; the attachment specifies process. Initial visual assumptions: a quiet clinical workspace, warm neutral canvas, dark forest navigation, teal accents, readable large vital values, thin borders, and compact care context. Avoid decorative medical claims or fake live status.

The overview's job is to make the last received evidence legible. Its primary demo action sends a real simulated reading. Show explicit empty/loading/error states, visible timestamps, separate transport freshness, and a keyboard-accessible simulation panel. At small widths, stack the content and reduce navigation to a compact header.

## Completed cycle: caregiver notes and durable recovery

- Define/Plan: NOTES_AND_RECOVERY_PLAN.md.
- Build: grounded Gemini extraction, persistent note statuses, deterministic fusion, IndexedDB outbox, bounded retries, and transport controls.
- Verify: 37 automated tests, six mock-provider browser tests, four real Gemini cases, and a full live Gemini browser journey.
- Review: source-context validation, unique evidence IDs, retry identity, old-backlog safety, and credential isolation.
- Ship: local preview; next cycle is T10 escalation and T11 repeatable demo runs.

## Completed cycle: autonomous escalation and isolated demos

- Define/Plan: ESCALATION_DEMO_PLAN.md.
- Build: persisted deadlines, in-process evaluator, coordinator inbox, run-scoped evidence, shared demo time, protected presets/reset, and read-only archives.
- Verify: 45 automated tests, seven browser tests, two repeated demo cycles, and browser-closed checks in development and production.
- Review: cross-bundle error identity, snapshot ordering across clock reset, pending-data preservation, and late AI completion isolation.
- Ship: local milestone. Next cycle: full release audit and submission artifacts.

## Completed cycle: release audit

- Define/Plan: execute V01–V22 and the T12 usability checks.
- Build: contrast and keyboard-scroll fixes, polite concern announcements, accurate archive errors, targeted lint dependency patch, and a draft-preservation browser check.
- Verify: 46 automated tests, eight browser journeys, four live Gemini cases, live care journey, browser-closed production worker, lint, formatting, and artifact-checked production build.
- Review: no unresolved core-matrix failures; zero current npm advisories. See verification/2026-11-07-release.md for scope and limits.
- Ship: verified local release candidate. T13 source setup, video, and authenticated submission remain open.

## Packaging cycle

- Define/Plan: match the public source/README/video requirements and preserve honest clinical boundaries.
- Build: judge guide, submission copy, disclosure/credits, real UI recording, synthesized narration, captions, and source export.
- Verify: clean application revision 264d833 installs/tests/builds; final demo transitions assert successfully; local video is decoded and played in Chrome.
- Review: fresh code review found one accepted-future-evidence gap. ADR-005 and a failing-then-passing regression resolve it; reviewer approved the correction.
- Ship: local artifacts prepared. External visibility, live form/declarations, cutoff, permission checks, and receipt remain pending; see submission-record.md.
