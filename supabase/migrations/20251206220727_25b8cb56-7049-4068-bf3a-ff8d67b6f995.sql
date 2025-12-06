-- Create a function to check if an invite code is valid (without incrementing usage)
CREATE OR REPLACE FUNCTION public.check_invite_code_valid(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_code RECORD;
BEGIN
  SELECT * INTO v_invite_code
  FROM public.invite_codes
  WHERE code = p_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid code');
  END IF;
  
  IF v_invite_code.max_uses IS NOT NULL AND v_invite_code.used_count >= v_invite_code.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code exhausted');
  END IF;
  
  IF v_invite_code.expires_at IS NOT NULL AND v_invite_code.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code expired');
  END IF;
  
  RETURN jsonb_build_object('valid', true);
END;
$$;