# Thesis Database Schema

## Core Tables

### profiles
User profile and company information. Created automatically on signup via trigger.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | User's auth.uid() - also serves as workspace_id |
| full_name | text | User's full name |
| company_name | text | Company name |
| company_slug | text | URL-safe company identifier |
| avatar_url | text | Company logo URL |
| description | text | Company description |
| website | text | Company website |
| onboarding_completed | boolean | Whether user completed onboarding |

### rounds
Fundraising rounds for a workspace.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | Owner's user id |
| created_by | uuid | Creator's user id |
| name | text | Round display name |
| slug | text | URL-safe round identifier |
| round_type | text | Type code: 'ps' (pre-seed), 's' (seed), 'a' (series a), 'ff' (friends & family) |
| instrument_type | text | 'safe', 'note', 'equity' |
| state | text | 'draft', 'open', 'closed' |
| target_raise | numeric | Target amount to raise |
| round_number | integer | Sequential number (1, 2, 3...) |
| closure_reason | text | Reason for closing |
| closure_notes | text | Internal notes on closure |
| closed_at | timestamp | When round was closed |

### round_terms
Deal terms configuration for each round.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| round_id | uuid | FK to rounds |
| valuation_cap | numeric | Valuation cap amount |
| discount_rate | numeric | Discount percentage |
| minimum_ticket | numeric | Minimum investment amount |
| pro_rata_enabled | boolean | Pro-rata rights enabled |
| mfn_enabled | boolean | Most Favored Nation enabled |
| company_name | text | Legal company name |
| entity_type | text | Corporation type |
| jurisdiction | text | Legal jurisdiction |
| registered_address | text | Company address |
| signatory_name | text | Person signing documents |
| signatory_title | text | Signatory's title |
| wire_* | text | Wire instruction fields |
| countersign_expiry_hours | integer | Hours before countersign expires |

### investors
Investor contacts in a workspace.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | Owner's user id |
| name | text | Investor name |
| slug | text | URL-safe identifier |
| email | text | Email address |
| entity_name | text | Entity/firm name |
| entity_type | text | 'individual' or 'institutional' |
| address | text | Mailing address |
| status | text | Pipeline status (see below) |

**Investor Status Values:**
- `prospect` - Added after initial meeting
- `pitch` - Accessed shared memo
- `contract` - Accessed docket
- `won` - Signed and funded
- `lost` - Inactive/declined/expired

### memos
Investment memo documents.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| round_id | uuid | FK to rounds |
| investor_id | uuid | FK to investors (null for global) |
| is_global | boolean | True for main memo |
| content | jsonb | TipTap document JSON |
| memo_code | text | Auto-generated code (MEMO-XXX) |
| version | integer | Version number |
| created_by | uuid | Creator's user id |

### dockets
Deal documentation and agreements. Each docket represents an investor's SAFE agreement for a specific round.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| round_id | uuid | FK to rounds |
| investor_id | uuid | FK to investors |
| is_global | boolean | True for template |
| docket_id | text | Auto-generated ID (S-1, PS-2, A-3, etc.) based on round_type |
| docket_number | integer | Sequential per round |
| status | text | Docket lifecycle status (see below) |
| commitment_status | text | 'none', 'signed' |
| commitment_flow_state | jsonb | Persisted flow state (current_step, completed_steps, form data) |
| amount | numeric | Investment amount entered by investor |
| investor_name | text | Name captured during flow |
| investor_email | text | Email captured during flow |
| investor_phone | text | Phone captured during flow |
| investor_address | text | Address captured during flow |
| investor_entity_type | text | 'individual' or 'entity' |
| investor_entity_name | text | Entity name if applicable |
| custom_terms | text | Side letter / custom terms (markdown) |
| show_deal_terms | boolean | Founder toggle: show terms to investor |
| wire_received | boolean | Founder marks funds received |
| wire_received_at | timestamp | When wire was confirmed |
| access_key_id | uuid | FK to access_keys for this docket |
| created_by | uuid | Founder who created docket |

**Docket Status Lifecycle:**
```
Drafted → Viewed → Signed → Executed → Funded
    ↓
  Voided (only from Drafted state)
```

| Status | Description | Constraints |
|--------|-------------|-------------|
| `Drafted` | Created, link not yet accessed | Can be voided |
| `Viewed` | Investor accessed the docket link | Cannot void |
| `Signed` | Investor completed e-signature | Cannot void, legally binding |
| `Executed` | Counter-signature applied | Cannot void |
| `Funded` | wire_received=true | Final state, deal complete |
| `Voided` | Cancelled by founder | Only from Drafted status |

**commitment_flow_state Structure:**
```json
{
  "current_step": "sign",
  "completed_steps": ["terms", "details", "amount", "generate"],
  "investor_details": { "name": "...", "email": "...", ... },
  "amount": 50000
}
```

**Docket ID Format:**
Generated via `generate_docket_id()` trigger using round_type prefix:
- Pre-Seed: `PS-1`, `PS-2`
- Seed: `S-1`, `S-2`
- Series A: `A-1`, `A-2`
- Friends & Family: `FF-1`, `FF-2`

### access_keys
Shareable access tokens for investors.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| key | text | Access key string (llzk-rxqh-ryya-epep format) |
| workspace_id | uuid | Owner's user id |
| round_id | uuid | FK to rounds |
| investor_id | uuid | FK to investors |
| tool | text | 'memo' or 'docket' |
| status | text | 'active', 'voided', 'expired' |
| expires_at | timestamp | Expiration time |
| last_used_at | timestamp | Last access time |

### signatures
E-signature records for dockets.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| docket_id | uuid | FK to dockets |
| signer_name | text | Full name |
| signer_type | text | 'investor' or 'company' |
| signer_email | text | Email address |
| signer_title | text | Title (for company) |
| signature_data | text | Signature text/data |
| ip_address | text | Signer's IP |
| signed_at | timestamp | Signature timestamp |

### activity_logs
Audit trail of all actions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | Owner's user id |
| round_id | uuid | FK to rounds |
| investor_id | uuid | FK to investors |
| memo_id | uuid | FK to memos |
| docket_id | uuid | FK to dockets |
| action_type | text | Action identifier |
| metadata | jsonb | Additional data |

**Action Types:**
- `memo_updated`, `memo_version_created`, `memo_published`
- `access_key_generated`, `memo_link_generated`
- `docket_created`, `docket_voided`, `docket_archived`
- `investor_added`, `investor_updated`, `investor_funded`
- `investor_signed`, `deal_executed`, `investor_marked_passed`
- `round_created`, `round_closed`, `round_reopened`

## Supporting Tables

### share_links
Token-based document sharing.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| token | text | UUID token |
| memo_id | uuid | FK to memos |
| docket_id | uuid | FK to dockets |
| permissions | text | 'view', 'preview' |
| expires_at | timestamp | Expiration |

### access_logs
Low-level access tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| access_key_id | uuid | FK to access_keys |
| action | text | Action performed |
| ip_address | text | Client IP |
| user_agent | text | Browser info |
| timestamp | timestamp | When accessed |

### invite_codes
User invitation codes (3 per new user).

### memo_versions
Version history for memos.

### thesis_chat_messages
AI chat message history (legacy).

### action_messages
Tab card action persistence.

## Database Functions

### generate_docket_id()
Trigger function that auto-generates docket_id (e.g., S-1, PS-2) on insert.

### generate_memo_code()
Trigger function that auto-generates memo_code (MEMO-XXX) using Base36 timestamp encoding.

### handle_new_user()
Trigger on auth.users that creates profile, assigns role, creates invite codes.

### validate_and_use_invite_code()
SECURITY DEFINER function for safe invite code validation.

### check_invite_code_valid()
SECURITY DEFINER function to check code without incrementing usage.

### insert_access_log()
SECURITY DEFINER function for inserting access logs (prevents forgery).

### has_role()
Check if user has a specific role (admin, moderator, user).
