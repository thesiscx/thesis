# Investor Docket System

Complete documentation for the investor-facing docket and commitment flow.

## Overview

The docket system enables founders to send SAFE agreements to investors and collect e-signatures. Each docket represents a single investor's deal documentation for a specific funding round.

## Routes

| Route | Purpose |
|-------|---------|
| `/:roundSlug/docket` | Founder docket table (all dockets in round) |
| `/:roundSlug/docket/:investorSlug` | Founder view of specific investor's docket |
| `/share/:companySlug/:roundSlug/docket/:investorSlug` | Investor commitment flow |

## Docket Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Drafted  │───▶│  Viewed  │───▶│  Signed  │───▶│ Executed │───▶│  Funded  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │
     ▼
┌──────────┐
│  Voided  │ (only from Drafted)
└──────────┘
```

| Status | Trigger | Constraints |
|--------|---------|-------------|
| `Drafted` | Founder creates docket | Can be voided |
| `Viewed` | Investor accesses link | Cannot void |
| `Signed` | Investor completes e-signature | Legally binding, cannot void |
| `Executed` | Counter-signature applied | Cannot void |
| `Funded` | Founder confirms wire received | Final state |
| `Voided` | Founder cancels | Only from Drafted |

## Database Schema

### dockets table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| round_id | uuid | FK to rounds |
| investor_id | uuid | FK to investors |
| docket_id | text | Auto-generated (S-1, PS-2, A-3) |
| docket_number | integer | Sequential per round |
| status | text | Lifecycle status |
| commitment_status | text | 'none' or 'signed' |
| commitment_flow_state | jsonb | Persisted flow state |
| amount | numeric | Investment amount |
| investor_name | text | Captured during flow |
| investor_email | text | Captured during flow |
| investor_phone | text | Captured during flow |
| investor_address | text | Captured during flow |
| investor_entity_type | text | 'individual' or 'entity' |
| investor_entity_name | text | Entity name if applicable |
| custom_terms | text | Side letter (markdown) |
| show_deal_terms | boolean | Show terms to investor |
| wire_received | boolean | Funds confirmed |
| wire_received_at | timestamp | Wire confirmation time |
| access_key_id | uuid | FK to access_keys |

### Docket ID Format

Generated via `generate_docket_id()` PostgreSQL trigger:

| Round Type | Prefix | Examples |
|------------|--------|----------|
| Pre-Seed | PS | PS-1, PS-2, PS-3 |
| Seed | S | S-1, S-2, S-3 |
| Series A | A | A-1, A-2, A-3 |
| Friends & Family | FF | FF-1, FF-2, FF-3 |

### commitment_flow_state Structure

```json
{
  "current_step": "sign",
  "completed_steps": ["terms", "details", "amount", "generate"],
  "investor_details": {
    "name": "Ali Ahmed",
    "email": "ali@example.com",
    "phone": "+1234567890",
    "address": "123 Main St, SF, CA",
    "entityType": "individual",
    "entityName": null
  },
  "amount": 50000
}
```

## Investor Commitment Flow

### Access & Authentication

1. Investor receives link: `/share/robomart/seed/docket/ali-ahmed`
2. Enters access key: `llzk-rxqh-ryya-epep`
3. System validates via `validate-access-key` edge function
4. Thesis splash screen plays (~2.5 seconds)
5. Docket status updates: Drafted → Viewed

### 8-Step Flow

#### Step 1: Review Terms
```
┌─────────────────────────────────────────┐
│ [Company Logo]                          │
│ Robomart, Inc.                          │
│ 123 Main Street, San Francisco, CA      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Valuation Cap    $10,000,000        │ │
│ │ Discount         20%                │ │
│ │ Instrument       Post-Money SAFE    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Continue →]               │
└─────────────────────────────────────────┘
```
- Terms from `round_terms` table
- Hidden if `show_deal_terms=false`

#### Step 2: Investor Details
```
┌─────────────────────────────────────────┐
│ Full Name                               │
│ [_____________________________________] │
│                                         │
│ Email                                   │
│ [_____________________________________] │
│                                         │
│ Phone                                   │
│ [_____________________________________] │
│                                         │
│ Address                                 │
│ [_____________________________________] │
│                                         │
│ Entity Type                             │
│ ┌───────────────┐ ┌───────────────┐     │
│ │ ● Individual  │ │ ○ Entity      │     │
│ └───────────────┘ └───────────────┘     │
│                                         │
│              [Continue →]               │
└─────────────────────────────────────────┘
```
- All fields saved to docket record
- Entity Name field appears if Entity selected

#### Step 3: Investment Amount
```
┌─────────────────────────────────────────┐
│ Investment Amount                       │
│                                         │
│ $ [_________________________________]   │
│                                         │
│ Minimum investment: $25,000             │
│                                         │
│              [Continue →]               │
└─────────────────────────────────────────┘
```
- Validates against `round_terms.minimum_ticket`
- Saves to `dockets.amount`

#### Step 4: Generate Agreement
```
┌─────────────────────────────────────────┐
│                                         │
│     Generating your SAFE agreement...   │
│                                         │
│     ✓ Loading investor details          │
│     ✓ Applying round terms              │
│     ✓ Populating agreement template     │
│     ⟳ Finalizing document...            │
│                                         │
└─────────────────────────────────────────┘
```
- Uses template substitution (no AI)
- Populates YC Post-Money SAFE template
- Auto-advances when complete

#### Step 5: Sign Agreement
```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │     SIMPLE AGREEMENT FOR            │ │
│ │       FUTURE EQUITY                 │ │
│ │                                     │ │
│ │ This SAFE is entered into...        │ │
│ │ [scrollable document preview]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Your Signature                          │
│ [_____________________________________] │
│                                         │
│ ☐ I agree to the terms of this SAFE    │
│   agreement and acknowledge that this   │
│   constitutes a legally binding contract│
│                                         │
│           [Sign Agreement →]            │
│                                         │
│ 🔒 Secured by Thesis                   │
│    E-Sign Act & UETA compliant          │
└─────────────────────────────────────────┘
```
- Captures: signature text, IP address, timestamp, user agent
- Creates record in `signatures` table
- Updates: status → Signed, commitment_status → 'signed'
- Logs activity: `investor_signed`

#### Step 6: Execute
```
┌─────────────────────────────────────────┐
│                                         │
│     Executing your agreement...         │
│                                         │
│     ✓ Validating investor signature     │
│     ✓ Applying counter-signature        │
│     ✓ Generating audit trail            │
│     ✓ Preparing executed agreement      │
│     ⟳ Finalizing document...            │
│                                         │
└─────────────────────────────────────────┘
```
- Uses founder's pre-authorized signature from `round_terms`
- Creates company signature record
- Updates: status → Executed
- Logs activity: `deal_executed`
- Auto-advances when complete

#### Step 7: Wire Instructions
```
┌─────────────────────────────────────────┐
│         ⟳ AWAITING FUNDS                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Bank Name      Mercury Bank   [📋] │ │
│ │ Account Name   Robomart Inc   [📋] │ │
│ │ Account #      1234567890     [📋] │ │
│ │ Routing #      0987654321     [📋] │ │
│ │ Reference      S-1 Ali Ahmed  [📋] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ Important: Wire transfer must be     │
│ received within 72 hours or agreement   │
│ may be voided at company's discretion.  │
│                                         │
└─────────────────────────────────────────┘
```
- Wire details from `round_terms.wire_*` fields
- Realtime subscription on `dockets` table
- Listens for `wire_received=true`
- Auto-advances when funds confirmed

#### Step 8: Finalize
```
┌─────────────────────────────────────────┐
│                                         │
│         ✓ INVESTMENT COMPLETE           │
│                                         │
│     Your investment in Robomart has     │
│     been successfully processed.        │
│                                         │
│     ┌───────────────────────────────┐   │
│     │  📄 Download Executed SAFE    │   │
│     └───────────────────────────────┘   │
│                                         │
│     ┌───────────────────────────────┐   │
│     │  Create Investor Account →    │   │
│     └───────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```
- Only accessible when `wire_received=true`
- PDF includes both signatures + audit certificate
- Status: Executed → Funded

## Founder Controls

### InvestorDocket Page (`/:roundSlug/docket/:investorSlug`)

```
┌─────────────────────────────────────────────────────────────┐
│  Ali Ahmed                                        [Signed]  │
│  S-1                                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Share Link                                                 │
│  thesis.run/share/robomart/seed/docket/ali-ahmed  [📋][↗]  │
│                                                             │
│  Access Key                                                 │
│  llzk-rxqh-ryya-epep                              [📋]     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Investment Details                                         │
│  Amount:      $50,000                                       │
│  Entity:      Individual                                    │
│  Email:       ali@example.com                               │
│  Phone:       +1 (555) 123-4567                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Founder Controls                                           │
│  ☑ Show Deal Terms to Investor                              │
│  ☐ Wire Received                                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Side Letter / Custom Terms                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Pro-rata rights capped at 2x original investment.   │   │
│  │ Board observer seat granted.                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  [Save Side Letter]                                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Deal Progress                                              │
│  ●────●────●────●────○────○                                 │
│  Created  Viewed  Signed  Executed  Funded                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar Tabs

| Tab | Purpose |
|-----|---------|
| Status | Visual deal progress with timestamps |
| Void | Void docket (only if Drafted status) |

## E-Signature Compliance

### Legal Framework
- **E-Sign Act** (Electronic Signatures in Global and National Commerce Act)
- **UETA** (Uniform Electronic Transactions Act)

### Captured Data (signatures table)

| Field | Description |
|-------|-------------|
| signer_name | Full legal name |
| signer_email | Email address |
| signer_type | 'investor' or 'company' |
| signer_title | Title (for company signer) |
| signature_data | Typed signature text |
| ip_address | Client IP at signing |
| signed_at | UTC timestamp |

### Audit Trail
Each executed agreement includes:
- Document hash/ID
- Both party signatures with timestamps
- IP addresses
- Certificate of Completion page

## SAFE Document Generation

### Template Substitution Variables

| Variable | Source |
|----------|--------|
| `{{investor_name}}` | dockets.investor_name |
| `{{investor_address}}` | dockets.investor_address |
| `{{investor_entity_name}}` | dockets.investor_entity_name |
| `{{amount}}` | dockets.amount (formatted) |
| `{{valuation_cap}}` | round_terms.valuation_cap |
| `{{discount_rate}}` | round_terms.discount_rate |
| `{{company_name}}` | round_terms.company_name |
| `{{company_address}}` | round_terms.registered_address |
| `{{jurisdiction}}` | round_terms.jurisdiction |
| `{{custom_terms}}` | dockets.custom_terms |

### Generated Documents

1. **SAFE Agreement** - Populated YC Post-Money SAFE
2. **Signature Pages** - Both investor and company signatures
3. **Audit Certificate** - Compliance documentation

## Edge Functions

### update-investor-docket

Updates docket state during commitment flow.

**Update Types:**
- `viewed` - Mark docket as viewed
- `flow_state` - Save commitment flow progress
- `signed` - Record investor signature and details

### validate-access-key

Validates investor access key and returns session data.

### log-investor-activity

Logs investor actions (investor_signed, deal_executed) using service role to bypass RLS.

## Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| InvestorCommit | `pages/public/InvestorCommit.tsx` | Main commitment flow |
| InvestorDocket | `components/thesis/docket/InvestorDocket.tsx` | Founder docket view |
| ReviewTermsStep | `components/public/steps/ReviewTermsStep.tsx` | Step 1 |
| InvestorDetailsStep | `components/public/steps/InvestorDetailsStep.tsx` | Step 2 |
| InvestmentAmountStep | `components/public/steps/InvestmentAmountStep.tsx` | Step 3 |
| GenerateDocumentStep | `components/public/steps/GenerateDocumentStep.tsx` | Step 4 |
| SignAgreementStep | `components/public/steps/SignAgreementStep.tsx` | Step 5 |
| ExecuteStep | `components/public/steps/ExecuteStep.tsx` | Step 6 |
| WireStep | `components/public/steps/WireStep.tsx` | Step 7 |
| FinalizeStep | `components/public/steps/FinalizeStep.tsx` | Step 8 |
| ThesisSplash | `components/public/ThesisSplash.tsx` | Splash screen |
| PoweredByThesis | `components/public/PoweredByThesis.tsx` | Trust badges |
| DocketStatusCard | `components/thesis/tabs/DocketStatusCard.tsx` | Status sidebar |
| CreateDocketCard | `components/thesis/tabs/CreateDocketCard.tsx` | Create docket |
| ExportDocketCard | `components/thesis/tabs/ExportDocketCard.tsx` | Export documents |
