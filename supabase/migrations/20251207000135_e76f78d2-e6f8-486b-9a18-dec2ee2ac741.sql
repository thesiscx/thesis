-- Add round_id column to action_messages table
ALTER TABLE public.action_messages 
ADD COLUMN round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE;

-- Add round_id column to circuit_chat_messages table
ALTER TABLE public.circuit_chat_messages 
ADD COLUMN round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE;

-- Create indexes for efficient filtering by round
CREATE INDEX idx_action_messages_round_id ON public.action_messages(round_id);
CREATE INDEX idx_circuit_chat_messages_round_id ON public.circuit_chat_messages(round_id);