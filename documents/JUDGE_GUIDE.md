# WardZero — judge guide

**Entry WZ-95CMQ · Solo build · Operation Ward Zero**

WardZero connects simulated home-care vitals and English caregiver observations to explained concern, an assigned alert, and a recorded human response. Its focus is continuity when connectivity fails or nobody acknowledges an alert.

The [current blue workspace](verification/README.md) has distinct Overview, Vitals, Care response, Observations, and Simulation pages. Identity and patient evidence stay shared, sensor streaming continues while inspecting other pages, and route navigation preserves unconfirmed requests and drafts. Measurement, freshness, and care response remain distinct states.

## See the working chain

1. Follow [SETUP.md](SETUP.md). Start the app, activate the primary caregiver in the shared identity bar, open Simulation, and create a new demo run.
2. Send three stable readings in Simulation lab, or load a stable baseline. Concern becomes Low after sufficient distinct observations.
3. Open Observations and save “More tired today and barely ate lunch.” With configured Gemini, grounded observations raise Low to Medium. Inspect the exact excerpts and evidence references; note links navigate directly to their original evidence.
4. Load deterioration in Simulation. The alert rises to High while remaining one active episode. In Care response, acknowledge, record an action, then resolve with a reason.
5. Disconnect sensor transport, generate three readings, and refresh. The queue survives. Reconnect and inspect the original timestamps and counts.
6. Create an unanswered-alert run, load deterioration, and advance 130 labeled demo seconds. Switch to the backup identity; the coordinator can acknowledge the escalated alert.

Use new runs to repeat safely; prior evidence stays in read-only archives. Demo clock changes apply to freshness, ingestion, care timestamps, and deadlines together. Session expiry uses actual wall time.

## Where to inspect the engineering

| Judging dimension | Working evidence |
|---|---|
| Integration | Browser simulator → validated API → persisted PostgreSQL → assessment/alert transaction → caregiver audit. Live Gemini is tested separately from mocks. |
| Technical execution | Run isolation, versioned rules, strict contracts, literal source excerpts, idempotent identities, and recorded state transitions. See [architecture](ARCHITECTURE.md). |
| Reliability | IndexedDB saves before transmission; failed/lost acknowledgements retain readings; duplicate replay is safe; stale history cannot create a fresh emergency. Background deadlines progress with the browser closed. |
| Practicality | One patient, clear timestamps/units, assigned ownership, a backup inbox, preserved drafts, keyboard access, and compact-screen checks. |
| Explainability and safety | Visible rule version, reading/note evidence, Unknown for inadequate current data, separate freshness and concern, and explicit AI failure. |

## Verification you can rerun

The [blue workspace report](verification/README.md) records 73 automated tests, 12 Chrome journeys, all five pages at three accessible widths, a live care journey, and browser-closed production escalation. The [note evaluation](verification/README.md#gemini-evaluation) retains the 40-case actual Gemini evaluation for unchanged extraction code. The controlled [early-warning replay](verification/README.md#controlled-replay) measures 45 seconds before the fixture's first individual threshold, with negative/stable controls and inference latency explicitly excluded. [Note results](verification/README.md#gemini-evaluation) retain baseline errors, earlier provider failures, and final raw cases. Optional email is tested against a loopback HTTP receiver with a lost acceptance and transient conflict, not a real cloud mailbox. The dependency audit reports zero advisories at verification time. These are prototype checks, not clinical validation or a guarantee against undiscovered defects.

`npm test` is deterministic and needs no AI key. `npm run test:e2e` explicitly uses a local mock HTTP provider. The opt-in live commands require a reviewer-owned Gemini key and make real provider requests. Without AI configuration, notes show Unavailable; reading-based assessment continues. There is no hidden mock fallback in the normal application.

## Boundaries

This local, single-patient prototype uses synthetic identities and measurements, engineering thresholds, and embedded PostgreSQL. It is not a validated clinical score, diagnosis, treatment system, or demonstrated 24–48-hour predictor. In-app escalation works by default. Optional email is disabled and live delivery is unverified; provider acceptance never means caregiver acknowledgement. Human caregiver testing remains unperformed. It cannot monitor continuously when the server/computer is off; persisted state and overdue deadlines recover on restart.

Local demo identities let a reviewer exercise both roles. Public interactive hosting would require production authentication, hosted durable storage, rate limiting, and a supported worker. This release remains bound to loopback.
