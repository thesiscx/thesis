# Thesis User Flows

## Founder Flows

### 1. New User Onboarding

```
1. Enter email at /auth
2. System checks if email exists (check-user-exists)
3. If new → Show inline onboarding:
   a. Create password
   b. Enter full name
   c. Enter company name
   d. Enter company slug (with availability check)
   e. Create first round (type, instrument, target)
4. Profile created, round created
5. Redirect to /:roundSlug/pipeline
```

### 2. Returning User Login

```
1. Enter email at /auth
2. System recognizes existing user
3. Enter password
4. Redirect to /:roundSlug/pipeline (active round)
   - If no open round, redirect to first closed round
   - If no rounds, prompt to create
```

### 3. Creating a New Round

```
1. Click Round Selector → "New Round"
   OR Homepage → Rounds tab → "Open Round"
2. Multi-step wizard:
   a. Select round type (Pre-Seed, Seed, Series A, etc.)
   b. Configure terms (valuation cap, discount, pro-rata, MFN)
   c. Set wire instructions (manual or PDF upload)
   d. Review and confirm
3. Round created in 'open' state
4. Previous open round (if any) must be closed first
```

### 4. Adding an Investor

```
1. Pipeline page → Add Investor tab
2. Select type: Individual or Institutional
3. Enter name, email, (firm name if institutional)
4. Submit → Creates investor record
5. Investor appears in Pipeline table with 'prospect' status
```

### 5. Sharing Memo with Investor

```
1. Memo page → Share Links tab
2. Click "Generate Link" for investor
3. System creates:
   - Access key (llzk-rxqh-ryya-epep format)
   - Share URL (/share/company/round/memo/investor)
4. Copy URL and send to investor
5. When investor accesses, status → 'pitch'
```

### 6. Creating Investor Docket

```
1. Docket page → Create Docket tab
2. Select investor from dropdown (only those without dockets)
3. Submit → Creates docket with auto-generated ID (S-1, S-2, etc.)
4. Docket appears in table with 'Drafted' status
5. Share docket URL with investor
6. When investor accesses, status → 'contract'
```

### 7. Closing a Round

```
1. Round Selector → "Close Round"
   OR Settings → Configure Rounds → Close
2. Select closure reason:
   - Raised funding
   - Paused fundraising
   - Changed plans
   - Merged with another round
   - Other
3. Add optional internal notes
4. Confirm → Round state → 'closed'
5. Round remains accessible but read-only
```

### 8. Reopening a Round

```
1. Settings → Configure Rounds
2. Find closed round → "Reopen"
3. Confirm action
4. Round state → 'open'
5. Note: Only one round can be open at a time
```

## Investor Flows

### 9. Accessing Shared Memo

```
1. Receive memo link from founder
2. Navigate to /share/company/round/memo/investor
3. Enter access key
4. System validates (validate-access-key)
5. View memo with company branding
6. Access logged, investor status → 'pitch'
```

### 10. Investment Commitment Flow (Investor Docket)

**Route:** `/share/:companySlug/:roundSlug/docket/:investorSlug`

**Prerequisites:**
- Founder created docket for investor
- Founder shared docket link with access key
- Investor has valid access key

**Full Flow:**
```
1. Navigate to docket link
2. Enter access key (llzk-rxqh-ryya-epep format)
3. System validates key (validate-access-key edge function)
4. Thesis splash screen plays (~2.5 seconds)
5. Docket status updates: Drafted → Viewed
6. 8-step commitment flow begins:

   Step 1: Review Terms
   ┌─────────────────────────────────────────┐
   │ Company logo + name + address           │
   │ Valuation Cap: $X                       │
   │ Discount: X%                            │
   │ Instrument: SAFE                        │
   │ [Continue →]                            │
   └─────────────────────────────────────────┘
   - If show_deal_terms=false, terms hidden

   Step 2: Investor Details
   ┌─────────────────────────────────────────┐
   │ Name: [_______________]                 │
   │ Email: [_______________]                │
   │ Phone: [_______________]                │
   │ Address: [_______________]              │
   │ Entity Type: ○ Individual  ○ Entity    │
   │ Entity Name: [_______________] (if entity)│
   │ [Continue →]                            │
   └─────────────────────────────────────────┘
   - All fields saved to docket on submit

   Step 3: Investment Amount
   ┌─────────────────────────────────────────┐
   │ Investment Amount: $[________]          │
   │ Minimum: $X (from round_terms)          │
   │ [Continue →]                            │
   └─────────────────────────────────────────┘
   - Validates against minimum_ticket

   Step 4: Generate Agreement
   ┌─────────────────────────────────────────┐
   │ ⟳ Generating your SAFE agreement...    │
   │ ✓ Loading investor details             │
   │ ✓ Applying round terms                 │
   │ ✓ Populating agreement template        │
   │ ⟳ Finalizing document...               │
   └─────────────────────────────────────────┘
   - Uses template substitution (no AI)
   - Auto-advances when complete

   Step 5: Sign Agreement
   ┌─────────────────────────────────────────┐
   │ [SAFE Document Preview - scrollable]    │
   │                                         │
   │ Your Signature: [_______________]       │
   │ ☐ I agree to the terms above           │
   │ [Sign Agreement →]                      │
   └─────────────────────────────────────────┘
   - Captures: signature_data, IP, timestamp
   - Creates signature record in signatures table
   - Updates docket status: Viewed → Signed
   - Updates commitment_status: 'signed'
   - Logs activity: investor_signed

   Step 6: Execute
   ┌─────────────────────────────────────────┐
   │ ✓ Validating investor signature         │
   │ ✓ Applying pre-authorized counter-sig   │
   │ ✓ Generating audit trail                │
   │ ✓ Preparing executed agreement          │
   │ ⟳ Finalizing document...               │
   └─────────────────────────────────────────┘
   - Uses founder's pre-authorized signature
   - Creates company signature record
   - Updates docket status: Signed → Executed
   - Logs activity: deal_executed
   - Auto-advances when complete

   Step 7: Wire Instructions
   ┌─────────────────────────────────────────┐
   │ AWAITING FUNDS ⟳                        │
   │                                         │
   │ Bank: [Mercury Bank] [Copy]             │
   │ Account: [123456789] [Copy]             │
   │ Routing: [987654321] [Copy]             │
   │ Reference: [S-1 / Ali Ahmed] [Copy]     │
   │                                         │
   │ ⚠ 72-hour disclaimer                    │
   └─────────────────────────────────────────┘
   - Wire fields from round_terms
   - Realtime subscription listens for wire_received
   - Auto-advances when founder confirms funds

   Step 8: Finalize
   ┌─────────────────────────────────────────┐
   │ ✓ INVESTMENT COMPLETE                   │
   │                                         │
   │ [Download Executed Agreement]           │
   │                                         │
   │ [Create Account →] (optional CTA)       │
   └─────────────────────────────────────────┘
   - Only accessible when wire_received=true
   - PDF includes both signatures + audit trail
   - Docket status: Executed → Funded
```

**State Persistence:**
- All progress saved to `dockets.commitment_flow_state`
- Investor can leave and resume from last step
- On reload: if wire_received=true, forces step 8

**Founder-Side Docket Controls:**
```
InvestorDocket page (/docket/:investorSlug):
┌─────────────────────────────────────────┐
│ [Ali Ahmed] - S-1           [Executed]  │
├─────────────────────────────────────────┤
│ Share Link: [copy] [open]               │
│ Access Key: llzk-rxqh-ryya-epep [copy]  │
├─────────────────────────────────────────┤
│ Investment: $50,000                     │
│ Entity: Individual                      │
│ Email: ali@example.com                  │
├─────────────────────────────────────────┤
│ ☑ Show Deal Terms to Investor           │
│ ☐ Wire Received                         │
├─────────────────────────────────────────┤
│ Side Letter / Custom Terms:             │
│ [___________________________________]   │
│ [Save]                                  │
├─────────────────────────────────────────┤
│ Deal Progress:                          │
│ ●──●──●──●──○──○                        │
│ Created Viewed Signed Executed Funded   │
└─────────────────────────────────────────┘
```

### 11. Investor Status Transitions

```
prospect → pitch → contract → won
    ↓         ↓        ↓
   lost     lost     lost

Automatic Triggers:
- prospect → pitch: Investor accesses memo
- pitch → contract: Investor accesses docket  
- contract → won: Investor signs AND wire_received=true
- * → lost: 30 days inactive, docket expired, round closed, manual archive
```

## Document Flows

### 12. Memo Publishing

```
1. Memo page → Publish tab
2. Toggle "Publish Memo"
3. System creates share_link if needed
4. Public URL generated
5. Copy/Open URL to view
6. Activity logged (memo_published)
```

### 13. Memo AI Drafting

```
1. New round with empty memo
2. Memo page → Edit tab
3. Click "Draft with AI"
4. System collects context:
   - Company info from profile
   - Round info from round/terms
5. Calls draft-memo-ai edge function
6. AI generates 15-section memo
7. Content saved to memos table
8. User can edit manually after
```

### 14. Memo AI Editing

```
1. Memo page → Edit tab
2. Enter edit instructions
3. Click "Apply Edit"
4. System sends existing content + instructions
5. AI generates revised content
6. New version saved
7. Action card shows edit history
```

### 15. Docket Export

```
1. Docket page → Export tab
2. Choose:
   - Export All: ZIP with all dockets
   - Export Individual: Select specific docket
3. System generates:
   - cover-sheet.pdf (summary with Thesis branding)
   - safe-agreement.pdf (executed agreement)
4. Download ZIP/files
```

## Admin Flows

### 16. Admin Access

```
1. Login with admin account
2. Navigate to /admin-login (separate login)
3. System verifies admin role
4. Access admin dashboard:
   - Users tab: View all users
   - Invite Codes tab: Manage codes
   - Analytics tab: Platform metrics
```

## Error Handling Flows

### 17. Invalid Access Key

```
1. Investor enters wrong key
2. validate-access-key returns { valid: false }
3. Show error: "Invalid or expired access key"
4. Allow retry
5. No information about why it failed (security)
```

### 18. Expired Docket

```
1. Investor accesses expired docket
2. System checks access_key.expires_at
3. Show error: "This link has expired"
4. Investor status may → 'lost'
5. Founder must reactivate if desired
```

### 19. Session Mismatch

```
1. Investor has session for Investor A
2. Tries to access Investor B's docket
3. System compares slugs
4. Clears session, requires re-auth
5. Prevents cross-investor access
```
