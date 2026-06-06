# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Thesis** (repo `thesis-run/thesis`) is a Carta-style **fundraising infrastructure platform** for startup founders: manage rounds, write investor memos, generate SAFE agreements, run an investor pipeline, and let investors view memos / sign / commit through shareable links.

> **Naming:** This product was formerly called `circuit` and has been fully renamed to `thesis` throughout the codebase (directories, components, cache keys, edge functions, the DB chat table). Two intentional `circuit` references remain: (1) the **legacy `/circuit/*` redirect routes** in `src/App.tsx`, kept so old pre-rename shared links still resolve; (2) the **historical migration** `supabase/migrations/20251209100124_*.sql`, left immutable as applied history — the rename lives in a later migration. Don't reintroduce "circuit" elsewhere. Note: `~/.superset/projects/circuit` (circuit.cx, the AI relationship-intelligence tool) is a **different product** — do not cross-reference them.

Frontend is a Vite + React + shadcn SPA; backend is **Supabase** (Postgres + Auth + Storage + Edge Functions). Hosted on **Render** (static SPA served via `serve`), auto-deployed from `main`.

## Authoritative docs

`src/docs/` is the maintained, detailed reference — read it before deep work. Keep it in sync when you change the relevant area:
- `ARCHITECTURE.md` — stack, structure, routing, security model
- `DATABASE.md` — every table, column, status enum, and DB function/trigger
- `EDGE_FUNCTIONS.md` — request/response shape of each edge function
- `USER_FLOWS.md`, `COMPONENTS.md`, `DESIGN_SYSTEM.md`, `INVESTOR_DOCKET.md`

## Commands

Uses **bun** (`bun.lock`) as the only supported package manager — CI and the Render deploy both use it.

```sh
bun install              # or: npm i
bun run dev              # Vite dev server on port 8080
bun run build            # production build
bun run build:dev        # build in development mode (unminified, dev env)
bun run lint             # eslint
bun run preview          # serve the production build locally
```

There is **no test framework** configured — no test runner, no `test` script.

## Architecture big picture

**Data model** (one workspace per user — `workspace_id == auth.uid()`):
- **Round** → fundraising campaign (Pre-Seed/Seed/Series A…). Only **one round may be `open`** at a time. Round public code derives from `round_type` + `round_number` (see `getRoundCode` in `useRounds.ts`).
- Each round exposes **three tools**: **Pipeline** (investor CRM), **Memo** (TipTap document, stored as `jsonb`), **Docket** (per-investor SAFE agreement + commitment flow).
- **Variants**: Memo/Docket are either **global** (`is_global`, no `investor_id`) or **investor-specific**.
- Investor pipeline status: `prospect → pitch → contract → won` (or `lost`). Docket lifecycle: `Drafted → Viewed → Signed → Executed → Funded` (`Voided` only from `Drafted`).

**Two separate auth contexts** (`src/contexts/`):
- `FounderAuthContext` — the only founder/admin auth source (admin role is checked inside it; deliberately unified to avoid race conditions). Heavily console-logged with `[Auth:...]` tags and a 10s safety timeout.
- `InvestorAuthContext` — for public investor access via access keys.

**Routing** (`src/App.tsx` — the single source of route truth):
- Founder routes are wrapped in `<FounderAuthLayout>` + `<ProtectedRoute>`: `/:roundSlug/{pipeline,memo,docket}[/:variantSlug]`, `/settings/*`, `/admin`.
- Public investor routes are under `/share/:companySlug/:roundCode/{memo,docket}/...` inside `<InvestorAuthLayout>`.
- Token-based preview: `/preview/memo/:token`.
- Legacy `/circuit/*` and `/thesis/*` paths redirect to the new clean URLs — preserve these redirects when touching routing (they are the only intentional `circuit` strings left in code).

**Data access**: components don't call Supabase directly for domain data — they go through hooks in `src/hooks/` (`useRounds`, `useInvestors`, `useMemo`) built on **TanStack React Query**, which is **persisted to localStorage** (cache key `thesis-query-cache`, cleared on logout). Mutations log to `activity_logs` via `logActivity()` (`src/lib/activityLogger.ts`) — keep the `ActivityActionType` union there in sync with any new auditable action.

**Backend** — Supabase Edge Functions (Deno) in `supabase/functions/`, deployed automatically. AI features (`draft-memo-ai`, `parse-wire-instructions`, `thesis-chat`) call a configurable AI provider (OpenAI-compatible) via `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`. Functions that act for unauthenticated investors (`log-investor-activity`, `update-investor-docket`, `validate-access-key`) use the service role to bypass RLS and return generic errors to prevent enumeration. DB schema lives in `supabase/migrations/`.

## Conventions & gotchas

- **Never hand-edit `src/integrations/supabase/client.ts` or `types.ts`** — they are auto-generated (`types.ts` is the full DB type, ~1200 lines). Regenerate them; don't patch by hand.
- **TypeScript is non-strict by design** (`strict: false`, `noImplicitAny: false`, unused-vars off in both tsconfig and eslint). Don't assume strict-mode guarantees.
- `@/*` path alias → `src/*` (Vite + tsconfig).
- `.env` holds `VITE_SUPABASE_*` and is committed — these are public anon/publishable keys, safe to ship to the client. Secrets (service role, `AI_API_KEY`) live only in edge-function env, never in the client bundle.
- UI is **shadcn/ui** (`src/components/ui/`, config in `components.json`) + Tailwind. Design language: minimalist/document-focused, transparent cards & inputs, focus rings removed globally — match it. Color tokens are HSL CSS variables in `src/index.css`.
- All RLS is keyed on `auth.uid()` (user-owned data) or `has_role()` (admin); public document access flows through `access_keys` / `share_links`.

## Workspace rules (from ~/CLAUDE.md)

- **Always push to `main`** when work is done — no PRs, no "should I push?". Push to main = deployed (Render auto-deploys from `main`).
- This repo belongs to the **`syedos`** identity orbit (`thesis-run` org). Use the correct GitHub token; do not cross-contaminate with `roboalias`/`buxor`.
