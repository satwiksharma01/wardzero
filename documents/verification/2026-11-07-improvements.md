# Reviewed improvement release

Verified 7 November 2026. Application revision **d0bc83cc96eb5a1d7d5abfc76229abd33d22629e**, built on baseline 74b8411. Commits 4105902 and d0bc83c contain the implementation. Later documentation/media commits do not change the app. This is a verified local prototype, not a submitted hackathon entry.

## What changed

- English note extraction now isolates negation, history, uncertainty, instructions, and observer symptoms more conservatively. Shared history travels forward through coordinated clauses without leaking backward. Retried analysis records the actual extraction version, `notes-v3`.
- An independently authored 32-case development suite and eight later confirmation cases measure exact cases, abstention, failures, and observation precision/recall. The final actual Gemini run matched 40/40 cases, with 33/0/0 all-observation TP/FP/FN and 17/0/0 current-positive TP/FP/FN. Earlier imperfect runs remain available. See [method and limits](NOTE_EVALUATION.md).
- A storage-backed synthetic replay measured a first warning at +15 seconds and first individual threshold at +60 seconds: 45 seconds within that constructed timeline. Negative, historical, stable, no-note, and failed-analysis controls are explicit. Inference wall time is excluded. See [scenario and controls](EARLY_WARNING.md).
- The UI identifies vital/note sources and times, links actual note evidence, marks stale/excluded/failed/abstained analysis, and provides a direct care-response link. Reading and note identities cannot collide when resolving evidence.
- A default-disabled optional Resend adapter freezes payload/key in migration 6. Delivery uses wall-clock leases, bounded retries, cancellation/expiry maintenance even when disabled, and metadata-only API state. Provider acceptance cannot acknowledge care. No real email was sent.

## Executed checks

| Command / check | Actual result |
|---|---|
| `npm test` on final reviewed source | **73 tests passed**, 21 files, 23.16 seconds. |
| `npm run lint` | Passed. |
| `npm run typecheck` / build TypeScript phase | Passed; final build checks TypeScript again. |
| `npx prettier --check src tests playwright*.ts vitest*.ts package.json` | Passed. |
| `npm run build` | Passed; **11 server trace manifests** exclude runtime database/private environment files. |
| `npm run test:e2e` | **8 Chrome journeys passed**, 39.7 seconds. Includes actual mock HTTP integration, outage/replay, role/origin protection, repeatable runs, preserved drafts, evidence-use/stale labels. |
| Accessibility/compact screen audit | Zero tagged axe violations at **320, 768, 1440px**; no page overflow in tested states. See accessibility.json. |
| `npm run test:ai-live` | **40 actual Gemini cases**, 40 complete/exact, 12 correct abstentions, zero failed requests/unsupported current positives; 196.99 seconds. Source hashes match final app source. |
| `npm run test:early-warning-live` | Eight authored storage-backed variants passed with actual Gemini on six note-bearing variants; 31.61 seconds. |
| `npm run test:e2e-live` | Actual Gemini → Medium concern → recorded caregiver response passed in Chrome; 12.1 seconds including server setup. |
| `npm run test:email` | Compiled production worker → loopback HTTP mock: lost first acknowledgement, transient 409, then acceptance. **3 requests / 1 logical acceptance**, identical key/payload, care remains Open. 17.6 seconds including setup. |
| `npm run test:worker:production` | Browser-closed deadline escalation and coordinator response passed; 11.0 seconds including setup. |
| Email persistence/recovery tests | Disk close/reopen preserves an interrupted Sending job and request identity; expired lease recovers it. Permanent errors, six-attempt cap, 23-hour expiry, disabled history, archive/ack cancellation, and independent wall time pass. Disk reopen is tested; no abrupt process-kill claim is made. |
| `npm audit --json` | **0 advisories** at verification time; dependency-audit.json. |
| Publication credential scan | Zero configured-key/token-pattern matches in source candidates or Git blobs. Exact file/object counts and timestamp are in publication-scan.json. This is a targeted scan, not proof against every possible secret format. |

## Independent review

A fresh context reviewed the entire change against IMPROVEMENT_SPEC/PLAN without credentials or write access. It found three material issues: shared historical scope loss, retryable Resend concurrency conflicts treated as permanent, and cancellation maintenance stopping when the provider was disabled. Failing regressions reproduced all three. A follow-up caught backward history contamination in the first fix; a reverse-order failing regression reproduced it. The final focused review confirmed all three original findings resolved and found no additional material issue in the fixes. Full deterministic/build/browser/live checks then passed as listed above.

## Evidence and reproducibility

Raw [final note results](note-evaluation-notes-v3.json), [retained v2 results](note-evaluation-notes-v2.json), [paced baseline](note-evaluation-notes-v1.json), and [rate-limited burst baseline](note-evaluation-notes-v1-burst.json) are distinct runs, not pooled accuracy claims. Fixture/source hashes and every case are retained. Final [early-warning evidence](early-warning-live.json), [local email protocol evidence](email-loopback.json), and [closed-browser worker evidence](closed-browser-worker.json) record actual results. Source code lives under src/, executable checks under tests/, and documentation under documents/.

## Limits and external gates

All identities, readings, and notes are synthetic. The note fixtures are agent-authored and small; lexical guards and perfect scores on these examples do not establish general English or clinical correctness. The eight confirmation examples were fresh for v2 and reused for v3. No patient outcome, real-world warning interval, or 24–48-hour prediction is demonstrated. [Caregiver usability tasks](../USABILITY_TASKS.md) are prepared, but human testing is **unperformed**.

Optional email is **disabled by default**. Live cloud acceptance, mailbox delivery/reading, and recipient response remain **unverified**; local mock evidence must not be described as real email delivery. The app remains bound to loopback with demo roles and local embedded PostgreSQL; public production hosting requires appropriate identity, storage, worker, and operational work. The powered-off server cannot monitor continuously.

Source/video publication is authorized and the repository is PUBLIC. The saved five-step Wooble form is mapped in submission/FORM_ANSWERS.md. No live draft save, final declaration, submission, or receipt is claimed. Exact cutoff/timezone remains unresolved. The final exported source/media hashes are recorded in local submission/ARTIFACTS.json.

## Refreshed media

The three-minute video was re-recorded against application revision d0bc83c, using actual production UI/API/database transitions and live Gemini, isolated synthetic data, and email disabled. All checkpoints passed. Narration, captions, and closing card now report 73 tests, eight Chrome journeys, and 40 synthetic live cases. Chrome decoded the final 180-second 1920×1080 encode, played, sought to 150 seconds, and continued without errors. Gallery frames and cover were refreshed from that footage; the closing card and representative evidence/mobile states were visually inspected. Video SHA256: `9228b5fdb82742366b6269b71d77169ca5b6c118d1903ea3f92f74da824ae177`. [Changed implementation files](changed-implementation-files.json) records the exact baseline-to-application file list.
