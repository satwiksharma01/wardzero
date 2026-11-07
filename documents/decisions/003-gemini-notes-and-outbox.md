# ADR-003: Grounded Gemini observations and durable sensor outbox

Date: 7 November 2026. Status: implemented and verified locally.

## Decision

Use the participant's Gemini credential through Google's OpenAI-compatible Chat Completions endpoint. The active model is `gemini-3.5-flash-lite`, with low reasoning effort and a 15-second timeout. Google accepted model discovery; Gemini 3.8 Flash exceeded the latency bound, and the older 2.5 Flash-Lite endpoint reported unavailable for this account and recommended 3.5 Flash-Lite. The selected model passed actual inference and full application checks.

The credential is kept in ignored `.env.local`; the committed example contains placeholders only. Provider/model/base URL are configurable server environment variables. OpenAI-compatible and local Ollama adapters share the validation contract; they are not automatically substituted for failed Gemini requests.

Persist the original note before model inference, outside the final assessment transaction. Validate the returned schema, allowlisted observation codes, literal excerpts, explicit nearby negation, and historical context. Model output cannot invoke tools or directly change risk/alert state. Deterministic fusion uses only completed, current, non-negated observations with sufficient fresh vitals. A failed/unavailable analysis is visible and contributes no observations. Failed analysis can be retried without duplicating the note.

Current breathlessness/confusion, or the combination of fatigue and reduced intake, can raise the synthetic concern to Medium. These are demonstration assumptions, not a clinical score. Reasons include both reading and note IDs. This version has conservative lexical contradiction checks and does not claim comprehensive English clinical-language understanding.

Store each generated reading in IndexedDB before attempting transport. The 500-entry capacity includes rejected entries. Batches contain at most 50 eligible entries. Confirmed accepted/duplicate events are removed transactionally; invalid/conflicting entries remain inspectable. Failed requests back off from one second to a maximum of 30 seconds. Manual reconnect/retry can bypass the scheduled backoff. Original observation times and identities are preserved.

Sensor disconnection is a persisted demo control independent of dashboard transport. Browser storage failure pauses generation with an explicit error. Browser eviction, deliberate storage clearing, and total power continuity are outside the durability claim.

## Evidence

- [Gemini evaluation and original failures](../verification/NOTE_EVALUATION.md)
- [Live app journey](../verification/gemini-live-journey.json)
- [Current workspace verification](../verification/2026-11-07-blue-pages.md)

## Sources consulted

- [Google OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)
- [Google structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
- [IndexedDB transaction guidance](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
