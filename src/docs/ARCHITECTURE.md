# Thesis Architecture Overview

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack React Query (with localStorage persistence)
- **Rich Text Editing**: TipTap
- **Backend**: Lovable Cloud (Supabase)
- **Authentication**: Supabase Auth with email/password
- **Database**: PostgreSQL via Supabase
- **Storage**: Supabase Storage (buckets: memo-images, company-logos, pitch-decks)
- **Serverless Functions**: Supabase Edge Functions (Deno)

## Project Structure

```
src/
├── assets/              # Static images, logos, GIFs
├── components/
│   ├── thesis/         # Main app components
│   │   ├── editor/      # TipTap editor extensions
│   │   ├── tabs/        # Sidebar tab card components
│   │   ├── docket/      # Docket-specific components
│   │   ├── memo/        # Memo-specific components
│   │   └── pipeline/    # Pipeline-specific components
│   ├── public/          # Investor-facing components
│   │   └── steps/       # Commitment flow step components
│   └── ui/              # shadcn/ui components
├── contexts/            # React contexts (auth)
├── docs/                # Documentation
├── hooks/               # Custom React hooks
├── integrations/        # Supabase client & types
├── lib/                 # Utility functions
├── pages/
│   ├── auth/            # Authentication pages
│   ├── thesis/         # Founder dashboard pages
│   │   └── settings/    # Settings subpages
│   └── public/          # Investor-accessible pages
└── index.css            # Design system tokens

supabase/
└── functions/           # Edge functions
```

## Core Concepts

### Workspaces
A workspace represents a company using Thesis. The workspace_id is the user's auth.uid(), meaning each user owns one workspace (their company).

### Rounds
A fundraising round (Pre-Seed, Seed, Series A, etc.). Only one round can be "open" at a time. Rounds have states: `draft`, `open`, `closed`.

### Three Tools Per Round
1. **Pipeline** - Investor CRM/roster
2. **Memo** - Investment memo document
3. **Docket** - Deal documentation & agreements

### Variants
Each Memo and Docket can have:
- **Global variant**: Default shared version (no investor_id)
- **Investor-specific variants**: Customized per investor (has investor_id)

## Authentication Flow

1. User enters email at `/auth`
2. System checks if email exists via `check-user-exists` edge function
3. **New users**: Complete inline onboarding (name, company, first round)
4. **Existing users**: Enter password and login
5. After auth, redirect to `/:roundSlug/pipeline` for active round

### Auth Context
Single unified `FounderAuthContext` manages all auth state. Admin role checked within the same context. No separate auth contexts to prevent race conditions.

## Routing Structure

### Founder Routes (authenticated)
```
/                                    # Homepage (smart redirect)
/:roundSlug/pipeline                 # Pipeline table
/:roundSlug/pipeline/:investorSlug   # Investor subpage
/:roundSlug/memo                     # Memo editor (global)
/:roundSlug/memo/:investorSlug       # Investor memo subpage
/:roundSlug/docket                   # Docket table
/:roundSlug/docket/:investorSlug     # Investor docket subpage
/settings/rounds                     # Configure rounds
```

### Public Routes (investor access)
```
/share/:companySlug/:roundSlug/memo/:investorSlug    # Investor memo view
/share/:companySlug/:roundSlug/docket/:investorSlug  # Investor docket/commit
/preview/memo/:token                                  # Founder memo preview
```

## Data Flow

### React Query Caching
- Queries use `staleTime: 60000` for fast loads
- Cache persisted to localStorage via `REACT_QUERY_OFFLINE_CACHE`
- Cache cleared on logout to prevent stale data

### Real-time Updates
- Activity logs subscribe to Supabase realtime
- Docket wire_received status monitored for auto-advance

## Design System

### Color Tokens (index.css)
All colors use HSL via CSS variables:
- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--muted`, `--accent`
- `--border`, `--ring`

### Component Patterns
- Cards use transparent backgrounds
- Inputs use transparent backgrounds
- No focus rings (removed globally)
- Minimalist, document-focused aesthetic

## Security Model

### Row Level Security (RLS)
All tables have RLS enabled with policies based on:
- `auth.uid()` for user-owned data
- `has_role()` function for admin access
- Share links for public document access

### Edge Function Security
- All functions verify JWT tokens
- Service role used for cross-user operations
- Generic error messages prevent enumeration
