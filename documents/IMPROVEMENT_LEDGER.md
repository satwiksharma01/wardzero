# Improvement execution ledger

## Setup

Base: 74b8411. Preserve the untracked submission cover/gallery/form answers prepared before this review. Work stays on the existing feature checkout so the independent reviewing chat sees the actual project state; do not alter a shared main checkout or discard prior artifacts.

Ruling: Use the existing feature workspace rather than a hidden extra checkout — the external reviewer and local preview point here; isolated fixture authorship touches only assigned test files. Cost if wrong: another simultaneous writer would need coordination before overlapping source edits.

## Note evaluation

- Fresh fixture author created 32 synthetic cases before model output, with 6 positive, 5 negated, 4 historical, 5 ambiguous, 3 typo, 3 conflict, 4 injection, and 2 unrelated cases.
- Scorer RED: missing module. GREEN: two tests verify FP/FN/duplicate/context accounting and failed-vs-abstained behavior.
- Context RED: three tests expose four defects: mixed negation, mixed history, unresolved current contradiction, and uncertain positive proposal.
- Burst live baseline (notes-v1, two concurrent requests) recorded 32 cases, including rate-limit failures and an unsupported current positive. Original report retained as `note-evaluation-notes-v1-burst.json`.

Ruling: Repeat baseline and final evaluation sequentially with five-second request spacing — the burst hit provider rate limits. Keep the burst evidence, and do not treat its transport-limited recall as a pure model-accuracy estimate. Cost if wrong: provider limits may still cause explicit failures, and a comparison with different traffic patterns would be misleading unless labeled.

## Completed slices and review

- Slice 1: scorer/context regressions RED → GREEN. Paced v1: 24/32 exact, six failures, two unsupported current positives. V2: 38/40 exact, two HTTP 503 failures, no unsupported positives. Fresh review exposed shared history through coordination; the regression and reverse-order regression both went RED → GREEN. Final frozen notes-v3 run: 40/40 exact, 12 correct abstentions, all-observation 33 TP / 0 FP / 0 FN, current-positive 17 TP / 0 FP / 0 FN, no request failures. The initial v3 run was interrupted for the reverse-order fix and is not counted. V1/v2 raw reports retained. Eight confirmation fixtures were fresh for v2 and reused for v3. No clinical accuracy claim. Source hashes match final source.
- Slice 2: deterministic replay/control tests and final live eight-variant replay pass. First current-note concern +15s, combined reading/note evidence +20s, individual marker +60s: 45s constructed lead; no-note/negative/history trend lead 40s. Stable negative controls produce no alert. Stable-current intentionally triggers the configured context rule. Provider latency excluded and recorded, not hidden.
- Slice 3: note-use helper and source-kind collision tests RED → GREEN. Eight Chrome journeys pass, including explicit incomplete/failed/stale labels and direct response navigation. Axe reports zero tagged violations at 320/768/1440; screenshots visually inspected. Human testing is unperformed; tasks prepared in USABILITY_TASKS.md.
- Slice 4: migration 6, default-disabled Resend adapter, metadata-only durable jobs, lease recovery, six-attempt/23h cap, and wall-clock retry pass. Persistence test closes/reopens disk DB with Sending job. Final production loopback protocol: lost first acceptance, transient concurrent 409, third attempt accepts same logical message; 3 requests / 1 acceptance, same body/key, care Open. Real cloud email was not sent or verified.
- Review: fresh whole-change reviewer found three material defects (history scope, Resend409 handling, provider-disabled cancellation). All reproduced RED and corrected. Follow-up found reverse history contamination, then approved the final correction. No remaining material finding in focused review.
- Source commits: 4105902 (notes/evidence/scenarios) and d0bc83c (optional durable email). Final application revision: d0bc83cc96eb5a1d7d5abfc76229abd33d22629e.
- Final verification: 73 tests / 21 files, lint, TypeScript, formatting, artifact-checked build with 11 traces, eight Chrome journeys, 40 live notes, live early-warning controls, live care journey, production email mock, production browser-closed worker pass. Audit 0. Detailed evidence:verification/2026-11-07-improvements.md.

Ruling: Keep the existing publication target and publish the reviewed improvements without repeating the public/private question — the participant explicitly authorized a public repository earlier. Do not infer permission to send real email or submit final declarations. Cost if wrong: final live form decisions remain for the participant, while reversible source/media publication proceeds within recorded authorization.

## Handoff in progress

Repository metadata rechecked PUBLIC / default main. Five saved form steps are mapped; no exact cutoff/timezone or live submission receipt is known. Old private-repository/current-form wording is reconciled in current handoff docs while historical reports retain their original evidence. A fresh full production recording is being prepared; source export/hash/anonymous link checks follow publication.
