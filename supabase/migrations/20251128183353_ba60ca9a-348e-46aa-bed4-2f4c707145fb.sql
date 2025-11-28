-- Create invite_codes table
CREATE TABLE public.invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a code is valid (needed for auth flow)
CREATE POLICY "Anyone can validate invite codes"
ON public.invite_codes
FOR SELECT
USING (true);

-- Only admins can manage invite codes
CREATE POLICY "Admins can insert invite codes"
ON public.invite_codes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invite codes"
ON public.invite_codes
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invite codes"
ON public.invite_codes
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add startup fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create storage bucket for pitch decks
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pitch-decks', 'pitch-decks', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pitch decks
CREATE POLICY "Users can upload their own pitch decks"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'pitch-decks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own pitch decks"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pitch-decks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own pitch decks"
ON storage.objects
FOR DELETE
USING (bucket_id = 'pitch-decks' AND auth.uid()::text = (storage.foldername(name))[1]);