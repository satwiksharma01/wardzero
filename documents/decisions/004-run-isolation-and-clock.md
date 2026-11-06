# ADR-004: Isolated evidence runs and a shared demo clock

Date: 7 November 2026. Status: implemented locally.

## Decision

Store durable demo runs with an active flag and persisted clock offset. Reset creates a new active record without deleting earlier evidence. Reading, assessment, note, episode, and command queries are scoped to a run. Version-five migration adopts existing evidence into the original `local` run and adds run identity to reading payloads, preserving retry equality.

Use wall time for session expiry and worker heartbeat. Use wall time plus run offset for observation time, assessment, care-event timestamps, freshness, and acknowledgement deadlines. Advances are idempotent, bounded to one hour per command and one day accumulated per run. The UI labels advanced demo time.

Presets persist command plans and deterministic event IDs, then use normal ingestion. Retrying reproduces the original readings. A timestamp tie is ordered by the single simulator's sequence, then event ID.

Old queued readings return to their source archive and cannot change active monitoring. A note inference finishing after reset stays in its original run. Archived care actions are read-only. The index lists ten recent runs; direct archive links remain usable for older known IDs. Changing runs resets the sensor-disconnection control while retaining queued data; refreshing the same run retains disconnection state.

## Consequences

The source contract includes runId; absent runId maps to `local` for compatibility. New UI requests supply the current run. Accelerated demonstrations use synthetic timestamps, with wall time separately available in the snapshot.

Next.js instrumentation and API handlers may bundle separate error-class instances. Expected errors use a stable internal brand and checked status rather than constructor identity, preserving permission failures as 401/403.

Reset/seed/advance require a valid primary-caregiver demo session and same-origin loopback request. Production identity and hosted scheduling remain necessary if a public interactive deployment is chosen.
