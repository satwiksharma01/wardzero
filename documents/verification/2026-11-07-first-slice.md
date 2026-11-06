# First patient-monitoring slice: verification and review

Date: 7 November 2026, Asia/Kolkata. Scope: local simulator → validated ingestion → persistent PostgreSQL storage → patient dashboard.

## Workflow evidence

- Define: PRODUCT_SPEC.md and WORKFLOW.md.
- Plan: T01 foundation, T02/T03, freshness portion of T04.
- Build: Next.js/TypeScript dashboard, deterministic simulator, PGlite repository, local API.
- Verify: commands and scenarios below.
- Review: findings and limits below.
- Ship: local milestone only; no public deployment or hackathon submission.

## Results

| Check | Result |
|---|---|
| Initial `npm test` before implementation | Failed as expected because domain/store modules did not yet exist. |
| `npm test` after implementation | 13 tests passed: fixtures, validation, freshness boundaries, empty state, duplicates/conflicts, late arrivals, future/malformed events, concurrency, disk reopen, origin checks, and bounded JSON. |
| `npm run lint` | Passed after fixing the initial effect synchronization pattern. |
| `npm run typecheck` | Passed. |
| `npm run build` | Final production compilation passed without the earlier broad filesystem tracing warning. |
| `npm run test:e2e` | Three Chrome tests passed: simulator/persistence/stream journey, 320px and 768px layouts, API retry/conflict/origin behavior. |
| Runtime JavaScript errors during main browser journey | None observed. |
| `npm audit --omit=dev` | Zero known runtime advisories at verification time. |
| Production preview `GET /api/patient` | HTTP success with an empty persisted snapshot and Waiting status. |

Screenshots: [desktop](first-slice-desktop.png), [mobile](first-slice-mobile.png). They show synthetic data, not patient records.

## Review findings addressed

1. Local POSTs initially failed because Next.js's internal request URL can use localhost while the browser uses 127.0.0.1. The guard now validates the local Host allowlist before comparing Origin. Added a failing regression test first; the corrected browser journey passes.
2. Compact layout initially hid care context. It now retains the Not assessed state and data-confidence explanation on mobile.
3. Fixed the legend color when selecting a different metric and stacked simulation buttons at narrow widths.
4. Scoped database path selection under `.data/` and restricted names to avoid arbitrary filesystem paths and overly broad build tracing.
5. Corrected a browser test's dependency on prior test data; the API check creates its own event.

The freshness comparison was temporarily mutated from `>= 30000` to `> 30000`; the boundary test failed, and the original source was restored. This checks a specific meaningful regression, not general mutation coverage.

## Remaining limits and follow-up

- Eight moderate development dependency advisories remain in the ESLint/TypeScript-ESLint minimatch chain. These tools process repository-owned paths, are not loaded by application request handlers, and have no reported runtime audit findings. Do not apply a forced framework/lint-config major downgrade. Review compatible upstream remediation before public release; review date is the next release gate.
- ESLint 9 is pinned for plugin compatibility and is reported deprecated by npm; reassess current compatible lint tooling before the release gate.
- No full autonomous escalation, AI, clinical concern engine, role authorization, or durable browser queue is implemented yet.
- No real medical prediction validation is claimed. Current screen explicitly says Not assessed.
- Disk reopen and browser reload are verified; arbitrary power-loss durability and multi-process database access are not.
- Network retry is in-memory only. Dashboard-disconnect messaging exists; persistent offline operation remains T08/T09.
- Chrome DevTools MCP was not configured; isolated Playwright Chrome provided real-browser verification instead.
