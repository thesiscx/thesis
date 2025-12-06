-- Add flow persistence columns to action_messages table
ALTER TABLE public.action_messages
ADD COLUMN IF NOT EXISTS flow_type text,
ADD COLUMN IF NOT EXISTS flow_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS flow_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS flow_complete boolean DEFAULT false;