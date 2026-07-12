# ADR 001: Concierge MVP Stack

Date: 2026-07-12

## Decision
Use Next.js 16 (App Router) + TypeScript + Tailwind + better-sqlite3 for the initial sellable concierge MVP.

## Rationale
- Matches existing workspace patterns (Restore Bot).
- Fast to iterate, server-rendered pages good for marketing + secure flows.
- SQLite: zero ops overhead for validation phase. Portable schema.
- Boring, well-supported, easy to move to Postgres + object storage later.

## Consequences
- Will need migration work for prod Postgres.
- In-process processing sufficient for concierge.
- File handling and pipeline will be improved in phases.

Approved for Phase 1.
