-- 1. Remove overly permissive public SELECT on access_keys
-- The validation is done server-side with service role key
DROP POLICY IF EXISTS "Public can validate access keys" ON public.access_keys;

-- 2. Remove overly permissive public SELECT on invite_codes
-- Keep only the user's own codes visible, validation done server-side
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.invite_codes;

-- 3. Create SECURITY DEFINER function for inserting access logs
-- This prevents public from inserting arbitrary logs
CREATE OR REPLACE FUNCTION public.insert_access_log(
  p_access_key_id uuid,
  p_ip_address text,
  p_user_agent text,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.access_logs (access_key_id, ip_address, user_agent, action)
  VALUES (p_access_key_id, p_ip_address, p_user_agent, p_action);
END;
$$;

-- 4. Remove overly permissive INSERT on access_logs
DROP POLICY IF EXISTS "Allow system to insert access logs" ON public.access_logs;

-- 5. Update profiles to only allow authenticated users to view
-- Remove the public "viewable by everyone" policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Allow authenticated users to view profiles (needed for company info lookups)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 6. Create SECURITY DEFINER function for incrementing invite code usage
-- This is called from edge function with service role
CREATE OR REPLACE FUNCTION public.validate_and_use_invite_code(
  p_code text,
  p_user_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_code RECORD;
  v_result jsonb;
BEGIN
  -- Look up the invite code
  SELECT * INTO v_invite_code
  FROM public.invite_codes
  WHERE code = p_code AND is_active = true;
  
  -- Return generic error if not found (prevents enumeration)
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired code');
  END IF;
  
  -- Check if exhausted
  IF v_invite_code.max_uses IS NOT NULL AND v_invite_code.used_count >= v_invite_code.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired code');
  END IF;
  
  -- Check if expired
  IF v_invite_code.expires_at IS NOT NULL AND v_invite_code.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired code');
  END IF;
  
  -- Increment usage
  UPDATE public.invite_codes
  SET used_count = used_count + 1
  WHERE id = v_invite_code.id;
  
  -- Log the usage
  INSERT INTO public.invite_code_uses (invite_code_id, used_by, ip_address, user_agent)
  VALUES (v_invite_code.id, p_user_id, p_ip_address, p_user_agent);
  
  RETURN jsonb_build_object('valid', true, 'code_id', v_invite_code.id);
END;
$$;