# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Thesis** (repo `thesiscx/thesis`) is a Carta-style **fundraising infrastructure platform** for startup founders: manage rounds, write investor memos, generate SAFE agreements, run an investor pipeline, and let investors view memos / sign / commit through shareable links.

> **Naming gotcha:** The product was renamed `circuit` → `thesis`, but the codebase is still named "circuit" everywhere internally — `src/components/circuit/`, `src/pages/circuit/`, the React Query cache key `circuit-query-cache`, the `circuit-*` edge functions. Treat "circuit" as the internal/legacy name for *this* app. This is **NOT** the same product as `~/.superset/projects/circuit` (circuit.cx, the AI relationship-intelligence tool) — do not cross-reference them.

This is a **Lovable** project (Vite + React + shadcn) backed by **Lovable Cloud = Supabase**. Edits made in Lovable auto-commit to this repo, and pushes to the repo reflect back into Lovable.

## Authoritative docs

`src/docs/` is the maintained, detailed reference — read it before deep work. Keep it in sync when you change the relevant area:
- `ARCHITECTURE.md` — stack, structure, routing, security model
- `DATABASE.md` — every table, column, status enum, and DB function/trigger
- `EDGE_FUNCTIONS.md` — request/response shape of each edge function
- `USER_FLOWS.md`, `COMPONENTS.md`, `DESIGN_SYSTEM.md`, `INVESTOR_DOCKET.md`

## Commands

Uses **bun** (`bun.lockb` present; `package-lock.json` also committed for npm compatibility).

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
- Legacy `/circuit/*` and `/thesis/*` paths redirect to the new clean URLs — preserve these redirects when touching routing.

**Data access**: components don't call Supabase directly for domain data — they go through hooks in `src/hooks/` (`useRounds`, `useInvestors`, `useMemo`) built on **TanStack React Query**, which is **persisted to localStorage** (cache key `circuit-query-cache`, cleared on logout). Mutations log to `activity_logs` via `logActivity()` (`src/lib/activityLogger.ts`) — keep the `ActivityActionType` union there in sync with any new auditable action.

**Backend** — Supabase Edge Functions (Deno) in `supabase/functions/`, deployed automatically. AI features (`draft-memo-ai`, `parse-wire-instructions`, `circuit-chat`) call **Lovable AI (Gemini)** via `LOVABLE_API_KEY`. Functions that act for unauthenticated investors (`log-investor-activity`, `update-investor-docket`, `validate-access-key`) use the service role to bypass RLS and return generic errors to prevent enumeration. DB schema lives in `supabase/migrations/`.

## Conventions & gotchas

- **Never hand-edit `src/integrations/supabase/client.ts` or `types.ts`** — they are auto-generated (`types.ts` is the full DB type, ~1200 lines). Regenerate them; don't patch by hand.
- **TypeScript is non-strict by design** (`strict: false`, `noImplicitAny: false`, unused-vars off in both tsconfig and eslint). Don't assume strict-mode guarantees.
- `@/*` path alias → `src/*` (Vite + tsconfig).
- `.env` holds `VITE_SUPABASE_*` and is committed — these are public anon/publishable keys, safe to ship to the client. Secrets (service role, `LOVABLE_API_KEY`) live only in edge-function env, never in the client bundle.
- UI is **shadcn/ui** (`src/components/ui/`, config in `components.json`) + Tailwind. Design language: minimalist/document-focused, transparent cards & inputs, focus rings removed globally — match it. Color tokens are HSL CSS variables in `src/index.css`.
- All RLS is keyed on `auth.uid()` (user-owned data) or `has_role()` (admin); public document access flows through `access_keys` / `share_links`.

## Workspace rules (from ~/CLAUDE.md)

- **Always push to `main`** when work is done — no PRs, no "should I push?". Push to main = deployed (also syncs back to Lovable).
- This repo belongs to the **`syedos`** identity orbit (`thesiscx` org). Use the correct GitHub token; do not cross-contaminate with `roboalias`/`buxor`.
