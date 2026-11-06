# Autonomous escalation verification

Date: 7 November 2026. Scope: T10.

- `npm test`: 39 automated tests passed, including exact deadline, concurrent evaluation, backup permission, and acknowledgement-before-deadline cases.
- `npm run lint` and `npm run typecheck`: passed.
- `npm run build`: passed with the previously documented local data-directory tracing warning.
- `npm run test:worker`: passed. The browser context was closed for four seconds after creating an alert with a two-second test deadline; the next read-only snapshot showed exactly one escalation, proving the timer ran without dashboard polling. The backup coordinator then acknowledged it in the UI.
- Evidence: [worker timestamps](closed-browser-worker.json), [coordinator view](coordinator-escalation.png).

The persisted policy defaults to a 120-second acknowledgement interval; `WARDZERO_ACK_DEADLINE_MS` may configure 1–900 seconds for labeled tests/demos. The one-second Node timer starts through Next.js instrumentation. Worker heartbeat and the in-app channel are visible. Acknowledgement stops unacknowledged escalation; repeated ticks do not duplicate events.

This runs while the Node server is active, including with no browser open. It does not run through server/computer power loss. Persisted deadlines permit catch-up on restart. No external notification delivery is claimed. Run-isolation work follows as T11.
