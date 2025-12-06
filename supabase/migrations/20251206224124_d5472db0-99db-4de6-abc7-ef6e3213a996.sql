-- Add structured wire instruction fields to round_terms
ALTER TABLE public.round_terms 
ADD COLUMN IF NOT EXISTS wire_bank_name text,
ADD COLUMN IF NOT EXISTS wire_account_name text,
ADD COLUMN IF NOT EXISTS wire_account_number text,
ADD COLUMN IF NOT EXISTS wire_routing_number text,
ADD COLUMN IF NOT EXISTS wire_swift_code text,
ADD COLUMN IF NOT EXISTS wire_bank_address text,
ADD COLUMN IF NOT EXISTS wire_reference text;