-- Add commitment flow state column to dockets for persisting investor progress
ALTER TABLE public.dockets 
ADD COLUMN IF NOT EXISTS commitment_flow_state jsonb DEFAULT '{}'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.dockets.commitment_flow_state IS 'Stores investor commitment flow progress: current_step, completed_steps, investor_details, amount, document_html';