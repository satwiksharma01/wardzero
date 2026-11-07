# ADR-005 — Reject all future-dated observations

Accepted during the 7 November 2026 release review. Supersedes the initial five-second ingestion allowance; the assessment engine's no-future-evidence rule is unchanged.

## Problem

A reading one second ahead could be accepted while deliberately excluded from current care evaluation. After time caught up, the read-only dashboard derived High concern, but no new ingestion caused an alert. The deadline worker evaluates existing alerts rather than continuously generating assessments, so it could not repair that mismatch. A fresh reviewer reproduced it in memory; a new ingestion regression failed with accepted rather than rejected.

## Decision

Set positive future skew to zero. Readings at or before their source run's server clock remain eligible under the existing validation/freshness policy. Any positive offset is rejected explicitly. The outbox retains the rejected identity/reason; the system does not repair timestamps or promise eventual care evaluation for rejected evidence.

The local simulator and Node server share the host clock plus the same run offset. Normal generated observations precede API receipt. This is the smallest complete policy for the local prototype; a future distributed-device implementation would need an explicit clock-synchronization/quarantine-and-release design.

## Verification

Regression offsets are +1 ms, +1 second, and +5 seconds, with exact-now acceptance. Verify the unchanged simulator/care/recovery journeys and production build after this policy update. See the release report for executed outcomes.
