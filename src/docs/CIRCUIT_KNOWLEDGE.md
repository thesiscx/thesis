# Circuit - Fundraising Infrastructure Platform

## Overview

Circuit is a professional fundraising infrastructure tool for startup founders. It provides a Carta-style experience for managing fundraising rounds, investor communications, and deal documentation.

**For detailed documentation, see:**
- [Architecture Overview](./ARCHITECTURE.md)
- [Database Schema](./DATABASE.md)
- [Component Reference](./COMPONENTS.md)
- [Edge Functions](./EDGE_FUNCTIONS.md)
- [User Flows](./USER_FLOWS.md)
- [Design System](./DESIGN_SYSTEM.md)

## Quick Reference

### Core Concepts

**Rounds**: A fundraising campaign (Pre-Seed, Seed, Series A). Only one round can be open at a time.

**Three Tools Per Round**:
1. **Pipeline** - Investor CRM/roster at `/:roundSlug/pipeline`
2. **Memo** - Investment memo document at `/:roundSlug/memo`
3. **Docket** - Deal documentation at `/:roundSlug/docket`

**Variants**: Each Memo and Docket can be global (shared) or investor-specific.

**Investor Status Flow**: `prospect` → `pitch` → `contract` → `won` (or `lost`)

### Key Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage with activity feed |
| `/:roundSlug/pipeline` | Investor roster table |
| `/:roundSlug/memo` | Memo editor |
| `/:roundSlug/docket` | Docket management |
| `/settings/rounds` | Configure rounds |
| `/share/:company/:round/memo/:investor` | Investor memo access |
| `/share/:company/:round/docket/:investor` | Investor commitment flow |

### Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TipTap for rich text editing
- Lovable Cloud (Supabase) for backend
- React Query for data fetching

### Design Philosophy

- **Minimalist**: Clean, calm, document-focused UI
- **Professional**: Carta-style formality
- **One Active Round**: Enforces deliberate fundraising management
- **Transparent**: Cards and inputs use transparent backgrounds
- **No Focus Rings**: Removed globally for clean aesthetic

## AI Integration

Circuit uses Lovable AI (Gemini) for:
- Drafting 15-section investment memos
- Editing existing memo content
- Parsing wire instruction PDFs

All AI calls go through edge functions with proper error handling.
