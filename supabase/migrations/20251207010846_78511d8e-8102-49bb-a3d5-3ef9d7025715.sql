-- Drop existing check constraint and add new one that includes 'preview'
ALTER TABLE public.share_links DROP CONSTRAINT IF EXISTS share_links_permissions_check;
ALTER TABLE public.share_links ADD CONSTRAINT share_links_permissions_check 
  CHECK (permissions IN ('view', 'edit', 'preview'));