# Decisions, assumptions, and risk register

Prepared: 7 November 2026. Implementation status is tracked in TASKS.md and dated verification reports.

## Decisions and proposals

| ID | Status | Choice | Rationale / consequence |
|---|---|---|---|
| D01 | Confirmed user instruction | Store all substantive documentation in documents/. | One discoverable source of project context. |
| D02 | Confirmed context | Solo implementation. | Limit breadth and external service dependencies. |
| D03 | Implemented locally | One synthetic post-discharge patient and two response roles. | Demonstrates ownership and escalation without a hospital management suite. |
| D04 | Accepted stack; local implementation | Next.js/TypeScript and PostgreSQL. | User confirmed. Local PGlite persists to disk; hosted PostgreSQL provisioning remains open. See decisions/001-local-postgres.md. |
| D05 | Implemented locally | Deterministic concern engine plus bounded live Gemini extraction. | Structured output and source excerpts verified; no clinical forecasting claim. |
| D06 | Implemented locally | Separate concern, freshness, and response lifecycle. | Missing data, patient condition, and acknowledgement mean different things. |
| D07 | Implemented locally | Browser simulator with IndexedDB outbox and idempotent ingestion. | Verified refresh, real transport failure, lost acknowledgement, capacity, and replay; browser eviction remains a limit. |
| D08 | Implemented locally | In-app coordinator escalation as initial channel. | Autonomous worker verified; no external delivery is claimed. |
| D09 | Implemented locally | Shared virtual clock for deterministic demos. | Deadline and observation-time behavior remain coherent during acceleration. |
| D10 | Implemented locally | Polling and a one-second Node evaluator for autonomous escalation. | Simpler UI transport; background execution still needs hosting support. |
| D11 | Confirmed user instruction | Define → Plan → Build → Verify → Review → Ship. | Apply to each feature slice; see WORKFLOW.md. |

When accepted, capture expensive-to-reverse choices as sequential ADRs under `documents/decisions/`, including alternatives and consequences. Do not delete superseded decisions.

## Unresolved external questions

1. What is the actual submission deadline and timezone, distinct from registration?
2. Registration is confirmed as WZ-95CMQ; what fields/assets does the current submission form require?
3. What repository visibility/reviewer permissions does the participant want, and do additional declarations govern AI assistance or preexisting code?
4. Is public interactive hosting required by the live form? If so, which supported identity/database/worker hosting is available?
5. Are in-app alerts sufficient? The public SMS/call question is unanswered; no requirement should be invented.

## Risk register

| Risk | Impact | Mitigation and decision point |
|---|---|---|
| Ambiguous cutoff | Missed entry | Resolve T00 before scheduling; reserve at least two hours for packaging. |
| Scope exceeds solo budget | Incomplete care loop | Use roadmap compression sequence and feature freeze. |
| New stack slows delivery | Lost build time | Select familiar equivalent before scaffolding. |
| AI credentials/unreliable output | Missing deliverable or unsafe explanation | Probe early, validate schema/excerpts, use bounded retries and explicit failure status. |
| Overclaiming prediction | Weak clinical credibility | Report synthetic outcomes and limits; do not invent validation. |
| Late data appears current | Incorrect live assessment | Separate observed/received time, enforce freshness eligibility, test backlog replay. |
| Concurrent retries | Duplicate alerts/actions | Unique identities and transactional episode/action updates. |
| Scheduler unavailable | Escalation only works while UI open | Verify hosting early; label demo evaluator fallback accurately. |
| Ephemeral database | Lost history | Restart/persistence probe before UI expansion. |
| Browser queue storage fails/fills | Lost readings | Visible error/backpressure and bounded queue policy; do not promise unlimited durability. |
| Public demo mutations | Corrupted demo or AI costs | Server authorization, protected reset, rate limits, read-only public mode if needed. |
| Video/link/setup failure | Work cannot be evaluated | Rehearse twice, reproduce setup, check links and retain submission receipt. |

## Evidence provenance

Published facts come from the [challenge](https://wooble.org/companies/nursio-innovation-pvt-ltd-2/challenges/operation-ward-zero), [organizer profile](https://wooble.org/companies/nursio-innovation-pvt-ltd-2), and [submission policy](https://wooble.org/submission-and-ip-policy), inspected in this conversation. Implementation strategies, time estimates, data contracts, and scenario expectations are proposals authored for this solo project.
