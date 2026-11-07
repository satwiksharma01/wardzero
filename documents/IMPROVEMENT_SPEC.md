# Review-driven improvement specification

Requested through the independent review chat on 7 November 2026. The review's 82/100 baseline is an estimate, not an official score. Preserve the existing single-patient care loop, local access boundary, synthetic data, and publication authorization.

## Scope and design

1. **Note evaluation:** author English fixtures before model outputs, spanning positive/negative/history/ambiguous/typos/conflicts/instructions/unrelated text. Keep the existing observation schema. Measure unique `(code, negated, temporality)` triples per note, plus current-positive code precision/recall, exact cases, abstention, and explicit analysis failure. Failures count as missed expected observations, not successful abstention. Report raw error counts, category results, model, prompt version, fixture hash, and limitations. Use separate live-provider evidence; never call mock results live or this small development set clinical validation. Correct reproduced context defects without silently discarding failures.
2. **Early warning:** replay an authored synthetic timeline with injected observation times through real storage/care logic. Context at +15 seconds can raise concern before the first individual vital threshold at +60 seconds; a combined trend at +20 seconds provides additional evidence. Compute actual first-warning/marker times from results and include no-note, negated/historical-note, stable, and individual-only controls. Report seconds within this fixture, not real-world clinical lead time or 24–48-hour prediction. The live variant uses actual Gemini.
3. **Evidence UI:** show source, observation time, current/stale status, note analysis state, and when observations were excluded. Link current evidence to actual readings/notes. Current concern, freshness, human response, and external delivery remain separate states.
4. **Optional email:** use one bounded Resend adapter only after verifying official API/idempotency semantics. Disabled by default; no real message is authorized by this development request. Persist stable payload/idempotency identity, delivery attempts/state, bounded retry and crash recovery. Provider acceptance is not delivery, reading, or caregiver acknowledgement. Local fake-provider tests may exercise transport. With no configured recipient/provider authorization, live delivery remains unverified and no historical disabled job is sent later.

## Non-goals

No multi-patient or multilingual suite, clinical model training/validation, real patient data, fabricated caregiver testing, unsolicited external messages, or automatic final hackathon submission. Prepare usability tasks rather than invent participant feedback. Reconcile public-repository and saved-form documentation; final receipt remains pending.

## Acceptance and evidence

- Deterministic scorer unit tests distinguish errors, failures, and abstention; hand-authored fixtures are versioned before live evaluation.
- A live baseline/final report records every case; unsupported current-positive output in an abstention/negative/history/instruction case is a release concern, not averaged away.
- The synthetic timeline's computed lead times and control results match its independently authored expected times and persist actual alert/note/reading evidence.
- Browser checks cover evidence presentation, keyboard access, and compact width; existing journeys remain intact.
- Optional delivery tests prove retry/idempotency/failure/restart behavior without sending real email. UI labels are truthful.
- Run applicable full tests, lint/type/build/browser/live checks, review the change, and update public artifacts with exact evidence and limits.
