<div align="center">

# Thesis

**Open-source fundraising infrastructure for founders.**

Run your raise like a pro: manage rounds, write investor memos, generate SAFEs, track your pipeline, and let investors review, sign, and commit — all from one calm, document-focused workspace.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](./LICENSE)
[![CI](https://github.com/thesis-run/thesis/actions/workflows/ci.yml/badge.svg)](https://github.com/thesis-run/thesis/actions/workflows/ci.yml)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Built with React](https://img.shields.io/badge/React-18-149eca.svg)](https://react.dev)
[![Backend: Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e.svg)](https://supabase.com)

[**Live → thesis.run**](https://thesis.run) · [Report a bug](https://github.com/thesis-run/thesis/issues) · [Request a feature](https://github.com/thesis-run/thesis/issues)

</div>

---

## What is Thesis?

Thesis is a Carta-style fundraising tool for early-stage founders. A fundraise is messy — scattered across decks, DocuSign, spreadsheets, and email threads. Thesis brings the whole motion into one place, organized around the unit that actually matters: **the round**.

Each round gives you three tools:

| Tool | What it does |
|------|--------------|
| **Pipeline** | A lightweight investor CRM — track prospects through `prospect → pitch → contract → won/lost`. |
| **Memo** | A rich investment memo (15-section format) with a TipTap editor, AI drafting, and per-investor variants. |
| **Docket** | Deal docs — generate SAFEs, share a secure link, collect e-signatures, and track funding through to wire received. |

Founders share a single secure link per investor; investors view the memo, review terms, sign, and commit — no account required.

## Features

- 📂 **Round-centric workflow** — one open round at a time, with a full audit trail (rounds are opened/closed, never deleted).
- ✍️ **AI-assisted memos** — draft a complete 15-section investor memo, or edit existing sections, via any OpenAI-compatible model.
- 🎯 **Per-investor variants** — a global memo/docket plus customized versions for specific investors.
- 📝 **SAFE generation & e-signature** — generate YC-style post-money SAFEs and collect legally-binding signatures.
- 🔗 **Secure investor share links** — token-based, expiring access keys; no investor login required.
- 📊 **Activity feed & audit logs** — every meaningful action is logged.
- 🔐 **Row-level security throughout** — Postgres RLS keyed on the authenticated user; investor access flows through scoped access keys.

## Tech stack

- **Frontend:** Vite · React 18 · TypeScript · Tailwind CSS · [shadcn/ui](https://ui.shadcn.com) · [TanStack Query](https://tanstack.com/query) · [TipTap](https://tiptap.dev)
- **Backend:** [Supabase](https://supabase.com) — Postgres + Auth + Storage + Edge Functions (Deno)
- **AI:** provider-agnostic — any OpenAI-compatible Chat Completions API (`AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`)
- **Hosting:** [Render](https://render.com) (static SPA), auto-deployed from `main`
- **Package manager:** [Bun](https://bun.sh)

## Quick start

> **Prerequisites:** [Bun](https://bun.sh) ≥ 1.3, and a [Supabase](https://supabase.com) project (free tier is fine).

```sh
# 1. Clone
git clone https://github.com/thesis-run/thesis.git
cd thesis

# 2. Install
bun install

# 3. Configure the client env
cp .env.example .env
#   then fill in your Supabase URL + anon (publishable) key

# 4. Run
bun run dev          # http://localhost:8080
```

### Backend setup (Supabase)

1. Create a Supabase project and apply the schema:
   ```sh
   supabase link --project-ref <your-project-ref>
   supabase db push          # applies everything in supabase/migrations/
   supabase functions deploy # deploys the Edge Functions in supabase/functions/
   ```
2. Set the **Edge Function secrets** in your Supabase dashboard (these never live in client env):
   - `AI_API_KEY` — your AI provider key
   - `AI_BASE_URL` *(optional)* — defaults to `https://api.openai.com/v1`
   - `AI_MODEL` *(optional)* — defaults to `gpt-4o-mini`

   Any OpenAI-compatible endpoint works — point `AI_BASE_URL`/`AI_MODEL` at whichever provider you prefer.

See [`src/docs/`](./src/docs) for the full architecture, database schema, and edge-function reference.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the Vite dev server (port 8080) |
| `bun run build` | Production build → `dist/` |
| `bun run lint` | Run ESLint |
| `bun run preview` | Preview the production build locally |
| `bun run start` | Serve `dist/` as a static SPA (used in production) |

## Deployment

Thesis is a static SPA + Supabase backend, so it deploys anywhere that serves static files. The reference deployment is **Render**:

- **Build command:** `bun install && bun run build`
- **Start command:** `bun run start` (serves `dist/` with SPA fallback)
- Set `VITE_SUPABASE_*` at build time; AI/service-role secrets live on Supabase.

## Project structure

```
src/
├── components/   # UI — thesis/ (app), public/ (investor-facing), ui/ (shadcn)
├── contexts/     # FounderAuthContext + InvestorAuthContext
├── hooks/        # useRounds, useInvestors, useMemo (TanStack Query)
├── integrations/ # generated Supabase client + types
├── pages/        # founder, auth, and public routes
└── docs/         # architecture, database, edge-function reference
supabase/
├── functions/    # Edge Functions (Deno)
└── migrations/   # SQL schema
```

## Contributing

Contributions are very welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md). Found a security issue? Please follow [SECURITY.md](./SECURITY.md).

## License

Thesis is licensed under the **GNU Affero General Public License v3.0** — see [LICENSE](./LICENSE). In short: you're free to use, modify, and self-host it, but if you run a modified version as a network service, you must make your source available under the same license. For commercial licensing inquiries, open an issue.

---

<div align="center">
Built by <a href="https://github.com/syedos">syedos</a>.
</div>
