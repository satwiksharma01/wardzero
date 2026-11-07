# Verification

The results below were executed on 7 November 2026 against application revision `2b0e2e76b1403608c0c740bb733e8c048d49d8c8`. The broader extractor evaluation belongs to unchanged core revision `d0bc83cc96eb5a1d7d5abfc76229abd33d22629e`. The 8 November documentation cleanup changed no application, test, dependency or media content and did not rerun these suites.

## Executed checks

| Check | Recorded result |
|---|---|
| Deterministic tests | 73 passed across 21 files. |
| Chrome journeys | 12 passed; regression AI requests use an explicit local mock. |
| Responsive/accessibility checks | Five pages at 320, 768 and 1440 pixels; no horizontal overflow and zero tagged axe violations across 15 combinations. This is not a full accessibility conformance claim. |
| TypeScript, ESLint, Prettier and production build | Passed; 15 server trace manifests excluded private environment files and runtime databases. |
| Actual Gemini care journey | Complete note analysis raised Low to Medium and reached a recorded caregiver response. |
| Production worker with every page closed | Exactly one overdue escalation was recorded. |
| Recorded demo | Real UI/API/database transitions and live Gemini; 180-second 1920x1080 H.264/AAC playback and seek checks passed. |
| Optional email | Loopback receiver tests only; no real cloud delivery verification. |

[Original workspace report](https://github.com/satwiksharma01/wardzero/blob/11cfc25d368033332e2a15d7af624e7651ff8f73/documents/verification/2026-11-07-blue-pages.md) · [Machine evidence](https://github.com/satwiksharma01/wardzero/blob/11cfc25d368033332e2a15d7af624e7651ff8f73/documents/verification/blue-workspace-evidence.json) · [Detailed page checks](https://github.com/satwiksharma01/wardzero/blob/11cfc25d368033332e2a15d7af624e7651ff8f73/documents/verification/blue-pages-accessibility.json)

The original workspace report retains the development HMR finding, bounded identity-read fix, evidence-link correction and sequential rerun after a trace-output collision. Failures and their corrections are not erased by this folder cleanup.

## Gemini evaluation

Forty authored synthetic English-note cases cover positive, negated, historical, uncertain and conflicting language. The development cases informed fixes; eight additional cases provide limited fresh confirmation. Earlier errors, provider failures and version comparisons remain in the [original evaluation and raw reports](https://github.com/satwiksharma01/wardzero/blob/11cfc25d368033332e2a15d7af624e7651ff8f73/documents/verification/NOTE_EVALUATION.md). These development-informed results do not establish real-caregiver or clinical NLP accuracy, multilingual performance or future provider reliability.

## Controlled replay

A constructed storage-backed replay measured concern 45 synthetic seconds before the fixture's first individual vital threshold. Stable, negated, historical and failed-analysis controls are described in the [original replay report and raw evidence](https://github.com/satwiksharma01/wardzero/blob/11cfc25d368033332e2a15d7af624e7651ff8f73/documents/verification/EARLY_WARNING.md). Model wall latency is excluded from that injected timeline. This is neither measured live clinical lead time nor a 24–48-hour prediction.

## Rerun and limits

[Setup](../SETUP.md) lists all commands. `npm test` needs no AI key; `npm run test:e2e` uses a local mock. Opt-in live commands require a reviewer-owned Gemini key and incur actual provider requests. Synthetic data only: clinical validation, real caregiver usability and cloud email delivery remain unperformed or unverified. The app cannot monitor while its server/computer is powered off. Wooble submission is not claimed.
