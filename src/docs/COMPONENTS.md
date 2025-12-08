# Circuit Component Reference

## Layout Components

### CircuitLayout
Main layout wrapper for authenticated pages. Provides:
- Header with navigation breadcrumbs
- Round selector dropdown
- Right sidebar for action tabs
- Responsive container

### CircuitHeader
Top navigation bar with:
- Company logo/name (left) - navigates to homepage
- Tool name with icon - navigates to tool
- Chevron dropdowns for context switching
- Round selector (right) - switches active round
- User menu

### AssistantSidebar
Right sidebar container for tab-based action cards. Each page has its own tabs:
- **Homepage**: Rounds, Domain, Activity
- **Pipeline**: Bulletin, Agenda, Recap, Add Investor
- **Memo**: Publish, Edit, Share Links
- **Docket**: Create Docket, Setup Terms, Financing Summary, Export

## Page Components

### Homepage (`pages/circuit/Homepage.tsx`)
Landing page after login showing:
- Welcome message with user name
- Round statistics (dockets, signed, raised)
- Navigation cards to Pipeline, Memo, Docket
- Activity feed in sidebar

### Pipeline (`pages/circuit/Pipeline.tsx`)
Investor roster table with:
- Sortable columns: Name, Entity, Email, Last Contact, Status
- Status filtering (default excludes won/lost)
- Click row to navigate to investor subpage

### CircuitMemo (`pages/circuit/CircuitMemo.tsx`)
Memo editor/viewer with:
- TipTap rich text editor
- Table of contents sidebar
- View/Edit mode toggle
- Investor-specific subpages

### CircuitDocket (`pages/circuit/CircuitDocket.tsx`)
Docket management table with:
- Docket ID, Investor, Amount, Status columns
- Status filtering
- Visual status indicators (green for funded, grey for voided)

## Sidebar Tab Cards

All cards follow consistent structure:
```tsx
<div className="rounded-xl border border-border bg-transparent overflow-hidden">
  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
    <Icon className="w-4 h-4" />
    <span className="font-medium text-sm">Title</span>
  </div>
  <div className="p-4">
    {/* Content */}
  </div>
</div>
```

### PublishCard
Memo publishing controls:
- Publish/Unpublish toggle
- Public URL with copy/open buttons
- Last published timestamp

### EditMemoCard
AI-assisted memo editing:
- Text input for edit instructions
- Sends to draft-memo-ai edge function
- Shows edit history

### ShareLinksCard
Investor access link management:
- List of active investor links
- Copy key / Open link buttons
- Click row to view investor subpage

### AddInvestorCard
New investor form:
- Individual/Institutional radio selection
- Name, Email, Firm Name fields
- Creates investor + access key

### CreateDocketCard
Docket creation:
- Dropdown of available investors (no existing docket)
- Creates docket with auto-generated ID

### RoundsCard
Round management:
- Current round info
- Quick stats
- Configure/Close/Reopen actions

### FinancingSummaryCard
Round progress metrics:
- Total raised
- Number of investors
- Average per investor
- Progress bar

### ExportDocketCard
Document export:
- Export all dockets as ZIP
- Export individual docket
- Generates cover sheets + agreements

## Editor Components

### MemoEditor
TipTap-based rich text editor with extensions:
- StarterKit (basic formatting)
- Image (with Supabase upload)
- Link
- Table, TableRow, TableCell, TableHeader
- TextAlign
- Placeholder
- ResizableImage (custom)
- FontSize (custom)
- Citation (custom)
- Embed (custom - universal video)

### EditorToolbar
Formatting toolbar with:
- Text styles (bold, italic, etc.)
- Headings (H1-H3)
- Lists (bullet, numbered)
- Alignment
- Links
- Images
- Tables
- Video embeds
- Citations

### TipTapRenderer
Read-only TipTap content renderer. Handles all node types for memo viewing.

## Public/Investor Components

### InvestorAccess
Access key validation page:
- Key input field
- Validates via edge function
- Stores session in context

### PublicMemoViewer
Investor memo viewing:
- Company branding header
- Rendered memo content
- Table of contents
- Exit button

### InvestorCommit (`pages/public/InvestorCommit.tsx`)
The core investor-facing commitment flow. A single dynamic component that loads investor-specific data based on URL and access key validation.

**Route:** `/share/:companySlug/:roundSlug/docket/:investorSlug`

**8-Step Flow:**

| Step | Component | Purpose |
|------|-----------|---------|
| 1. Terms | `ReviewTermsStep` | Display deal terms (valuation cap, discount, instrument type), company details with logo |
| 2. Details | `InvestorDetailsStep` | Collect investor info: name, email, phone, address, entity type (Individual/Entity) |
| 3. Amount | `InvestmentAmountStep` | Investment amount input with minimum ticket validation |
| 4. Generate | `GenerateDocumentStep` | Animated SAFE document generation using template substitution |
| 5. Sign | `SignAgreementStep` | E-signature capture with typed signature, consent checkbox, legal text |
| 6. Execute | `ExecuteStep` | Animated counter-signature with progress ticks (validating, counter-signing, audit trail, finalizing) |
| 7. Wire | `WireStep` | Display wire instructions with copy buttons, 72-hour disclaimer, realtime listener for `wire_received` |
| 8. Finalize | `FinalizeStep` | "Investment Complete" confirmation, download executed agreement, CTA to create account |

**Key Behaviors:**
- Flow state persists in `dockets.commitment_flow_state` (jsonb)
- Step 8 only accessible when `wire_received=true`
- Realtime subscription auto-advances from Wire to Finalize when funds confirmed
- Session validates investorSlug matches to prevent cross-docket access

**UI Layout:**
- Centered card layout with fixed height (appears cut off at bottom)
- Left sidebar shows step navigation with rounded-l-md indicators
- "Close Terms" button (X icon) top-left
- "Powered by Circuit" branding in sidebar footer
- Internal scrolling within card (no page scroll)

### CommitmentSteps (`components/public/steps/`)
Individual step components:

| Component | Key Fields/Features |
|-----------|---------------------|
| `ReviewTermsStep` | Company logo, name, address, valuation cap, discount rate |
| `InvestorDetailsStep` | Name, email, phone, address, entity type radio (Individual/Entity), entity name |
| `InvestmentAmountStep` | Amount input with formatting, minimum ticket validation |
| `GenerateDocumentStep` | Animated progress, SAFE template population with investor + round data |
| `SignAgreementStep` | SAFE document preview, signature text input, consent checkbox, IP/timestamp capture |
| `ExecuteStep` | Animated checkmarks: signature validation, counter-signature, audit trail, finalization |
| `WireStep` | Wire fields with copy buttons, 72-hour disclaimer, realtime `wire_received` subscription |
| `FinalizeStep` | Success message, download button, account creation CTA |

### CircuitSplash (`components/public/CircuitSplash.tsx`)
Animated splash screen with Circuit logo GIF. Plays once (not looped), fades out after ~2.5 seconds. Establishes premium brand perception before commitment flow.

### PoweredByCircuit (`components/public/PoweredByCircuit.tsx`)
Footer branding for investor pages:
- "Powered by Circuit" text
- "E-Sign Act & UETA compliant" trust badge
- Appears near e-signature section for legitimacy

## Utility Components

### StatusLine
Status feedback below cards:
- Idle (pulsing dot)
- Loading (spinner)
- Success (checkmark)
- Error (alert)

### RoundSwitchSplash
Animated splash when switching rounds. Shows fading step list.

### LoadingTerminal
Terminal-style loading animation for page loads.

### ImageCropper
Avatar/logo cropping with react-easy-crop.

## Context Providers

### FounderAuthContext
Unified auth state for founders:
- user, profile, loading states
- signIn, signOut, refreshProfile methods
- isAdmin check

### InvestorAuthContext
Investor session for public pages:
- investorSession state
- validateAccessKey method
- clearInvestorSession method
