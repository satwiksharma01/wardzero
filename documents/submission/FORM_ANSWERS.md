# Wooble submission — field-ready answers

Based on the participant's five saved MHTML snapshots in `Downloads/submisson`, inspected on 7 November 2026. These are prepared answers, not proof that a live draft was saved or submitted. The snapshots contain no exact cutoff/timezone or additional submission declaration.

## Step 1 — Start

**Project name:** WardZero — Care with continuity

**Project kind:** Software. All sensors and identities are simulated; there is no hardware claim.

## Step 2 — Show it

Upload the actual files; Wooble says an external link alone is insufficient.

| Slot | File in this folder | Purpose |
|---|---|---|
| Walkthrough | `wardzero-demo.mp4` | Exactly 3 minutes, 1920×1080, H.264/AAC; about 9.9 MB. The form accepts MP4/MOV/WebM up to 5 minutes and 500 MB; the challenge's stricter 3-minute requirement is met. |
| Cover | `wardzero-cover.png` | 1920×1080, 16:9 project thumbnail. |
| Gallery 1 | `gallery/01-stable-overview.png` | Actual stable readings and explained Low concern. |
| Gallery 2 | `gallery/02-gemini-observations.png` | Completed live Gemini extraction with source excerpts. |
| Gallery 3 | `gallery/03-recorded-response.png` | Acknowledgement, recorded action, resolution, and history. |
| Gallery 4 | `gallery/04-durable-outbox.png` | Three queued readings remain after refresh during an outage. |
| Gallery 5 | `gallery/05-coordinator-escalation.png` | An overdue alert reaches the backup coordinator. |

Gallery images are full frames from the actual recorded app, without injected dashboard data. The cover combines the first actual screenshot with presentation text. All patient/caregiver identities are synthetic.

### IoT Simulation

Simulation lab generates stable and deteriorating synthetic vitals: pulse, oxygen saturation, temperature, and respiratory rate. Readings are saved in IndexedDB before transmission, then sent through the validated batch API into embedded PostgreSQL. The walkthrough shows sensor generation, disconnect, three queued events surviving refresh, and reconnect recovery with original timestamps. See `src/client/use-simulator.ts`, `src/client/outbox.ts`, `src/server/reading-store.ts`, and the outage/replay tests in the public repository.

### Full Stack Platform, AI/ML Risk Detection

The Next.js dashboard displays readings and trends, explains Low/Medium/High concern, and records assigned caregiver responses. Live Gemini extracts allowlisted observations from English notes with literal excerpts, negation, and time context. Deterministic engineering rules combine those observations with fresh vitals; a tiredness/intake note raises Low to Medium in the video. Deterioration raises the same episode to High. Missing/stale evidence is Unknown. Acknowledge → record action → resolve preserves the human audit trail. Unanswered alerts escalate in-app to a backup coordinator. This is a synthetic prototype, not a validated clinical predictor.

### Technical Documentation

Documentation index: https://github.com/satwiksharma01/wardzero/blob/main/documents/README.md

`documents/ARCHITECTURE.md` explains data flow, records, APIs, time, AI boundaries, persistence, and worker execution. `documents/SETUP.md` contains exact setup/build/test commands. `documents/verification/` records actual results, including clean installation, live Gemini, browser-closed escalation, replay, accessibility, and the final code-review correction. ADRs preserve implementation decisions and limits. Start with `documents/JUDGE_GUIDE.md`.

### Demo Video: 3 minute demo video

Upload `wardzero-demo.mp4` to the walkthrough slot. The 180-second video demonstrates Sensor → Platform → AI-supported concern → Alert → Caregiver Response, then durable outage recovery and coordinator escalation. It uses live Gemini, actual API/database state, and visibly accelerated synthetic time for deadline/freshness demonstrations. Captions and local synthesized narration are included. Backup video link: https://github.com/satwiksharma01/wardzero/blob/main/documents/submission/wardzero-demo.mp4

### Source Code

Public repository: https://github.com/satwiksharma01/wardzero

The repository contains application/simulator code, pinned lockfile, `.env.example` without secrets, synthetic fixtures, executable tests, README/documentation, and the walkthrough. No external patient dataset is required. Live interpretation requires a reviewer-owned Gemini key in ignored `.env.local`. Without one, notes explicitly show Unavailable and reading-based assessment continues; test mocks are separately labeled and isolated.

### Important Note — No hardware required

The entire sensor flow uses software-generated readings and self-created synthetic identities/notes. No hardware, real patient dataset, diagnosis/treatment, external SMS/call delivery, or clinically validated 24–48-hour prediction is claimed.

## Step 3 — Explain it

### The problem

A home-care handoff can fail even when a dashboard displays every reading. A caregiver still needs to know what changed, why it matters, who owns the concern, and whether anyone responded. Sensor connectivity can fail, while an unanswered alert can sit unnoticed.

WardZero explores that gap using one synthetic post-discharge patient and two care roles. The goal is a complete, inspectable chain from a simulated observation to an accountable human response, with honest behavior when evidence is missing or old. It does not claim to diagnose a patient or predict deterioration 24–48 hours ahead.

### The approach

I built the app and server in Next.js/TypeScript, with filesystem-backed embedded PostgreSQL for a reproducible local demo. A browser simulator writes readings to IndexedDB before sending them through a validated API. Idempotent event identities preserve readings through retries and lost acknowledgements; observation time stays separate from receipt time.

Gemini interprets English caregiver notes into a bounded observation schema with exact source excerpts, negation, and historical/current context. Application rules combine validated observations with fresh vital evidence to explain concern. The model has no tools and cannot execute care transitions. Failed analysis stays explicit.

One active alert episode has an assigned owner. Acknowledgement, action, and resolution are separate persisted steps. A server worker escalates unanswered alerts to a backup inbox even with the browser closed. Isolated runs and a shared, visibly advanced demo clock make the scenarios repeatable without deleting prior evidence.

The hardest design choice was to separate current concern, data freshness, and response state: closing an alert must not rewrite the patient's concern, and replaying old readings must not create a fresh emergency. I kept the scope to this working chain instead of adding hardware, a hospital-management suite, or an unvalidated clinical forecasting model.

### The result

The running walkthrough shows three stable readings establish Low concern, a live Gemini tiredness/intake observation raise it to Medium, and deteriorating vitals raise the same alert episode to High. An assigned caregiver acknowledges, records an action, and resolves with a reason; the audit trail remains inspectable.

In the recorded outage run, three baseline readings were stored before disconnect. Three more readings stayed queued across refresh, then reconnect produced six stored readings and zero queued entries, preserving original observation times. Separate tests cover actual request failure and a lost acknowledgement; retries do not duplicate persistence. This is a measured synthetic demonstration, not a patient-outcome or field-reliability result.

The current application revision passes 73 automated tests and eight Chrome journeys. The final 40-case synthetic English-note Gemini run matched all expected cases, with zero failed requests or unsupported current positives; earlier imperfect runs remain in the repository. These are development examples, not clinical accuracy evidence. A controlled storage-backed replay measures 45 seconds before its authored individual-threshold marker, excluding inference wall time; negative/historical/stable controls are included. A production-server test verifies escalation while every browser page is closed. Clean installation, tests, TypeScript, lint, and production build pass; the pinned dependency audit reports zero known advisories at verification time. Reports and executable checks are included in the repository.

### Reflection

The most useful lesson was that recovery and ownership need to be designed into the data model, not added as dashboard labels. A fresh review found a subtle accepted-future-reading gap: the dashboard could later show High without opening an alert. A failing regression reproduced it. The local shared-clock prototype now rejects every future-dated reading explicitly, while exact-time High evidence still creates an alert.

The prototype remains local, single-patient, and synthetic. Its engineering thresholds and small live-note set are not clinical validation. In-app escalation is enabled. Optional email is implemented but disabled by default; only local HTTP mock/recovery tests were performed, so live delivery remains unverified. Human caregiver usability testing is unperformed. Persisted state and overdue deadlines recover after restart, but monitoring cannot continue while the server/computer is off. Public interactive hosting would require production authentication, hosted durable storage, rate limiting, and a supported worker. Real deployment would also require clinical governance and broader independently authored evaluation.

## Step 4 — Your part & links

**Your role (60 characters maximum):** Solo builder · Full-stack implementation

**One-liner (160 characters maximum):** Explained home-care concern that survives sensor outages and tracks a caregiver's response.

**Key outcomes:**

| Value | Label |
|---|---|
| 3/3 | Queued readings recovered in the recorded outage |
| 73 | Automated behavior checks passed |
| 8 | Chrome journeys passed |

These describe prototype evidence, not clinical impact. The story records the measurement setup and baseline.

**Technologies/tools:** Next.js, TypeScript, React, PostgreSQL, SQL, Gemini, IndexedDB, Zod, Tailwind CSS, shadcn/ui, Git, Playwright.

**GitHub:** https://github.com/satwiksharma01/wardzero

**Video backup:** https://github.com/satwiksharma01/wardzero/blob/main/documents/submission/wardzero-demo.mp4

**Other link (documentation):** https://github.com/satwiksharma01/wardzero/blob/main/documents/JUDGE_GUIDE.md

**Live site:** Leave empty. The available app is a loopback preview, not public interactive hosting.

**AI tools used:** ChatGPT and Gemini. Do not select tools just because their skills were installed; selection describes actual use.

**What did you use them for?**

ChatGPT/Codex assisted planning, implementation, debugging, test design, review, documentation, and demo preparation. Runtime Gemini extracts bounded observations from English caregiver notes. Application rules and care transitions remain deterministic. All data is synthetic. Regression tests use an explicitly isolated local mock; live tests and the recorded walkthrough use actual Gemini. Narration uses an installed local synthesized voice. See `documents/AI_USE.md` for details.

**Notes for reviewers (private field):**

Start with `documents/JUDGE_GUIDE.md` and `documents/SETUP.md`. Node 22/npm 11 were verified. Run `npm ci`, `npm run build`, then `npm start`; open `http://127.0.0.1:3000`. No database account or real patient dataset is needed. Use only one app process per database directory. Activate the local primary caregiver identity to create a new run; the backup identity exercises the coordinator flow. These are demo identities, not production sign-in credentials.

For live extraction, put your own Gemini key in ignored `.env.local` with `WARDZERO_AI_PROVIDER=gemini` and `WARDZERO_AI_MODEL=gemini-3.5-flash-lite`, then restart. Without configuration, note analysis shows Unavailable and reading-based assessment still works. Never enter real patient notes or expose a key in a public field. `npm test` needs no key; `npm run test:e2e` uses installed Chrome and an explicit mock HTTP provider. Opt-in live commands make provider requests.

## Step 5 — Review

The saved review screen requires a project name, at least one native screenshot/video/PDF upload, and at least 150 characters explaining the project. Role, one-liner, and skills are recommended. The six brief-specific answers are marked Optional by the form; this package supplies all six anyway. Verify that uploaded media finished processing and the story is visible before the final submission action. No submission receipt has been recorded.
