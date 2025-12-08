-- Add memo_code column to memos table
ALTER TABLE public.memos ADD COLUMN memo_code text;

-- Create function to generate memo code using Base36 encoding of timestamp
CREATE OR REPLACE FUNCTION public.generate_memo_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ts_ms bigint;
  base36_chars text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  encoded text := '';
  remainder integer;
BEGIN
  -- Get current timestamp in milliseconds
  ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint;
  
  -- Encode to Base36
  WHILE ts_ms > 0 LOOP
    remainder := (ts_ms % 36)::integer;
    encoded := substr(base36_chars, remainder + 1, 1) || encoded;
    ts_ms := ts_ms / 36;
  END LOOP;
  
  -- Take last 3 characters (most variable part) and format as MEMO-XXX
  NEW.memo_code := 'MEMO-' || RIGHT(encoded, 3);
  
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-generation on INSERT
CREATE TRIGGER generate_memo_code_trigger
BEFORE INSERT ON public.memos
FOR EACH ROW
WHEN (NEW.memo_code IS NULL)
EXECUTE FUNCTION public.generate_memo_code();

-- Backfill existing memos with generated codes
UPDATE public.memos
SET memo_code = 'MEMO-' || RIGHT(
  (
    SELECT string_agg(substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', ((n % 36) + 1)::integer, 1), '')
    FROM (
      SELECT (EXTRACT(EPOCH FROM created_at) * 1000 + (ROW_NUMBER() OVER ()))::bigint AS ts,
             generate_series(1, 10) AS pos,
             ((EXTRACT(EPOCH FROM created_at) * 1000 + (ROW_NUMBER() OVER ()))::bigint / POWER(36, generate_series(1, 10) - 1)::bigint % 36) AS n
      FROM (SELECT created_at FROM memos WHERE id = memos.id) sub
    ) encoded
  ),
  3
)
WHERE memo_code IS NULL;