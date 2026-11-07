# Controlled early-warning replay

7 November 2026. Repeat with `npm run test:early-warning` (deterministic) or `npm run test:early-warning-live` (actual configured Gemini). Both use the real PGlite reading/note/assessment/alert path with injected synthetic observation times. The authored fixture is `tests/fixtures/early-warning.ts`; machine evidence is [early-warning-live.json](early-warning-live.json).

## Actual synthetic result

| Run | First concern | First reading + note support together | First individual vital threshold | Lead within fixture | Alerts |
|---|---:|---:|---:|---:|---:|
| Declining vitals + current tiredness/intake note | +15s | +20s | +60s | 45s | 1 |
| Same vitals, no note | +20s | — | +60s | 40s | 1 |
| Same vitals, negated note | +20s | — | +60s | 40s | 1 |
| Same vitals, historical note | +20s | — | +60s | 40s | 1 |
| Stable vitals, no note | None | — | None | — | 0 |
| Stable vitals, negated note | None | — | None | — | 0 |
| Stable vitals, historical note | None | — | None | — | 0 |
| Stable vitals + current tiredness/intake note | +15s | — | None | — | 1 |

At +15s, fresh normal vitals plus the current positive note trigger the configured contextual rule. At +20s, oxygen has fallen from 98 to 96 and pulse has risen from 76 to 88 across multiple distinct observations. Those changes trigger the existing combined-trend rule while individual measures remain below their concern thresholds. At +60s, oxygen 95 and pulse 100 first cross individual thresholds. The individual-only comparator applies the same vital rules to each single reading, excluding trends and notes; it is not an independently validated clinical baseline.

The stable-current row deliberately raises concern: the configured fatigue-plus-reduced-intake rule can raise Low to Medium with otherwise stable fresh vitals. It would be misleading to count this row as a negative control. Stable no-note/negated/historical rows are the negative controls. A failed-analysis deterministic control also proves that failed notes add no context and the trend warning still begins at +20s.

Live evidence records every stored reading/note, assessment reason/reference, alert, and provider status. All six note-bearing live runs completed. Provider wall latency is recorded as `noteAnalysisElapsedMs` and excluded from the injected timeline. Therefore **45 seconds is measured within this constructed replay, not end-to-end live inference latency, real-patient lead time, a clinical benefit, or a 24–48-hour prediction**. The rules and timeline were authored for engineering verification; real clinical evaluation remains unperformed.
