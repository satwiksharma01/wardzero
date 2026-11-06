# Demo and submission plan

## Three-minute narrative

Lead with the caregiver problem and demonstrate causal changes in the running application. Show the simulator sending data; avoid substituting prerecorded UI state for integration proof.

| Time | Action | Evidence |
|---|---|---|
| 0:00–0:20 | Introduce one synthetic patient and the caregiver's responsibility. | Focused problem and demo label. |
| 0:20–0:45 | Start stable simulation; show dashboard timestamp and history. | Sensor-to-platform path. |
| 0:45–1:20 | Advance deterioration and submit a relevant English note. | AI extraction, changed assessment, linked readings/excerpts. |
| 1:20–1:50 | Open alert, acknowledge, record action and resolve with reason. | Human ownership and persistent audit trail. |
| 1:50–2:20 | Drop sensor transport, advance time, reload simulator, reconnect. | Stale status, surviving queue, duplicate-safe recovery. |
| 2:20–2:40 | Load a separate no-response scenario and advance the shared clock. | Overdue alert reaches coordinator view; delivery channel accurately labeled. |
| 2:40–3:00 | Show architecture, actual verification results, and key limitations. | Engineering clarity and honest claims. |

Rehearse the queue/reload segment and scenario reset before recording. Use clearly labeled accelerated time; never imply seconds of simulation are real elapsed clinical hours. If the script runs long, reduce narration rather than hiding the required care loop.

## Submission artifacts

- [ ] Source repository with application, simulator, executable tests, lockfile, fixtures, and environment-variable example without values.
- [ ] `documents/README.md` index and finalized setup, architecture, decisions, and limitations.
- [ ] Exact setup/reset/test/build commands verified against the submitted revision.
- [ ] Three-minute video playable with the intended access permissions.
- [ ] Live demo link if required or available; write/reset operations appropriately protected.
- [ ] AI provider/model requirements and a clearly labeled deterministic test/demo fallback.
- [ ] Synthetic data origin and any dependency/dataset attribution or license obligations.
- [ ] Verification report showing actual results rather than proposed targets.

The public brief asks for a repository and README. Our substantive README is `documents/README.md`; if a root README is needed for discoverability, use only a pointer there in accordance with the documentation convention.

## Before submitting

- [ ] Verify exact cutoff/timezone and required fields in the authenticated submission flow.
- [ ] Check whether a private repository needs reviewer access; do not assume public access is mandatory.
- [ ] Inspect challenge-specific terms, allowed tools, and declarations; the public page does not settle all of these.
- [ ] Open repository, video, and demo links in a clean browser context.
- [ ] Verify no keys, real patient data, or local-only absolute links are in submission materials.
- [ ] Retain confirmation/receipt and submitted revision/link details in `documents/submission-record.md`.

## Claims to use

“The prototype combines simulated vital trends and structured caregiver observations to produce explained concern and track a human response.”

“This scenario demonstrates durable sensor buffering and recovery after a transport outage.” Use only after the relevant cases pass.

## Claims to avoid

“Clinically validated,” “predicts deterioration 48 hours ahead,” “guarantees safety,” “works during any power failure,” and “emergency services notified” without independent evidence and actual implemented delivery.

## Ownership

Wooble's general [submission policy](https://wooble.org/submission-and-ip-policy) states that creators retain ownership, with limited platform/evaluation licenses. Confirm any separate terms presented during registration/submission. This note summarizes the published policy rather than resolving legal questions.
