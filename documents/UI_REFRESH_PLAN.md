# Calm clinical UI refresh

User-selected direction: calm clinical workspace, 7 November 2026. Use the installed Impeccable, UI/UX Pro Max, Emil design engineering, Apple Design and shadcn resources. Product truth remains PRODUCT_SPEC.md; this is an Operate surface, refining the existing forest/sage identity rather than creating a new brand.

## Design contract

The first screen answers who is monitored, how current the evidence is, and where a caregiver should act. Keep synthetic identities, original observations, concern/freshness/response distinctions, all errors and limitations, real charts and care actions. Use a restrained forest/sage/ivory palette, readable type, tabular measurements, visible focus, and consistent 44px controls. Give care response and observation entry adjacent space on desktop; stack at compact widths. Keep demo tools visually secondary and fully available. Avoid decorative animation on clinical values; press feedback respects reduced motion.

UI/UX Pro Max's initial broad search returned a dark operations landing-page pattern; that conflicts with the chosen daylight caregiver workflow. Its narrower healthcare color search and Swiss clarity guidance inform the design, with the existing forest identity retained. Apple guidance informs type, proximity, touch targets and feedback. Impeccable informs hierarchy, real states and rendered verification. shadcn source components supply reusable accessible controls.

## Implementation plan

- [ ] Add Tailwind build support and shadcn source primitives without replacing app configuration or resetting the existing CSS. Record installed skill paths/versions.
- [ ] Refine dashboard navigation, patient header, measurement hierarchy, and care/tool composition. Adopt shared buttons, field/textarea and badges while preserving accessible control names and state ownership.
- [ ] Replace scattered visual values with coherent tokens and responsive rules, using no new scoring/provider behavior.
- [ ] Verify unit/type/lint/build, all browser journeys and axe at320/768/1440. Inspect empty/complete/failed/stale/mobile renders; run Impeccable detector and independent code review. Fix material regressions.
- [ ] Commit and publish within existing authorization, restore local preview, refresh submission visuals/video/source export or state exact artifact revision if refresh is blocked. No Wooble submission is inferred.

## Verification strategy

The existing73behavior checks cover the unchanged care logic. Existing real-Chrome journeys protect sessions/origin, note failure and contributions, lost acknowledgements, recovery, run isolation and response transitions. Extend the release journey for new section navigation and layout if needed; don't add tests mirroring CSS. Fresh browser screenshots and the retained previous screenshots provide visual comparison. AI extraction is unchanged, so avoid rerunning the40-case provider suite for a presentation change.
