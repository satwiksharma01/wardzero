# Live English-note evaluation

7 November 2026. Actual Gemini `gemini-3.5-flash-lite`; final extraction version `notes-v3`. These are small synthetic engineering evaluations, not clinical accuracy estimates.

A fresh fixture author wrote 32 cases before seeing model output or extractor implementation. They cover positives, negation, history, uncertainty, typos, contradictions, instructions, and unrelated text. After the v2 extractor was frozen, the author supplied eight new confirmation cases without seeing the implementation or outputs. None of the confirmation outputs was used to tune v2. Both sets are versioned in `tests/fixtures/`.

## Final reviewed v3 result

The final 40-case run completed all 40 analyses and matched all 40 expected cases. It recorded 12 correct abstentions, zero failed requests, and zero unsupported current positives. All-observation TP/FP/FN was **33/0/0**; current-positive TP/FP/FN was **17/0/0**, giving 100% precision/recall on this specific small run. Development (32) and reused confirmation (8) partitions both matched exactly. The confirmation set was fresh before v2; it is not a new unseen holdout for v3.

Fresh code review found shared history losing scope through “and she…”. A regression reproduced it; v3 retains preceding historical scope unless the clause explicitly resets to current time. A reverse-order regression also ensures a later historical clause cannot contaminate an earlier current observation. The review approved both directions after the fix. An initial v3 live run was interrupted when the reverse-order finding arrived and is not counted as final evidence. The final run's source hashes match the reviewed source at application revision `d0bc83c`.

Raw final cases, category counts, fixture/source hashes, and latency are in [note-evaluation-notes-v3.json](note-evaluation-notes-v3.json). This perfect result on 40 authored examples does not establish general language accuracy or provider reliability; the retained v2 failures below show that transport outcomes vary.

## Retained v1/v2 measurements

| Measurement | v1 development (32) | v2 same development (32) | v2 new confirmation (8) | v2 combined (40) |
|---|---:|---:|---:|---:|
| Completed analysis | 26 | 30 | 8 | 38 |
| Failed analysis | 6 | 2 | 0 | 2 |
| Exact cases, including correct abstention | 24 | 30 | 8 | 38 |
| Correct empty abstentions | 6 | 11 | 1 | 12 |
| Current-positive TP / FP / FN | 12 / 2 / 0 | 12 / 0 / 0 | 5 / 0 / 0 | 17 / 0 / 0 |
| Current-positive precision / recall | 85.7% / 100% | 100% / 100% | 100% / 100% | 100% / 100% |
| All-observation TP / FP / FN | 20 / 2 / 4 | 21 / 0 / 3 | 9 / 0 / 0 | 30 / 0 / 3 |
| All-observation precision / recall | 90.9% / 83.3% | 100% / 87.5% | 100% / 100% | 100% / 90.9% |

The unit is a unique `(code, negated, temporality)` triple per note. Current-positive metrics use unique observation codes. Failed cases count as missing expected observations and never as correct abstention or exact matches. The two final failures were HTTP 503 responses (`conflicting-03`, `historical-03`); they account for three missing all-context observations. A 5% request-failure rate remains part of this run's evidence. No unsupported current positive occurred in the final 40 cases.

The baseline exposed current-positive outputs for two uncertain notes, and clause-context validation rejected four otherwise usable negative/conflicting cases. Regression tests reproduced context leaking between clauses, history leaking into current symptoms, contradictory current labels, and uncertainty/planned/schema/caregiver statements. V2 uses bounded clause context and a more explicit extraction prompt. A retried note now records the prompt version actually used. This is conservative lexical validation, not a general language-understanding guarantee.

## Reproduce and audit

`npm run test:ai-live` makes 40 real provider requests, sequentially at least five seconds apart, using ignored `.env.local`. It writes `note-evaluation-${NOTE_PROMPT_VERSION}.json`. The retained [v2 report](note-evaluation-notes-v2.json) remains unchanged alongside the final v3 report. Provider/model behavior can vary on another run. Deterministic scorer/context tests run with `npm test` without a key.

The paced v1 report is [note-evaluation-notes-v1.json](note-evaluation-notes-v1.json). An earlier concurrent run hit HTTP 429 limits; [its original report](note-evaluation-notes-v1-burst.json) is retained and is not pooled into the paced comparison. The eight confirmation cases were absent from the v1 run, so compare the 32-case columns when comparing versions.

Expectations were authored by an independent agent context, not a clinician or external institution. The development cases informed the fixes, and eight additional synthetic cases provide limited fresh confirmation. This does not establish performance on real caregivers, other languages, uncommon phrasing, or clinical outcomes.
