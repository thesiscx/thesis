-- Add access_key_id to dockets for unique identification of commitments from global access keys
ALTER TABLE public.dockets ADD COLUMN IF NOT EXISTS access_key_id uuid REFERENCES public.access_keys(id);

-- Add wire_received_at timestamp for tracking when funds were confirmed
ALTER TABLE public.dockets ADD COLUMN IF NOT EXISTS wire_received_at timestamp with time zone;

-- Enable realtime for dockets table to allow subscription for wire_received updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.dockets;