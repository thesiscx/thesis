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

### InvestorCommit
8-step commitment flow:
1. Review Terms
2. Investor Details
3. Investment Amount
4. Generate Agreement
5. Sign Agreement
6. Execute (counter-sign)
7. Wire Instructions
8. Finalize

### CommitmentSteps
Step components in `components/public/steps/`:
- ReviewTermsStep
- InvestorDetailsStep
- InvestmentAmountStep
- GenerateDocumentStep
- SignAgreementStep
- ExecuteStep
- WireStep
- FinalizeStep

### CircuitSplash
Animated splash screen with Circuit logo GIF. Displays before commitment flow.

### PoweredByCircuit
Footer branding for investor pages with trust badges.

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
