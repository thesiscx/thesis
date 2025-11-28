-- Create function to increment invite code usage
CREATE OR REPLACE FUNCTION public.increment_invite_code_usage(code_value TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invite_codes
  SET used_count = used_count + 1
  WHERE code = code_value;
END;
$$;