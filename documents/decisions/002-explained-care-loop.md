# ADR-002: Versioned demo assessment and accountable care episodes

Date: 7 November 2026. Status: implemented locally.

## Context

The first slice persisted readings but did not interpret them or record a human response. The next milestone needs deterministic explanations, explicit missing-data behavior, and a durable care lifecycle. AI credentials and production identity infrastructure are not available yet.

## Decision

Use the versioned engineering parameters in `src/domain/assessment.ts` (`synthetic-v1`). They are authored for synthetic scenarios, not adapted or marketed as a validated clinical score. [CARE_LOOP_PLAN.md](../CARE_LOOP_PLAN.md) records exact limits and window requirements.

Generate an immutable saved assessment when an eligible reading is accepted. Reading insertion, assessment, episode creation, and severity changes share a transaction. A unique partial database index allows one active episode in this single-patient local run. An active episode retains its highest severity and its associated evidence. Normal readings do not resolve an episode automatically.

Current assessment is recomputed for each snapshot so stale observations become Unknown without mutating history during a GET. The last stored assessment and unresolved alert remain available. Persisted assessment IDs in alerts refer to recorded evidence; current evaluations have their own evaluation timestamp and rule version.

Require Open → Acknowledged → ActionRecorded → Resolved. Every action includes an idempotency identity. Exact retries succeed without another audit event; identity reuse with changed content conflicts. Actor/time are server-derived. A resolved episode cannot reopen from evidence at or before its observation watermark; newer concerning evidence can open a new episode.

Use an opaque, database-backed local demo session: a random 32-byte token in an HttpOnly/SameSite=Strict cookie, SHA-256 token hash in the database, eight-hour expiry. The primary caregiver is assigned; the backup role is read-only. Both roles are intentionally activatable through same-origin loopback demo controls. This simulates authorization and audit ownership; it is not production identity verification. The HTTP loopback cookie cannot use Secure; an HTTPS request sets Secure. Public hosting still requires real sign-in and server-side patient assignments.

## Alternatives and consequences

- A language model as the sole scorer would make this slice depend on provider availability and variable output. AI note extraction remains T07 and will augment deterministic evidence.
- Client-only alert state would lose ownership/history on reload. PostgreSQL records preserve it across reopen.
- Header-supplied actor identity would permit spoofing. Care-action bodies reject actor fields and resolve identity from the session.
- Treating acknowledgement as resolution would hide unfinished work. The separate action/reason steps remain visible.

Numbered, transactional schema migrations now adopt the first-slice database and create assessment, episode, audit, and session tables. A future isolated demo run and monitoring-alert episode type are still planned; this slice uses the existing fixed local workspace.
