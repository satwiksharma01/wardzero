# Run WardZero locally

## Requirements

- Node.js 22 (verified with 22.14.0) and npm 11 (verified with 11.4.0).
- Windows, macOS, or Linux with a writable project directory. This milestone was verified on Windows.
- Chrome installed for the current Playwright configuration (`channel: chrome`).

## Start

From the repository root:

```powershell
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Initial state is intentionally empty. Open Simulation lab, choose a scenario, and send a reading or stream every five seconds. Refresh the page to verify stored history.

`.npmrc` disables dependency lifecycle scripts. Installed platform packages supply the Next.js compiler and test tooling; the verified build does not require blanket enabling scripts.

The database persists in `.data/wardzero`, which is ignored by Git. No database account or AI key is needed for this slice. Optionally set `WARDZERO_DATA_NAME` in `.env.local` to a name containing letters, digits, underscores, or hyphens. Each name creates a separate database under `.data/`.

Run only one app instance per database name. Stop the dev server before running a production server against the same database.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server bound to 127.0.0.1. |
| `npm test` | Domain, ingestion, API-boundary, and disk-persistence tests. |
| `npm run test:e2e` | Isolated Chrome tests on port 3100 with a new database. |
| `npm run lint` | ESLint and React/Next.js checks. |
| `npm run typecheck` | TypeScript checking. |
| `npm run build` | Production compilation. |
| `npm start` | Run the built app locally. |

On this Windows sandbox, Turbopack needed permission to create a package junction during build. This is an execution-environment restriction, not an application dependency error.

Browser test data is isolated under `.data/browser-*`. Screenshots live in `documents/verification/`; failure traces live in ignored `test-results/`. The browser test runner owns and stops its port-3100 server.

## Current API

`GET /api/patient` returns `{ latest, history, total, monitoring, serverTime, care }`. Care contains the current assessment, last stored assessment, and up to five alert episodes with their response history. History is limited to the latest 60 readings and sorted by observation time. The reading log displays five recent rows.

`POST /api/readings/batch` accepts `{ readings: [...] }` with 1–100 entries, a JSON body under 128 KB, and a same-origin local request. Each result is accepted, duplicate, conflict, or rejected. Duplicate identity with a changed payload is never silently overwritten.

Units are encoded in metric names: `pulseBpm`, `oxygenPct`, `temperatureC`, `respiratoryRate` (breaths/minute). Timestamps use UTC ISO strings; the UI formats local time. Observations over five seconds in the future are rejected. Freshness changes at 30 and 90 seconds for this demo.

## Current limits

The app now implements explained demo concern, persistent alerts, local demo sessions, and caregiver response in addition to monitoring. AI notes, durable browser outbox, escalation, production sign-in, isolated demo runs, and deployment remain pending. The simulator retains a failed reading only in memory for retry; it does not yet survive a tab reload. Do not use real patient data or expose this local milestone publicly.

## Try the care loop

1. Choose Gradual deterioration in Simulation lab and stream readings, or send thirteen readings manually from step zero.
2. Inspect Medium/High concern, reasons, and evidence IDs. An alert appears in Care response.
3. Select Ananya, the primary caregiver, and activate the local demo identity.
4. Acknowledge the alert, record an action of at least five characters, then record a separate resolution reason.
5. Refresh: the action history remains. Resolution does not change the measured concern. Pausing readings eventually makes current concern Unknown while preserving the alert history.

The backup identity can inspect but cannot respond to an alert assigned to the primary caregiver. Demo role activation is not production sign-in.

`GET/POST /api/demo/session` reads/activates the local demo session. `POST /api/alerts/:id/events` accepts a unique eventId with action `acknowledge`, `record-action`, or `resolve`; the last two require text. The actor comes from the HttpOnly session cookie. Errors distinguish malformed input (400), missing/expired session (401), unassigned actor (403), missing alert (404), and transition/idempotency conflicts (409).

Schema migrations run automatically on store initialization and preserve readings from the first milestone. Assessment parameters and limitations are recorded in [CARE_LOOP_PLAN.md](CARE_LOOP_PLAN.md).
