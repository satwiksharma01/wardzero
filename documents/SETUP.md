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

The workspace now has real pages: Overview `/`, Vitals `/vitals`, Care response `/care`, Observations `/observations`, and Simulation `/simulation`. Use the persistent sidebar and identity controls. Start synthetic readings in Simulation, inspect them in Overview/Vitals, save notes in Observations, and respond in Care response. The shared concern rail remains available on every page. Sensor streaming and queued retries continue across client navigation; unsaved note/action text and unconfirmed command identities stay in layout memory. Unsaved text is not claimed durable across a full browser refresh.

`npm run dev` uses Next.js's supported `--webpack` development mode. The installed Turbopack development server repeatedly reloaded these routes in the verified Windows environment, before client state settled; restricting CSS scanning did not resolve that run. Webpack passed the same browser assertions. This is an observed development workaround, not a claim about the precise framework defect. Production `npm run build` still uses the default Turbopack compiler. See the [official CLI options](https://nextjs.org/docs/app/api-reference/cli/next).

`.npmrc` disables dependency lifecycle scripts. Installed platform packages supply the Next.js compiler and test tooling; the verified build does not require blanket enabling scripts.

The database persists in `.data/wardzero`, which is ignored by Git. No database account is needed for local storage. Live AI interpretation requires the provider configuration below. Optionally set `WARDZERO_DATA_NAME` in `.env.local` to a name containing letters, digits, underscores, or hyphens. Each name creates a separate database under `.data/`.

Run only one app instance per database name. Stop the dev server before running a production server against the same database.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server bound to 127.0.0.1. |
| `npm test` | Domain, ingestion, API-boundary, and disk-persistence tests. |
| `npm run test:e2e` | Isolated Chrome tests on port 3100 with a new database. |
| `npm run test:ai-live` | Opt-in 40-case synthetic Gemini evaluation using `.env.local`; real requests paced five seconds apart. |
| `npm run test:ai-smoke` | Original four-case real Gemini smoke suite. |
| `npm run test:early-warning` | Deterministic storage-backed timeline and controls. |
| `npm run test:early-warning-live` | Same controlled timeline with actual Gemini note extraction. |
| `npm run test:email` | Production worker against loopback mock email receiver; build first. No real email. |
| `npm run test:e2e-live` | Opt-in real Gemini app journey on port 3102; makes provider requests. |
| `npm run test:worker` | Browser-closed deadline check with a two-second test deadline, port 3103. |
| `npm run test:worker:production` | Same check against the compiled server; run `npm run build` first. |
| `npm run lint` | ESLint and React/Next.js checks. |
| `npm run typecheck` | TypeScript checking. |
| `npm run build` | Production compilation. |
| `npm start` | Run the built app locally. |

On this Windows sandbox, Turbopack needed permission to create a package junction during build. This is an execution-environment restriction, not an application dependency error.

Browser test data is isolated under `.data/browser-*`. Screenshots live in `documents/verification/`; failure traces live in ignored `test-results/`. The browser test runner owns and stops its port-3100 server.

## Current API

`GET /api/patient` returns `{ latest, history, total, monitoring, serverTime, care }`. Care contains the current assessment, last stored assessment, and up to five alert episodes with their response history. History is limited to the latest 60 readings and sorted by observation time. The reading log displays five recent rows.

`POST /api/readings/batch` accepts `{ readings: [...] }` with 1–100 entries, a JSON body under 128 KB, and a same-origin local request. Each result is accepted, duplicate, conflict, or rejected. Duplicate identity with a changed payload is never silently overwritten.

Units are encoded in metric names: `pulseBpm`, `oxygenPct`, `temperatureC`, `respiratoryRate` (breaths/minute). Timestamps use UTC ISO strings; the UI formats local time. Any observation ahead of its source run's server clock is rejected and retained in the simulator's rejected queue for inspection; timestamps are never silently repaired. Freshness changes at 30 and 90 seconds for this demo.

## Current limits

The app implements monitoring, explained concern, live AI notes, caregiver response, durable browser outbox, autonomous in-app escalation, and isolated demo runs. Source/video are public; the interactive application remains local. Optional email is disabled by default and has no live delivery verification. Production sign-in, hosted storage/worker, clinical evaluation, and final Wooble submission remain outside this local release.

## Try the care loop

1. Choose Gradual deterioration in Simulation lab and stream readings, or send thirteen readings manually from step zero.
2. Inspect Medium/High concern, reasons, and evidence IDs. An alert appears in Care response.
3. Select Ananya, the primary caregiver, and activate the local demo identity.
4. Acknowledge the alert, record an action of at least five characters, then record a separate resolution reason.
5. Refresh: the action history remains. Resolution does not change the measured concern. Pausing readings eventually makes current concern Unknown while preserving the alert history.

The backup identity can inspect but cannot respond to an alert assigned to the primary caregiver. Demo role activation is not production sign-in.

`GET/POST /api/demo/session` reads/activates the local demo session. `POST /api/alerts/:id/events` accepts a unique eventId with action `acknowledge`, `record-action`, or `resolve`; the last two require text. The actor comes from the HttpOnly session cookie. Errors distinguish malformed input (400), missing/expired session (401), unassigned actor (403), missing alert (404), and transition/idempotency conflicts (409).

Schema migrations run automatically on store initialization and preserve readings from the first milestone. Assessment parameters and limitations are recorded in [CARE_LOOP_PLAN.md](https://github.com/satwiksharma01/wardzero/blob/11cfc25d368033332e2a15d7af624e7651ff8f73/documents/CARE_LOOP_PLAN.md).

## Configure Gemini

Store these in ignored `.env.local` and restart the server:

```dotenv
WARDZERO_AI_PROVIDER=gemini
WARDZERO_AI_MODEL=gemini-3.5-flash-lite
WARDZERO_AI_API_KEY=your-private-key
```

The Gemini endpoint defaults to Google's OpenAI-compatible endpoint. Optional `WARDZERO_AI_BASE_URL` changes the server-side base URL; use HTTPS except for loopback development. No API key is exposed to the browser. Never put real keys in `.env.example` or commit them.

Activate a caregiver identity, enter an English observation, and save it. The app records Pending/Complete/Failed/Unavailable analysis and source excerpts. Missing/failed AI does not stop reading-based assessment. Retry analysis reuses the note identity.

Normal browser tests use an explicitly named local mock HTTP provider on port 3111; live tests are separate opt-in commands and use the actual configured model.

## Try offline recovery

Disconnect sensor transport in Simulation lab, generate several readings, and refresh. The durable queue and disconnected setting remain. Reconnect to sync the backlog with original times. The dashboard stays online during this simulated sensor outage. Real network failures also retain queued readings and retry with backoff. Capacity is 500 entries; conflicts/rejections are retained for inspection and count toward capacity.

## Repeatable demo and escalation

Activate the primary caregiver, then use Demo control room to create a new run. Load a stable baseline or deterioration, disconnect/reconnect the sensor, and advance demo time by 35/130 seconds to show staleness and overdue acknowledgement. Select the backup identity to inspect Coordinator inbox and respond to an escalated alert.

A new run archives earlier evidence without deleting it. Previous runs opens read-only archives. Pending sensor entries retain their source run. The visible clock offset is synthetic; sessions expire by actual wall time.

The Node server evaluates deadlines every second while it runs, even with no browser open. Default acknowledgement interval is 120 seconds; optional `WARDZERO_ACK_DEADLINE_MS` accepts 1000–900000 ms for a labeled test/demo. Deadlines and clock offsets persist across restart. In-app escalation does not send SMS/calls and cannot continue while the server/computer is off.

`GET /api/demo` lists ten recent runs. `POST /api/demo` accepts authorized, idempotent reset/seed/advance commands. `GET /archive/:id` is read-only. New readings include runId; absent runId maps to the original local run.

## Optional email adapter

Email is off unless `WARDZERO_EMAIL_ENABLED=true` and `WARDZERO_EMAIL_API_KEY`, `WARDZERO_EMAIL_FROM`, and `WARDZERO_EMAIL_TO` are all configured on the server. Use a verified Resend sender and one authorized recipient. Never enable real delivery merely to run the test suite. This project's checks use fake credentials, reserved `.invalid` addresses, and a loopback HTTP receiver; no real email was sent or verified.

At the first overdue in-app escalation, a job freezes its metadata-only payload and idempotency key. Disabled jobs never activate retroactively. The worker sends outside the database transaction, leases for 30 seconds, retries at most six times within 23 actual wall-clock hours, and cancels due work when the episode/run closes. Demo time advance does not advance retry limits. Provider acceptance is shown separately from unverified delivery/reading and caregiver acknowledgement. See [ADR-006](https://github.com/satwiksharma01/wardzero/blob/11cfc25d368033332e2a15d7af624e7651ff8f73/documents/decisions/006-optional-email-outbox.md).

`WARDZERO_EMAIL_ENDPOINT` is an optional test override restricted to Resend's exact HTTPS origin or an HTTP loopback `/emails` receiver. Invalid endpoint configuration disables email without blocking in-app escalation. The production email contract test uses ports 3107/3112 and an isolated database. Run app-owning suites sequentially; each runner stops its own server. Normal app use and tests require no email configuration.

## Reproduce the demo

Optional media tooling requires installed Chrome, FFmpeg/FFprobe and a Windows speech voice. The committed narration and closing card are the inputs; captures/audio and detailed recording reports are generated locally. This repeats actual UI/API transitions and makes live Gemini requests.

Start the production app separately with the documented Gemini configuration:

```powershell
npm run build
npm start
```

For an isolated recording port, set `PORT` on the server and `WARDZERO_DEMO_URL=http://127.0.0.1:<port>` on the recording command. The default remains port 3000. The verified refresh used port 3108 and a separate `WARDZERO_DATA_NAME`, with `WARDZERO_EMAIL_ENABLED=false`.

In a second terminal at the repository root:

```powershell
npx playwright install ffmpeg
node scripts/record-demo.mjs
node scripts/render-demo.mjs "C:/path/to/ffmpeg.exe"
node scripts/verify-video.mjs
```

Use an installed FFmpeg distribution with `ffprobe` beside its executable, H.264/AAC encoders, and the ASS subtitle filter. `record-demo.mjs` uses installed Chrome and writes raw capture under ignored `.data/demo/`. The narrator uses the installed Windows speech voice. Rendering overwrites only the generated final MP4/captions; inspect the result before replacing a submitted version.

Before rendering, generate narration from the repository root in an interactive PowerShell session (no script-execution-policy changes are required):

```powershell
Add-Type -AssemblyName System.Speech
New-Item -ItemType Directory -Force .data/demo/audio | Out-Null
$wardzeroChapters = Get-Content documents/submission/narration.json -Raw | ConvertFrom-Json
for ($wardzeroIndex = 0; $wardzeroIndex -lt $wardzeroChapters.Count; $wardzeroIndex++) {
    $wardzeroVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $wardzeroVoice.Rate = 1
    $wardzeroVoice.SetOutputToWaveFile((Join-Path (Get-Location) ('.data/demo/audio/part-' + $wardzeroIndex + '.wav')))
    $wardzeroVoice.Speak($wardzeroChapters[$wardzeroIndex].text)
    $wardzeroVoice.Dispose()
}
```

Application assertions abort recording if a concern transition, live analysis, queue recovery, or escalation is missing. The playback check verifies duration/dimensions, actual Chrome playback, seeking, and absence of media errors. It runs muted for automation; the recorded file contains narration.
