# Circuit - Fundraising Infrastructure Platform

## Overview

Circuit is a professional fundraising infrastructure tool for startup founders. It provides a Carta-style experience for managing fundraising rounds, investor communications, and deal documentation.

## Core Concepts

### Rounds
A "round" represents a fundraising campaign (e.g., Pre-Seed, Seed, Series A). Key characteristics:
- **Only one round can be open at a time** - enforces deliberate, formal round management
- Rounds have states: `open` (active) or `closed` (completed)
- Each round tracks: instrument type (SAFE, Convertible Note, Equity), target raise amount
- Closing a round requires selecting a reason (raised funding, paused, changed plans, merged, other)

### Three Core Tools Per Round

1. **Pipeline** (formerly "Circuit" internally)
   - Investor CRM/roster management
   - Track investor contacts, stages, and communications
   - Route: `/circuit/:roundSlug/pipeline/:variantSlug`

2. **Memo**
   - Investment memo document editor
   - Rich text editing with TipTap
   - Supports "Global" variant (shared) and investor-specific variants
   - Route: `/circuit/:roundSlug/memo/:variantSlug`

3. **Docket**
   - Deal documentation and agreements
   - SAFE/Note generation and management
   - Signature collection
   - Route: `/circuit/:roundSlug/docket/:variantSlug`

### Variants
Each Memo and Docket can have:
- **Global variant**: The default, shared version
- **Investor-specific variants**: Customized versions for individual investors

### Investors
- Belong to a workspace (company)
- Have: name, slug, email, entity name, entity type, address
- Can have personalized memos and dockets

## Navigation Structure

```
/auth                           - Authentication
/circuit                        - Dashboard (home after login)
/circuit/settings               - Workspace settings
/circuit/:roundSlug/pipeline/:variantSlug
/circuit/:roundSlug/memo/:variantSlug
/circuit/:roundSlug/docket/:variantSlug
```

## Key User Flows

### Opening a New Round
1. User clicks "Open New Round" on Dashboard
2. Selects round type (Pre-Seed, Seed, Series A, etc.)
3. Chooses instrument type (SAFE, Note, Equity)
4. Sets optional target raise amount
5. Round is created with associated memo, docket, and terms

### Closing a Round
1. User clicks "Close Round" from round menu
2. Selects closure reason from official list
3. Optionally adds internal notes
4. Round marked as closed, can be reopened later

### Managing Investors
1. Add investors to Pipeline
2. Create investor-specific memo/docket variants as needed
3. Share documents via access keys
4. Track engagement and communications

## Database Tables

- `profiles` - User profiles with company info
- `rounds` - Fundraising rounds
- `round_terms` - Terms for each round (valuation cap, discount, etc.)
- `investors` - Investor contacts
- `memos` - Memo documents (global + variants)
- `dockets` - Docket documents
- `access_keys` - Shareable access links
- `share_links` - Document sharing tokens
- `signatures` - Signature records

## Terminology

| Term | Meaning |
|------|---------|
| Round | A fundraising campaign |
| Open Round | Create/start a new round |
| Close Round | Mark round as complete |
| Pipeline | Investor CRM tool |
| Memo | Investment memo document |
| Docket | Deal documentation |
| Variant | Version of memo/docket (global or investor-specific) |
| Workspace | A company's Circuit account |

## Design Philosophy

- **Official & Professional**: Carta-style formality
- **Minimalist**: Clean, calm, document-focused UI
- **One Active Round**: Enforces deliberate fundraising management
- **Variant System**: Flexibility for investor personalization
- **No Deletion**: Rounds can only be closed, not deleted (audit trail)

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TipTap for rich text editing
- Supabase (via Lovable Cloud) for backend
- React Query for data fetching

## Circuit AI Assistant

Circuit AI is the in-app assistant that helps founders with:
- Understanding how to use the platform
- Drafting memo content
- Fundraising strategy advice
- Document management guidance
- General startup fundraising questions
