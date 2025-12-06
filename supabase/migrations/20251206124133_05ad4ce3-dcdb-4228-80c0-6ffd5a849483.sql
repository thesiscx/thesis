-- Add admin policies to view all data for admin dashboard

-- Admins can view all profiles (profiles already has "viewable by everyone" policy, but let's be explicit)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all rounds
CREATE POLICY "Admins can view all rounds"
ON public.rounds
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all memos
CREATE POLICY "Admins can view all memos"
ON public.memos
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all investors
CREATE POLICY "Admins can view all investors"
ON public.investors
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all invite codes (already have some policies but add explicit read)
-- Note: "Anyone can validate invite codes" already exists with USING (true) for SELECT