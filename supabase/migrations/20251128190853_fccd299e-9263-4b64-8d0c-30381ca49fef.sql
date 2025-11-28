-- Add owner_id to invite_codes for user-owned codes
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create table to track individual invite code uses
CREATE TABLE public.invite_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id uuid NOT NULL REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  location jsonb
);

-- Enable RLS
ALTER TABLE public.invite_code_uses ENABLE ROW LEVEL SECURITY;

-- RLS policies for invite_code_uses
CREATE POLICY "Admins can view all invite code uses"
ON public.invite_code_uses FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own invite code uses"
ON public.invite_code_uses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invite_codes ic
    WHERE ic.id = invite_code_uses.invite_code_id
    AND ic.owner_id = auth.uid()
  )
);

CREATE POLICY "Allow system to insert invite code uses"
ON public.invite_code_uses FOR INSERT
WITH CHECK (true);

-- Update invite_codes RLS to allow users to view their own codes
CREATE POLICY "Users can view their own invite codes"
ON public.invite_codes FOR SELECT
USING (owner_id = auth.uid());

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to create invite codes for a user
CREATE OR REPLACE FUNCTION public.create_user_invite_codes(user_id uuid, count integer DEFAULT 3)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
  new_code text;
BEGIN
  FOR i IN 1..count LOOP
    -- Generate unique code
    LOOP
      new_code := generate_invite_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = new_code);
    END LOOP;
    
    INSERT INTO public.invite_codes (code, owner_id, max_uses, is_active)
    VALUES (new_code, user_id, 1, true);
  END LOOP;
END;
$$;

-- Update handle_new_user to create 3 invite codes for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- Assign admin role to first user, regular user role to others
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'user');
  END IF;
  
  -- Create 3 invite codes for the new user
  PERFORM public.create_user_invite_codes(new.id, 3);
  
  RETURN new;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_invite_codes_owner_id ON public.invite_codes(owner_id);
CREATE INDEX idx_invite_code_uses_invite_code_id ON public.invite_code_uses(invite_code_id);
CREATE INDEX idx_invite_code_uses_used_at ON public.invite_code_uses(used_at DESC);