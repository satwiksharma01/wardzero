# WardZero solo-build roadmap

## Objective

Build a focused home-care prototype that demonstrates a complete, auditable path from simulated readings and caregiver observations to explained concern and a recorded human response. Optimize for evidence across the published scoring categories. Placement cannot be guaranteed.

Positioning: **Home-care monitoring that makes changing conditions and response ownership visible, including during connectivity failures.**

## Published constraints and unresolved timing

The challenge calls for a simulator, care platform, explained Low/Medium/High risk using English caregiver notes, technical documentation, source repository, and a three-minute video. Solo entry is allowed by its FAQ. No hardware is required. Source: [challenge brief](https://wooble.org/companies/nursio-innovation-pvt-ltd-2/challenges/operation-ward-zero).

The page lists 8 November 2026 as registration/closing but has an inconsistent countdown. The actual submission cutoff, timezone, and whether registration and submission close together remain unverified. Do not assume a full day is available. Confirm immediately; use relative work budgets below until then.

Multilingual input, attendance verification, equipment monitoring, and 24–48-hour forecasting appear as hints. Treat them as optional ambitions unless the organizer clarifies otherwise. Do not claim validated clinical forecasting from synthetic demonstrations.

## Scoring strategy

| Published category | Weight | Planned proof |
|---|---:|---|
| End-to-End Integration | 25% | One event trace from simulator through persistence, assessment, alert, and caregiver action. |
| Technical Skills | 20% | Validated contracts, temporal processing, bounded note analysis, and meaningful tests. |
| Reliability & Resilience | 20% | Durable queue, stale status, duplicate-safe replay, and AI failure handling. |
| Practical Implementation | 20% | A caregiver can identify concern and record action with few clear steps. |
| Explainability & Clinical Safety | 15% | Evidence-linked explanations, visible uncertainty, synthetic data, and controlled claims. |

Weights are published facts. The proof strategy is our interpretation, not an organizer-provided subrubric.

## Scope contract

### Release target

- One synthetic post-discharge patient; one primary caregiver and one backup coordinator.
- Simulated pulse, oxygen saturation, temperature, and respiratory rate with explicit units.
- Current values, trends, original observation time, and monitoring freshness.
- English caregiver notes; structured AI extraction linked to excerpts.
- Deterministic assessment from valid readings and validated note observations.
- Explicit patient concern and separate monitoring status.
- Alert ownership, acknowledgement, action recording, resolution, and overdue escalation.
- Durable simulator queue and replay; repeatable seeded scenarios.
- Complete documentation and reproducible three-minute demonstration.

### Defer

Physical devices, prescribing, diagnosis, video consultation, broad hospital administration, custom model training, multilingual notes, complex location verification, and paid communication channels. Add none until release gates pass.

## Dependency path

Contract and fixture → ingestion and persistence → dashboard → assessment → alert response → note AI → outage recovery → verification → recorded demo → submission.

Build vertical slices: every milestone should leave a demonstrable user flow. Probe database and AI availability early to avoid discovering deployment blockers at the end.

## Milestones and effort budget

These are planning estimates for a familiar stack, not delivery promises. They exclude lengthy account provisioning or learning a new framework. Reserve submission time before starting feature work.

| Milestone | Budget | Exit evidence |
|---|---:|---|
| M0: Confirm constraints and technical probes | 45–60 min | Cutoff recorded; stack selected; persistent write/read and AI structured-output probes completed. |
| M1: First live patient slice | 2–3 h | Simulator event survives persistence and appears with timestamp and trend. |
| M2: Assessment and human response | 2–3 h | Worsening fixture creates one alert; caregiver records response; audit history persists. |
| M3: Caregiver note integration | 1.5–2 h | Evidence-linked observations affect assessment; invalid/model-failure cases are explicit. |
| M4: Resilience and escalation | 2–3 h | Offline queue survives reload, replay deduplicates, stale data stays distinct, overdue alert escalates. |
| M5: Verification and interface polish | 1.5–2 h | Critical scenario matrix passes; role restrictions and small-screen flow checked. |
| M6: Package and submit | 2 h minimum | Setup reproduced, video reviewed, links accessible, submission receipt retained. |

Full target: roughly 12–17 focused hours. Re-estimate after M0 against actual remaining time.

## Checkpoints

### Gate A — M1 complete

Persisted data must reach the UI through the real application path. Fix ingestion and time handling before adding features.

### Gate B — M2 and M3 complete

Demonstrate sensor → assessment → explained alert → caregiver action. Verify note contribution rather than adding a cosmetic AI summary.

### Gate C — M4 complete

Replay must preserve original timestamps, produce no duplicate readings, and avoid treating old backlog as current. Show exactly which functions remain available during a connection failure.

### Gate D — release

All critical cases in [validation](VALIDATION.md) pass; no unsupported medical claims; setup and video are ready. Freeze features and fix defects only.

## Compression plan

If time is short, retain a thin version of every core deliverable. Reduce breadth before removing the care loop:

1. Remove decorative animation, custom chart controls, and extra patient screens.
2. Use a single patient page and compact coordinator view.
3. Use preset scenario controls instead of a general simulation editor.
4. Use polling instead of introducing a real-time messaging service.
5. Keep in-app escalation with a durable audit event; clearly label external delivery as unimplemented.
6. Retain actual bounded AI note analysis, basic role authorization, stale status, and duplicate-safe ingestion.

If the full recovery mechanism cannot be completed, report its limitation honestly and show the verified subset. Do not market an in-memory buffer as durable offline support.

## Next action

Building was authorized on 7 November 2026. Follow [WORKFLOW.md](WORKFLOW.md) for every slice. T02–T09 now implement ingestion, persistence, explained assessment, live Gemini note interpretation, alert ownership, caregiver response, and durable sensor recovery. Gate B is verified against live inference. T10 timed escalation and T11 isolated repeatable demo runs are now verified, including closed-browser production execution. Next: T12 full release audit and T13 submission package. Registration is confirmed; exact cutoff and submission fields remain open in T00.
