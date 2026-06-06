# Thesis Edge Functions

All edge functions are located in `supabase/functions/` and deploy automatically.

## Authentication & Access

### check-user-exists
Checks if a user with given email exists in auth system.

**Request:**
```json
{ "email": "user@example.com" }
```

**Response:**
```json
{ "exists": true }
```

**Security:** Uses service role, returns generic errors to prevent enumeration.

### validate-access-key
Validates investor access keys and returns document context.

**Request:**
```json
{ "accessKey": "llzk-rxqh-ryya-epep" }
```

**Response:**
```json
{
  "valid": true,
  "roundId": "uuid",
  "investorId": "uuid",
  "tool": "memo",
  "companyName": "Robomart",
  "companySlug": "robomart",
  "roundSlug": "seed",
  "investorSlug": "ali-ahmed",
  "logoUrl": "https://..."
}
```

**Security:** Checks key status, expiration, logs access.

### generate-access-key
Creates new access key for an investor.

**Request:**
```json
{
  "workspaceId": "uuid",
  "roundId": "uuid",
  "investorId": "uuid",
  "tool": "memo"
}
```

**Response:**
```json
{
  "success": true,
  "accessKey": {
    "id": "uuid",
    "key": "llzk-rxqh-ryya-epep"
  }
}
```

## AI & Content Generation

### draft-memo-ai
Generates or edits memo content using Lovable AI (Gemini).

**Request (new memo):**
```json
{
  "mode": "generate",
  "companyInfo": {
    "name": "Robomart",
    "description": "...",
    "website": "..."
  },
  "roundInfo": {
    "type": "seed",
    "instrument": "safe",
    "target": 2000000
  },
  "highlights": ["key point 1", "key point 2"]
}
```

**Request (edit memo):**
```json
{
  "mode": "edit",
  "existingContent": { /* TipTap JSON */ },
  "editInstructions": "Make the vision section more compelling"
}
```

**Response:**
```json
{
  "success": true,
  "content": { /* TipTap JSON */ }
}
```

**AI Model:** Uses google/gemini-2.5-flash via Lovable AI.

### thesis-chat
AI assistant for fundraising advice (legacy, being replaced by tab cards).

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "How should I structure my SAFE?" }
  ],
  "context": {
    "page": "memo",
    "roundId": "uuid"
  }
}
```

### thesis-action
Processes action card commands (legacy).

## Document Generation

### generate-safe-document
Generates SAFE agreement PDF from template.

**Request:**
```json
{
  "docketId": "uuid",
  "includeSignatures": true
}
```

**Response:**
```json
{
  "success": true,
  "pdfBase64": "...",
  "documentId": "uuid"
}
```

Uses YC Post-Money SAFE template with variable substitution.

### parse-wire-instructions
Extracts wire transfer details from uploaded PDF.

**Request:**
```json
{
  "fileUrl": "https://storage.../wire-instructions.pdf",
  "roundId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "wireInstructions": {
    "bankName": "Silicon Valley Bank",
    "accountName": "Robomart Inc",
    "accountNumber": "...",
    "routingNumber": "...",
    "swiftCode": "...",
    "bankAddress": "..."
  }
}
```

**AI Model:** Uses google/gemini-2.5-pro for PDF parsing.

### get-document-urls
Generates signed URLs for document downloads.

**Request:**
```json
{ "accessKey": "llzk-rxqh-ryya-epep" }
```

**Response:**
```json
{
  "files": [
    { "name": "safe-agreement.pdf", "url": "signed-url..." }
  ]
}
```

## Activity Logging

### log-investor-activity
Logs investor-side actions (bypasses RLS for unauthenticated users).

**Request:**
```json
{
  "actionType": "investor_signed",
  "docketId": "uuid",
  "roundId": "uuid",
  "investorId": "uuid",
  "metadata": { "amount": 100000 }
}
```

**Security:** Uses service role to insert into activity_logs.

### update-investor-docket
Updates docket status and fields after investor actions.

**Request:**
```json
{
  "docketId": "uuid",
  "updates": {
    "status": "Signed",
    "investor_name": "Ali Ahmed",
    "amount": 100000
  }
}
```

## Environment Variables

All edge functions have access to:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for admin operations
- `LOVABLE_API_KEY` - For Lovable AI calls

## CORS Configuration

All functions include standard CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

Handle OPTIONS preflight:
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

## Error Handling Pattern

```typescript
try {
  // ... function logic
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
} catch (error) {
  console.error('Function error:', error);
  return new Response(JSON.stringify({ 
    success: false, 
    error: 'An error occurred' // Generic message
  }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```
