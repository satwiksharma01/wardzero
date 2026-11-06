# ADR-001: Embedded PostgreSQL for the first local milestone

Date: 7 November 2026. Status: accepted implementation decision for local development; hosted deployment remains unresolved.

## Context

The participant confirmed Next.js, TypeScript, and PostgreSQL. The workstation has Node 22 but neither PostgreSQL nor Docker available on PATH. The first milestone needs real durable storage and database tests without waiting for account provisioning.

## Decision

Use `@electric-sql/pglite` in the Next.js Node runtime, persisting under `.data/<WARDZERO_DATA_NAME>`. Use a single cached connection per server process and parameterized PostgreSQL queries. Keep storage logic in `src/server/reading-store.ts` so a hosted PostgreSQL adapter can be introduced when credentials/hosting are selected.

## Alternatives

- Managed PostgreSQL: intended for hosting; requires connection details and a selected service.
- Docker PostgreSQL: standard local option; Docker is not currently installed.
- SQLite: simple local storage, but PostgreSQL compatibility is preferable for the confirmed stack.
- In-memory arrays: insufficient for refresh/restart and durability requirements.

## Consequences

PGlite is embedded PostgreSQL, not a separately managed PostgreSQL server. The current store accepts its client type and will need a small adapter adjustment for hosted PostgreSQL. Only one app process may access a data directory. It is unsuitable for shared serverless/ephemeral deployment. Schema initialization is currently idempotent table/index creation; introduce numbered migrations before schema evolution.

The current server binds to loopback and restricts API origins/hosts. This is local-demo containment, not authentication. Implement real server-side role authorization before public hosting.

Sources consulted: [PGlite getting started](https://pglite.dev/docs/) and [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).
