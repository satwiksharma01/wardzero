# Prepared submission text

Use these with the saved five-step form mapping in FORM_ANSWERS.md. Public repository/video URLs are available; current server fields, final declarations, exact cutoff/timezone, and submission remain pending.

## Project title

WardZero — Care with continuity

## One-line pitch

Explained home-care concern with durable sensor recovery and an accountable caregiver response.

## Short description

WardZero connects simulated vital trends and English caregiver observations to explained Low/Medium/High concern, an assigned alert, and a recorded human response. Gemini extracts bounded observations with literal evidence; deterministic rules assess concern. IndexedDB buffering survives sensor outages and refresh, while idempotent ingestion preserves original timestamps. Unanswered alerts reach an in-app backup inbox through a server worker. Synthetic data and explicit limits keep the prototype's claims reviewable.

## Problem and approach

After discharge, a caregiver needs more than a stream of numbers: they need to understand what changed, who owns the concern, and whether anyone responded. Connectivity gaps and unanswered alerts can interrupt that handoff.

The working flow is simulator → validated ingestion → persistent PostgreSQL → explained assessment → one active alert → acknowledgement, action, and resolution history. English observations add contextual evidence through live Gemini extraction. Missing, stale, or failed analysis stays explicit. An advanced demo clock makes outages and deadlines repeatable, and each new run archives prior evidence rather than deleting it.

## Technical implementation

Next.js, TypeScript, React, embedded PostgreSQL/PGlite, Zod, Gemini structured output, native IndexedDB, and a one-second Node deadline evaluator. Care mutations use server-assigned demo roles and opaque sessions. Event and action identities make retries safe. Model/prompt versions and source evidence remain inspectable.

## Reliability and verification

73 automated tests, eight Chrome journeys, a 40-case synthetic live Gemini evaluation, a live provider care journey, and browser-closed escalation against the production server. The release audit covers 22 critical scenarios including malformed/future data, late replay, lost acknowledgements, AI failure, unauthorized mutation, restart recovery, and bounded queue capacity. A clean checkout installs, tests, builds, and starts without a key; AI status then shows Unavailable.

## Prototype boundaries

Single synthetic patient, engineering demo thresholds, loopback-only application, and default in-app escalation. Optional email is disabled; cloud delivery is unverified and only a local HTTP mock was tested. Human caregiver testing remains unperformed. No clinical validation, diagnosis/treatment, real hardware integration, external SMS/calls, or demonstrated 24–48-hour prediction. Monitoring cannot continue while the server/computer is powered off. Public interactive hosting requires production identity, durable hosted storage, rate limiting, and worker support.

## AI/data disclosure

An AI coding assistant helped build, test, review, document, and prepare the demo. Runtime extraction uses live Gemini. Regression mocks are explicitly isolated from live tests. All data is synthetic; narration uses a locally installed synthesized voice. See [AI_USE.md](../AI_USE.md).
