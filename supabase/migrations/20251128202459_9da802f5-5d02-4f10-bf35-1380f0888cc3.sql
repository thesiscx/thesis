-- Phase 1: Database Schema Updates

-- 1.1 Add company_slug to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_slug TEXT UNIQUE;

-- Add check constraint for valid slug format (lowercase alphanumeric and hyphens, 3-20 chars)
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_company_slug CHECK (
  company_slug IS NULL OR 
  (company_slug ~ '^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$' AND company_slug !~ '--')
);

-- 1.2 Add round_type and round_number to rounds
ALTER TABLE public.rounds 
ADD COLUMN IF NOT EXISTS round_type TEXT NOT NULL DEFAULT 's',
ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1;

-- Add constraint for valid round types
ALTER TABLE public.rounds 
ADD CONSTRAINT valid_round_type CHECK (
  round_type IN ('ff', 'ps', 's', 'br', 'a', 'b', 'c', 'd', 'e', 'f')
);

-- 1.3 Modify access_keys table for Thesis investor access
-- Add new columns
ALTER TABLE public.access_keys 
ADD COLUMN IF NOT EXISTS investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS tool TEXT,
ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Add check constraint for tool
ALTER TABLE public.access_keys 
ADD CONSTRAINT valid_tool CHECK (tool IS NULL OR tool IN ('memo', 'docket'));

-- Make stakeholder_id nullable (keeping for backwards compatibility)
ALTER TABLE public.access_keys ALTER COLUMN stakeholder_id DROP NOT NULL;

-- Add unique constraint for investor/round/tool combo
ALTER TABLE public.access_keys 
ADD CONSTRAINT unique_investor_round_tool UNIQUE (investor_id, round_id, tool);

-- 1.4 Update RLS policies for access_keys to support founder access
CREATE POLICY "Founders can manage access keys for their investors"
ON public.access_keys
FOR ALL
USING (
  workspace_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.rounds r
    WHERE r.id = access_keys.round_id AND r.created_by = auth.uid()
  )
)
WITH CHECK (
  workspace_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.rounds r
    WHERE r.id = access_keys.round_id AND r.created_by = auth.uid()
  )
);

-- Allow public to validate keys (for investor access)
CREATE POLICY "Public can validate access keys"
ON public.access_keys
FOR SELECT
USING (true);