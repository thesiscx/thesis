-- Add docket configuration and investor commitment columns
ALTER TABLE public.dockets 
ADD COLUMN IF NOT EXISTS show_deal_terms boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS custom_terms text,
ADD COLUMN IF NOT EXISTS commitment_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS investor_name text,
ADD COLUMN IF NOT EXISTS investor_email text,
ADD COLUMN IF NOT EXISTS investor_phone text,
ADD COLUMN IF NOT EXISTS investor_address text,
ADD COLUMN IF NOT EXISTS investor_entity_name text,
ADD COLUMN IF NOT EXISTS investor_entity_type text;

-- Add constraint for commitment_status values
ALTER TABLE public.dockets 
ADD CONSTRAINT dockets_commitment_status_check 
CHECK (commitment_status IN ('none', 'reviewing', 'committed', 'signed'));