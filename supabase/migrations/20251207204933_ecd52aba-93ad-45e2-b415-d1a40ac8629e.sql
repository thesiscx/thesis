-- Create activity_logs table for tracking all fundraising activity
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  round_id UUID REFERENCES public.rounds(id) ON DELETE SET NULL,
  investor_id UUID REFERENCES public.investors(id) ON DELETE SET NULL,
  docket_id UUID REFERENCES public.dockets(id) ON DELETE SET NULL,
  memo_id UUID REFERENCES public.memos(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries by workspace
CREATE INDEX idx_activity_logs_workspace_id ON public.activity_logs(workspace_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs"
ON public.activity_logs
FOR SELECT
USING (workspace_id = auth.uid());

-- Policy: Users can insert their own activity logs
CREATE POLICY "Users can insert their own activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (workspace_id = auth.uid());

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;