-- Update the rounds_state_check constraint to include 'open' state
ALTER TABLE public.rounds DROP CONSTRAINT rounds_state_check;

ALTER TABLE public.rounds ADD CONSTRAINT rounds_state_check 
CHECK (state = ANY (ARRAY['draft'::text, 'open'::text, 'live'::text, 'closed'::text, 'archived'::text]));