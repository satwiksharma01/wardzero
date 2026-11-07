# WardZero documentation

All project documentation belongs in `documents/`, including plans, specifications, architecture decisions, setup instructions, verification reports, and submission materials. Keep implementation code and executable tests outside this folder.

**Reviewing the entry? Start with the [judge guide](JUDGE_GUIDE.md)** for the working flow, evidence by judging criterion, and prototype boundaries. [AI/data disclosure](AI_USE.md) describes the runtime model and development assistance.

## Read in this order

1. [Roadmap](ROADMAP.md): strategy, milestones, time budgets, and release gates.
2. [Product specification](PRODUCT_SPEC.md): users, scope, behavior, and acceptance criteria.
3. [Architecture](ARCHITECTURE.md): proposed stack, data contracts, persistence, and failure handling.
4. [Implementation tasks](TASKS.md): ordered, actionable checklist with verification.
5. [Validation and safety](VALIDATION.md): scenario matrix, evidence, and claim boundaries.
6. [Demo and submission](SUBMISSION.md): three-minute script and submission checklist.
7. [Decisions and risks](DECISIONS.md): proposed decisions, unresolved questions, and mitigations.
8. [Project workflow](WORKFLOW.md): Define → Plan → Build → Verify → Review → Ship for every slice.
9. [Local setup](SETUP.md): run the application and its checks.
10. [Care loop plan](CARE_LOOP_PLAN.md): assessment and caregiver-response rules and scope.
11. [Notes and recovery plan](NOTES_AND_RECOVERY_PLAN.md): AI boundaries and durable queue behavior.
12. [Entry evidence](HACKATHON_ENTRY.md): registration and unresolved submission details.

## Status and maintenance

- Prepared: 7 November 2026, Asia/Kolkata.
- Stage: the core local care loop is implemented. Source and video are in the [public repository](https://github.com/satwiksharma01/wardzero), following the participant's publication authorization. The saved five-step form is mapped in [field-ready answers](submission/FORM_ANSWERS.md). The [improvement plan](IMPROVEMENT_PLAN.md) adds broader [live note evaluation](verification/NOTE_EVALUATION.md), [controlled early warning](verification/EARLY_WARNING.md), evidence clarity, and optional default-disabled email. Final Wooble submission, exact cutoff/timezone, and receipt remain pending.
- Working project name: WardZero; subject to participant approval.
- Participant: solo builder.
- Update task status only after its acceptance criteria are verified.
- Record verification results in this folder with date, command/scenario, result, and evidence location. Planned checks are not passed checks.
- Store future setup guidance in `documents/SETUP.md` and architecture decisions under `documents/decisions/` when implementation choices are accepted.
- If a hosting service requires a root README, use only a short link to this index; keep substantive documentation here.

## Sources

- [Operation Ward Zero challenge](https://wooble.org/companies/nursio-innovation-pvt-ltd-2/challenges/operation-ward-zero)
- [Organizer profile](https://wooble.org/companies/nursio-innovation-pvt-ltd-2)
- [Wooble submission and IP policy](https://wooble.org/submission-and-ip-policy)

Source facts, planning assumptions, and proposed behavior are distinguished throughout. Organizer requirements take precedence over this plan if clarified later.
