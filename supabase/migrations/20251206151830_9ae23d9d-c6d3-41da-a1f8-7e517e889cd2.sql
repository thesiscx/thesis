-- Create table for persistent Circuit AI chat messages
CREATE TABLE public.circuit_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_archived boolean NOT NULL DEFAULT false
);

-- Index for efficient pagination by user
CREATE INDEX idx_circuit_chat_messages_user_created ON public.circuit_chat_messages (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.circuit_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages
CREATE POLICY "Users can view their own chat messages"
  ON public.circuit_chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert their own chat messages"
  ON public.circuit_chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages (for archiving)
CREATE POLICY "Users can update their own chat messages"
  ON public.circuit_chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id);