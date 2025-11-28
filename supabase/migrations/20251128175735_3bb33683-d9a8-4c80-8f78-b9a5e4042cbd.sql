-- Drop existing tables that won't be used (keeping profiles and user_roles)
-- Note: We're starting fresh as requested

-- Create rounds table
CREATE TABLE public.rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    instrument_type TEXT NOT NULL DEFAULT 'safe' CHECK (instrument_type IN ('safe', 'note')),
    state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'live', 'closed', 'archived')),
    target_raise DECIMAL(15, 2),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, slug)
);

-- Create round_terms table (SAFE/Note specifics)
CREATE TABLE public.round_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    valuation_cap DECIMAL(15, 2),
    discount_rate DECIMAL(5, 2),
    minimum_ticket DECIMAL(15, 2),
    mfn_enabled BOOLEAN DEFAULT false,
    pro_rata_enabled BOOLEAN DEFAULT false,
    company_name TEXT,
    entity_type TEXT,
    jurisdiction TEXT,
    registered_address TEXT,
    signatory_name TEXT,
    signatory_title TEXT,
    wire_instructions TEXT,
    countersign_expiry_hours INTEGER DEFAULT 72,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(round_id)
);

-- Create investors table
CREATE TABLE public.investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    entity_name TEXT,
    entity_type TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, slug)
);

-- Create memos table (global + investor variants)
CREATE TABLE public.memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE,
    is_global BOOLEAN NOT NULL DEFAULT false,
    content JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(round_id, investor_id),
    CONSTRAINT global_memo_no_investor CHECK (
        (is_global = true AND investor_id IS NULL) OR 
        (is_global = false AND investor_id IS NOT NULL)
    )
);

-- Create dockets table (global template + investor agreements)
CREATE TABLE public.dockets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE,
    is_global BOOLEAN NOT NULL DEFAULT false,
    content JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'investor_signed', 'executed', 'expired')),
    amount DECIMAL(15, 2),
    wire_received BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(round_id, investor_id)
);

-- Create share_links table
CREATE TABLE public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID REFERENCES public.memos(id) ON DELETE CASCADE,
    docket_id UUID REFERENCES public.dockets(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    permissions TEXT NOT NULL DEFAULT 'view' CHECK (permissions IN ('view', 'invest')),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT link_target_check CHECK (
        (memo_id IS NOT NULL AND docket_id IS NULL) OR
        (memo_id IS NULL AND docket_id IS NOT NULL) OR
        (memo_id IS NOT NULL AND docket_id IS NOT NULL)
    )
);

-- Create signatures table
CREATE TABLE public.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docket_id UUID NOT NULL REFERENCES public.dockets(id) ON DELETE CASCADE,
    signer_type TEXT NOT NULL CHECK (signer_type IN ('investor', 'founder')),
    signer_name TEXT NOT NULL,
    signer_title TEXT,
    signer_email TEXT,
    signature_data TEXT,
    ip_address TEXT,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(docket_id, signer_type)
);

-- Enable RLS on all tables
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rounds (founders can manage their own rounds)
CREATE POLICY "Users can view their own rounds"
ON public.rounds FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can create rounds"
ON public.rounds FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own rounds"
ON public.rounds FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own rounds"
ON public.rounds FOR DELETE
USING (created_by = auth.uid());

-- RLS for round_terms
CREATE POLICY "Users can manage round_terms for their rounds"
ON public.round_terms FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.rounds 
    WHERE rounds.id = round_terms.round_id 
    AND rounds.created_by = auth.uid()
));

-- RLS for investors
CREATE POLICY "Users can manage their investors"
ON public.investors FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.rounds 
    WHERE rounds.workspace_id = investors.workspace_id 
    AND rounds.created_by = auth.uid()
));

-- RLS for memos
CREATE POLICY "Users can manage memos for their rounds"
ON public.memos FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.rounds 
    WHERE rounds.id = memos.round_id 
    AND rounds.created_by = auth.uid()
));

-- RLS for dockets
CREATE POLICY "Users can manage dockets for their rounds"
ON public.dockets FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.rounds 
    WHERE rounds.id = dockets.round_id 
    AND rounds.created_by = auth.uid()
));

-- RLS for share_links
CREATE POLICY "Users can manage their share links"
ON public.share_links FOR ALL
USING (created_by = auth.uid());

-- RLS for signatures
CREATE POLICY "Users can view signatures for their dockets"
ON public.signatures FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.dockets d
    JOIN public.rounds r ON r.id = d.round_id
    WHERE d.id = signatures.docket_id 
    AND r.created_by = auth.uid()
));

CREATE POLICY "Allow signature insertion"
ON public.signatures FOR INSERT
WITH CHECK (true);

-- Public access policies for investors via share links
CREATE POLICY "Public can view memos via share link"
ON public.memos FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.share_links sl
    WHERE sl.memo_id = memos.id
    AND (sl.expires_at IS NULL OR sl.expires_at > now())
));

CREATE POLICY "Public can view dockets via share link"
ON public.dockets FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.share_links sl
    WHERE sl.docket_id = dockets.id
    AND (sl.expires_at IS NULL OR sl.expires_at > now())
));

-- Triggers for updated_at
CREATE TRIGGER update_rounds_updated_at
BEFORE UPDATE ON public.rounds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_round_terms_updated_at
BEFORE UPDATE ON public.round_terms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investors_updated_at
BEFORE UPDATE ON public.investors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memos_updated_at
BEFORE UPDATE ON public.memos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dockets_updated_at
BEFORE UPDATE ON public.dockets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();