-- Drop the existing constraint and add new one with equity option
ALTER TABLE public.rounds DROP CONSTRAINT rounds_instrument_type_check;

ALTER TABLE public.rounds ADD CONSTRAINT rounds_instrument_type_check 
CHECK (instrument_type = ANY (ARRAY['safe'::text, 'note'::text, 'equity'::text]));