-- Add docket_number and docket_id columns to dockets table
ALTER TABLE public.dockets 
ADD COLUMN docket_number integer,
ADD COLUMN docket_id text;

-- Create function to generate docket_id based on round_type and sequential number
CREATE OR REPLACE FUNCTION public.generate_docket_id()
RETURNS TRIGGER AS $$
DECLARE
  round_type_prefix text;
  round_type_value text;
  next_number integer;
BEGIN
  -- Get the round_type from the rounds table
  SELECT round_type INTO round_type_value
  FROM public.rounds
  WHERE id = NEW.round_id;
  
  -- Map round_type to prefix (uppercase)
  round_type_prefix := UPPER(COALESCE(round_type_value, 's'));
  
  -- Get the next sequential number for this round
  SELECT COALESCE(MAX(docket_number), 0) + 1 INTO next_number
  FROM public.dockets
  WHERE round_id = NEW.round_id;
  
  -- Set the values
  NEW.docket_number := next_number;
  NEW.docket_id := round_type_prefix || '-' || next_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate docket_id on insert
CREATE TRIGGER generate_docket_id_trigger
BEFORE INSERT ON public.dockets
FOR EACH ROW
EXECUTE FUNCTION public.generate_docket_id();

-- Backfill existing dockets with sequential IDs
WITH numbered_dockets AS (
  SELECT 
    d.id,
    d.round_id,
    r.round_type,
    ROW_NUMBER() OVER (PARTITION BY d.round_id ORDER BY d.created_at) as num
  FROM public.dockets d
  JOIN public.rounds r ON r.id = d.round_id
  WHERE d.docket_id IS NULL
)
UPDATE public.dockets d
SET 
  docket_number = nd.num,
  docket_id = UPPER(COALESCE(nd.round_type, 's')) || '-' || nd.num
FROM numbered_dockets nd
WHERE d.id = nd.id;