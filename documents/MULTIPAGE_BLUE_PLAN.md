# Blue multi-page workspace

User approved the five-page split and requested blue instead of green. Preserve the calm clinical interface and real care engine. This extends the established Operate design; PRODUCT_SPEC.md remains product truth.

## Design and route contract

Actual Next.js routes: `/` Overview, `/vitals` Vitals, `/care` Care response, `/observations` Observations, `/simulation` Simulation. One route-group layout owns the sidebar, page heading, patient summary, identity controls, current concern/evidence rail, and snapshot polling. Every page renders only its relevant working content. Use Next Link, active aria-current, route metadata and normal browser history/deep links.

Keep the simulator mounted in a shared provider so streaming/retries continue while reviewing other pages. Preserve note/action draft text, pending retry identities and busy/error states in layout memory, keyed by run/note action. No patient drafts are written to URLs or new storage. Refresh still follows existing outbox/database persistence rules; unsaved text is preserved across client navigation, not claimed durable across refresh.

Replace brand/surface/focus/chart-blue accents throughout app/archive/submission presentation with navy, cobalt, pale blue and slate. Retain amber/red concern semantics, and use blue for Low/current states with explicit labels. Avoid invented metrics or claims. Preserve unrelated untracked submission draft images.

## Ordered implementation

- [x] Write a failing real-browser route/deep-link/navigation test, including route-scoped content and draft/stream continuity.
- [x] Extract shared snapshot/simulation/draft/identity state and shell; create five page routes and focused vitals components. Preserve API/domain/storage logic.
- [x] Apply blue tokens and coherent compact navigation; remove obsolete single-page layout rules.
- [x] Adapt existing journeys, live browser/worker checks and recording to actual page navigation without dropping recovery/auth/failure assertions. Verify unit/type/lint/build, Chrome/axe and a fresh independent review; run Impeccable detector.
- [ ] Commit/publish verified code, refresh three-minute media and field-ready documentation/source export, verify anonymous hashes, restore preview. No Wooble submission or real email is authorized.
