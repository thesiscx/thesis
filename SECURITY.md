# Security Policy

We take the security of Thesis seriously — it handles fundraising data, deal terms, and signatures.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, email **security@thesis.run** with:

- a description of the vulnerability and its impact,
- steps to reproduce (proof-of-concept if possible),
- any suggested remediation.

You'll get an acknowledgement within **72 hours**, and we'll keep you updated as we work on a fix. We're happy to credit you in the release notes once the issue is resolved (unless you'd prefer to remain anonymous).

Please give us a reasonable window to address the issue before any public disclosure.

## Supported versions

This is an actively developed project; security fixes land on `main` and the latest deployment. There are no long-term maintained release branches yet.

## Security model (for context)

- **Row-Level Security (RLS)** is enforced on all tables — access is scoped to the authenticated user (`auth.uid()`), with admin access gated by a `has_role()` check.
- **Investor access** is unauthenticated by design but flows exclusively through **scoped, expiring access keys** — never broad anonymous table access.
- **Edge Functions** that act on behalf of unauthenticated investors use the service role server-side and return generic errors to avoid enumeration.
- **Secrets** (service-role key, AI provider key) live only in Supabase Edge Function secrets — never in the client bundle. The client ships only the public Supabase anon key.

If you find a gap in any of the above, we want to hear about it.
