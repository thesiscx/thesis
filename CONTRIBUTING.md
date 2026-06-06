# Contributing to Thesis

Thanks for your interest in improving Thesis! This project is open source under the [AGPL-3.0](./LICENSE), and contributions of all kinds are welcome — code, docs, bug reports, and ideas.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md). Please be respectful.

## Getting set up

```sh
git clone https://github.com/thesis-run/thesis.git
cd thesis
bun install
cp .env.example .env   # fill in your Supabase URL + anon key
bun run dev
```

See the [README](./README.md#quick-start) for backend (Supabase) setup, and [`src/docs/`](./src/docs) for architecture details.

## Workflow

1. **Open an issue first** for anything non-trivial, so we can align on the approach before you build.
2. **Fork & branch** — create a topic branch off `main` (e.g. `fix/memo-autosave`, `feat/csv-export`).
3. **Make your change.** Match the surrounding code style; this repo uses TypeScript, React function components, Tailwind, and shadcn/ui.
4. **Check it locally:**
   ```sh
   bun run lint
   bun run build
   ```
   Both must pass — CI runs the same checks.
5. **Open a pull request** against `main` with a clear description of what and why. Link the issue it closes.

## Guidelines

- **Keep PRs focused.** One logical change per PR is much easier to review.
- **Don't edit generated files.** `src/integrations/supabase/client.ts` and `types.ts` are generated from the database — regenerate them, don't hand-edit.
- **Database changes go through migrations** in `supabase/migrations/` — never edit an already-applied migration; add a new one.
- **Security & RLS:** any new table needs Row-Level Security policies. Investor-facing access must go through scoped access keys, never broad anon access.
- **No secrets in commits.** Client env holds only the public Supabase anon key; everything sensitive lives in Supabase Edge Function secrets.

## Reporting bugs & requesting features

Use the [issue templates](https://github.com/thesis-run/thesis/issues/new/choose). For security vulnerabilities, **do not open a public issue** — follow [SECURITY.md](./SECURITY.md).

Thank you for contributing! 🙏
