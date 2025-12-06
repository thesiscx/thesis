-- Create table for page-specific action messages (guided chat, not open-ended)
CREATE TABLE public.action_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  page_key text NOT NULL, -- 'stage', 'memo', 'docket', 'pipeline'
  message_type text NOT NULL, -- 'system', 'action', 'confirmation', 'result'
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb, -- Store action-specific data like round_id, investor_name, etc.
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own action messages
CREATE POLICY "Users can view their own action messages"
ON public.action_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own action messages
CREATE POLICY "Users can insert their own action messages"
ON public.action_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own action messages (for clearing page chat)
CREATE POLICY "Users can delete their own action messages"
ON public.action_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for efficient page-based queries
CREATE INDEX idx_action_messages_user_page ON public.action_messages(user_id, page_key, created_at DESC);