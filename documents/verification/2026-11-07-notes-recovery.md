# Caregiver AI and durable recovery verification

Date: 7 November 2026, Asia/Kolkata. Goal progress: implemented and verified T07–T09; timed escalation, isolated demo runs, full release audit, and final submission remain open.

## Results

| Check | Result |
|---|---|
| `npm test` | 37 tests passed across 11 files. |
| `npm run lint` and `npm run typecheck` | Passed. |
| `npm run build` | Passed with the previously documented local data-directory tracing-size warning. |
| `npm run test:e2e` | Six Chrome tests passed, including notes, complete response, durable reload/replay, lost acknowledgements, and dashboard disconnection. |
| `npm run test:ai-live` | Four real Gemini note cases passed with positive, negated, historical, and unrelated/instruction-like content. |
| `npm run test:e2e-live` | Real Gemini app journey passed: stable Low → note-supported Medium → assigned caregiver action recorded. |
| Credential scan | Zero credential occurrences in tracked or unignored project files; `.env.local` is ignored. |

Live inference timings were approximately 0.8–2.0 seconds for the four authored cases. This small synthetic set is integration evidence, not a clinical NLP accuracy estimate. Exact outputs/model/timestamps are in [gemini-live.json](gemini-live.json). The full live app result is in [gemini-live-journey.json](gemini-live-journey.json).

## Behaviors verified

- Notes persist before inference; absent configuration, provider errors, malformed output, unsupported excerpts, and explicit negation/history contradictions are handled visibly.
- Only validated current observations contribute to assessment. Notes cannot turn missing vitals into Low concern or execute embedded instructions.
- An actual live model changes the app assessment and produces evidence-linked alert state.
- IndexedDB entries survive close/reopen and page refresh; original timestamps are preserved.
- Capacity is enforced; rejected/conflicting entries remain available for inspection.
- Only matching, validated acknowledgements clear pending entries. Network failure retains them with bounded backoff.
- A request stored by the server whose acknowledgement is lost retries as duplicate, adding no second reading.
- A stale high-concern backlog is retained without a current alert; fresh stable evidence remains Low.
- Sensor transport outage is distinct from dashboard disconnection. The latter shows current assessment Unavailable until reconnected.

## Review findings addressed

Deduplicated reading IDs in fused note evidence after the browser reported duplicate React keys. Preserved original request IDs for note retries. Separated note-reading functions from the provider/store orchestration to avoid circular dependencies. Rejected excerpts that omit nearby explicit negation. Automatic generation respects retry scheduling; explicit reconnect may force a retry.

A mutation that stopped clearing duplicate acknowledgements was caught by the outbox regression test; the original behavior was restored and the focused tests passed. Notes were also verified to survive database close/reopen.

## Artifacts

- [Live Gemini care loop](live-gemini-care-loop.png)
- [Recovered queue](recovered-queue.png)

## Remaining limits

Local demo identity is not production sign-in. AI availability depends on the configured provider and account. Browser storage may be cleared or evicted; no claim of uninterrupted powered monitoring is made. Notes and readings currently belong to the fixed local workspace; isolated demo runs are T11. Escalation remains T10. Public release, complete validation matrix, video, remote source links, and actual submission receipt remain pending.
