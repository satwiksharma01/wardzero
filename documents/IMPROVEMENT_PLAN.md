# Review-driven improvement implementation plan

> **For agentic workers:** use executing-plans to implement this plan task by task. Independent fixture authorship and final code review use fresh contexts; implementation stays incremental.

**Goal:** strengthen measured note handling, early warning, and practical evidence without expanding clinical claims.

**Architecture:** retain Next.js/TypeScript/PGlite and the bounded Gemini adapter. Add evaluation helpers outside the runtime bundle, a controlled storage-backed scenario, focused evidence UI, and a disabled-by-default durable email outbox.

**Tech stack:** existing TypeScript, Vitest, Playwright, Zod, PGlite, Gemini; one optional Resend HTTP integration.

**Spec:** [IMPROVEMENT_SPEC.md](IMPROVEMENT_SPEC.md).

## Global constraints

Synthetic data only. No real external message without direct user authorization. No claim of clinical validation or 24–48-hour prediction. Preserve origin/session checks, source timestamps, idempotency, archived runs, and explicit AI failure. All substantive documentation remains under documents/. Expected fixtures precede model outputs; development evaluation is labeled as such.

## Review focus

- Mixed negative/history/current clauses must not contaminate one another; focused context regressions own this.
- Instruction text and unresolved uncertainty/conflicts must not become unsupported current evidence; authored fixture results and guards own this.
- A provider failure must reduce measured recall rather than count as correct abstention; scorer unit tests own this.
- A lost email acknowledgement or process interruption must not change request identity or imply caregiver response; delivery persistence/retry tests own this.
- Synthetic time advance must not accelerate external retry limits or mislabel stale notes; scenario and delivery clock tests own this.

## Slice 1 — Independent note evidence

Files: `tests/fixtures/note-evaluation.ts`, `tests/helpers/note-metrics.ts`, `tests/note-metrics.test.ts`, `tests/note-context-regression.test.ts`, `tests/live/note-evaluation.probe.ts`; modify `src/domain/notes.ts`, `src/server/note-provider.ts`, and prompt metadata persistence only for proven defects.

- [x] Author fixtures and expected semantic labels without reading model outputs.
- [x] Write failing scorer/context tests and confirm their red result.
- [x] Implement `summarizeNoteEvaluation(cases)` with explicit failure/abstention semantics.
- [x] Run and retain a live baseline; fix concrete defects, version the prompt, and run the final suite.
- [x] Verify deterministic tests and report exact errors/limits; commit the slice.

## Slice 2 — Controlled early-warning replay

Files: `tests/fixtures/early-warning.ts`, `tests/helpers/early-warning-run.ts`, `tests/early-warning.test.ts`, `tests/live/early-warning.probe.ts`, and a documented repeat command.

- [x] Author timeline and control expectations: first full concern +15s, first combined-trend support +20s, first individual threshold +60s. Stable/negative/historical-only controls do not produce a note-driven alert.
- [x] Implement replay through real PGlite/ReadingStore/NoteStore with an injected clock; return first concern, marker, lead time, reasons, IDs, and care state.
- [x] Test deterministic controls and run the live provider variant; record actual lead seconds, not merely expected numbers.
- [x] Commit the repeatable scenario and evidence.

## Slice 3 — Legible evidence and practical review

Files: `src/components/care-context.tsx`, `caregiver-notes.tsx`, focused view helpers/CSS, browser tests, and `documents/USABILITY_TASKS.md`.

- [x] Make evidence source/time/eligibility and failed/empty/conflicting analysis explicit, using real stored references.
- [x] Verify real browser, compact width, keyboard/accessibility, and existing care journeys.
- [x] Prepare caregiver usability tasks; label human testing unperformed. Commit.

## Slice 4 — Optional durable email integration

Files: focused notification domain/provider/store modules, migration, escalation enqueue/worker integration, alert delivery view, `.env.example`, and delivery tests.

- [x] Verify Resend's official request/idempotency/retry constraints and capture design in an ADR.
- [x] Test persistent job uniqueness, stable retry payload/key, provider acceptance, permanent/transient failures, lease recovery, and disabled behavior before implementation.
- [x] Add bounded server delivery outside DB transactions, with actual wall-clock retry and default-disabled configuration.
- [x] Verify locally only; record real delivery unverified with no credentials/recipient authorization. Commit.

## Slice 5 — Review and public handoff

- [x] Run applicable full test/type/lint/build/browser/live checks after changes.
- [x] Request focused fresh code review; resolve material findings with regression tests.
- [x] Reconcile stale visibility/form docs, publish verified code/evidence within prior authorization, and refresh the demo/entry material as appropriate.
- [x] State exact revisions, changed files, evidence paths, measured limitations, and remaining submission gates. No final declaration/submission is inferred.
