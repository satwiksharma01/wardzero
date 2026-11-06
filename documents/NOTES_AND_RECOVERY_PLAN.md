# Third cycle: caregiver notes and durable recovery

Date: 7 November 2026. Define → Plan → Build → Verify → Review → Ship.

## Scope and acceptance

T07: persist an authorized caregiver note before interpretation; validate bounded AI output against an allowlisted observation schema and exact source excerpts; record model/prompt versions and visible Pending/Complete/Failed/Unavailable status. Positive current observations may raise demo concern, but absent/stale vitals remain Unknown. Negated/historical observations do not raise concern. No model-generated treatment advice or tool calls.

T08/T09: IndexedDB outbox stores each generated reading before transmission. Pending data survives reload; confirmed accepted/duplicate entries are removed only after durable acknowledgement. Conflicts/invalid entries stay visible as rejected; network/server errors retry with bounded exponential backoff. Cap stored events, expose queue depth and failure state, distinguish sensor transport outage from dashboard disconnection, and retain original timestamps during replay.

## Note interpretation contract

- Allowlisted observations: fatigue, reduced_intake, breathlessness, confusion.
- Each observation contains exact excerpt, negated boolean, and current/historical context. Excerpts must occur literally in the note; contradictory explicit negation/history is rejected.
- Note maximum: 2,000 characters; output maximum: eight observations; provider timeout: 15 seconds; bounded server response size.
- A configured OpenAI-compatible Chat Completions endpoint or Ollama structured-output endpoint can supply inference. Configuration lives only in server environment variables.
- Unconfigured provider is explicitly Unavailable. Test fixtures/mock providers are verification tools and are never represented as live AI.
- Synthetic risk fusion: current breathlessness/confusion, or two distinct current fatigue/intake observations with fresh sufficient vitals, raises at least Medium. Reasons cite note IDs and exact excerpts. Clinical validity is not claimed.

## Queue contract

One durable outbox per browser origin; event identities prevent duplicate storage during concurrent/retried delivery. Maximum 500 retained entries including rejections. Batches contain at most 50 readings. Retry backoff grows to a maximum of 30 seconds. User can simulate sensor transport disconnection while the dashboard remains online. State is reloaded from IndexedDB after refresh; simulation streaming itself pauses on reload.

## Verification

Test note source validation, negation/history, provider timeout/invalid response, unauthorized writes, actual assessment contribution, and persistence. Use a local mock HTTP provider for end-to-end protocol verification, clearly identified as a mock; live-provider proof requires actual configured inference.

Test queue capacity, reload persistence, real failed network requests, retry deduplication, rejection retention, old backlog behavior, and dashboard/sensor outage separation in a real browser. Advance the full roadmap after these checks; keep live AI and submission account requirements open until verified.
