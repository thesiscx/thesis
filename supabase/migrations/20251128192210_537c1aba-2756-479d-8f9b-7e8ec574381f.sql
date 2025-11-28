-- Create storage bucket for memo images
INSERT INTO storage.buckets (id, name, public)
VALUES ('memo-images', 'memo-images', true);

-- Storage policies for memo-images bucket
CREATE POLICY "Authenticated users can upload memo images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'memo-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their memo images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'memo-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view memo images"
ON storage.objects FOR SELECT
USING (bucket_id = 'memo-images');

CREATE POLICY "Users can delete their memo images"
ON storage.objects FOR DELETE
USING (bucket_id = 'memo-images' AND auth.uid() IS NOT NULL);

-- Add version column to memos table
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create memo_versions table for version history
CREATE TABLE public.memo_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL REFERENCES public.memos(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on memo_versions
ALTER TABLE public.memo_versions ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can manage versions for their memos
CREATE POLICY "Users can manage memo versions for their memos"
ON public.memo_versions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.memos m
    JOIN public.rounds r ON r.id = m.round_id
    WHERE m.id = memo_versions.memo_id
    AND r.created_by = auth.uid()
  )
);

-- Index for faster version lookups
CREATE INDEX idx_memo_versions_memo_id ON public.memo_versions(memo_id);
CREATE INDEX idx_memo_versions_version ON public.memo_versions(memo_id, version DESC);