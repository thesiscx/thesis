-- Add closure tracking columns to rounds table
ALTER TABLE public.rounds 
ADD COLUMN closure_reason text,
ADD COLUMN closure_notes text,
ADD COLUMN closed_at timestamp with time zone;