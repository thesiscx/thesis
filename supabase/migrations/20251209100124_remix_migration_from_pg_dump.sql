CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: check_invite_code_valid(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_invite_code_valid(p_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: create_user_invite_codes(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_invite_codes(user_id uuid, count integer DEFAULT 3) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: generate_docket_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_docket_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  round_type_prefix text;
  round_type_value text;
  next_number integer;
BEGIN
  -- Get the round_type from the rounds table
  SELECT round_type INTO round_type_value
  FROM public.rounds
  WHERE id = NEW.round_id;
  
  -- Map round_type to prefix (uppercase)
  round_type_prefix := UPPER(COALESCE(round_type_value, 's'));
  
  -- Get the next sequential number for this round
  SELECT COALESCE(MAX(docket_number), 0) + 1 INTO next_number
  FROM public.dockets
  WHERE round_id = NEW.round_id;
  
  -- Set the values
  NEW.docket_number := next_number;
  NEW.docket_id := round_type_prefix || '-' || next_number;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_invite_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invite_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: generate_memo_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_memo_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_invite_code_usage(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_invite_code_usage(code_value text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.invite_codes
  SET used_count = used_count + 1
  WHERE code = code_value;
END;
$$;


--
-- Name: insert_access_log(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_access_log(p_access_key_id uuid, p_ip_address text, p_user_agent text, p_action text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.access_logs (access_key_id, ip_address, user_agent, action)
  VALUES (p_access_key_id, p_ip_address, p_user_agent, p_action);
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_and_use_invite_code(text, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_and_use_invite_code(p_code text, p_user_id uuid DEFAULT NULL::uuid, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


SET default_table_access_method = heap;

--
-- Name: access_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    stakeholder_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    created_by uuid,
    investor_id uuid,
    round_id uuid,
    tool text,
    workspace_id uuid,
    CONSTRAINT access_keys_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text]))),
    CONSTRAINT valid_tool CHECK (((tool IS NULL) OR (tool = ANY (ARRAY['memo'::text, 'docket'::text]))))
);


--
-- Name: access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stakeholder_id uuid,
    access_key_id uuid,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    action text NOT NULL
);


--
-- Name: action_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    page_key text NOT NULL,
    message_type text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    flow_type text,
    flow_step integer DEFAULT 0,
    flow_data jsonb DEFAULT '{}'::jsonb,
    flow_complete boolean DEFAULT false,
    round_id uuid
);


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    round_id uuid,
    investor_id uuid,
    docket_id uuid,
    memo_id uuid,
    action_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: circuit_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.circuit_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    round_id uuid,
    CONSTRAINT circuit_chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: dockets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dockets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_id uuid NOT NULL,
    investor_id uuid,
    is_global boolean DEFAULT false NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    amount numeric(15,2),
    wire_received boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    show_deal_terms boolean DEFAULT true,
    custom_terms text,
    commitment_status text DEFAULT 'none'::text,
    investor_name text,
    investor_email text,
    investor_phone text,
    investor_address text,
    investor_entity_name text,
    investor_entity_type text,
    commitment_flow_state jsonb DEFAULT '{}'::jsonb,
    access_key_id uuid,
    wire_received_at timestamp with time zone,
    docket_number integer,
    docket_id text,
    CONSTRAINT dockets_commitment_status_check CHECK ((commitment_status = ANY (ARRAY['none'::text, 'reviewing'::text, 'committed'::text, 'signed'::text]))),
    CONSTRAINT dockets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'investor_signed'::text, 'executed'::text, 'expired'::text])))
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    file_path text NOT NULL,
    category text NOT NULL,
    subcategory text,
    mime_type text,
    size integer,
    uploaded_at timestamp with time zone DEFAULT now(),
    parsed_content text,
    metadata jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    display_name text,
    description text,
    is_public boolean DEFAULT false NOT NULL
);


--
-- Name: investors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    email text,
    entity_name text,
    entity_type text,
    address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'prospect'::text
);


--
-- Name: invite_code_uses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invite_code_uses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invite_code_id uuid NOT NULL,
    used_by uuid,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    location jsonb
);


--
-- Name: invite_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invite_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    max_uses integer DEFAULT 1,
    used_count integer DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    is_active boolean DEFAULT true,
    owner_id uuid
);


--
-- Name: memo_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memo_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memo_id uuid NOT NULL,
    content jsonb NOT NULL,
    version integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: memos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_id uuid NOT NULL,
    investor_id uuid,
    is_global boolean DEFAULT false NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    memo_code text,
    CONSTRAINT global_memo_no_investor CHECK ((((is_global = true) AND (investor_id IS NULL)) OR ((is_global = false) AND (investor_id IS NOT NULL))))
);


--
-- Name: petition_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.petition_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_published boolean DEFAULT false,
    is_draft boolean DEFAULT true,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    published_at timestamp with time zone,
    published_by uuid
);


--
-- Name: petition_content_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.petition_content_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid,
    content jsonb NOT NULL,
    version integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_name text,
    website text,
    description text,
    onboarding_completed boolean DEFAULT false,
    company_slug text,
    CONSTRAINT valid_company_slug CHECK (((company_slug IS NULL) OR ((company_slug ~ '^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$'::text) AND (company_slug !~ '--'::text))))
);


--
-- Name: round_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.round_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_id uuid NOT NULL,
    valuation_cap numeric(15,2),
    discount_rate numeric(5,2),
    minimum_ticket numeric(15,2),
    mfn_enabled boolean DEFAULT false,
    pro_rata_enabled boolean DEFAULT false,
    company_name text,
    entity_type text,
    jurisdiction text,
    registered_address text,
    signatory_name text,
    signatory_title text,
    wire_instructions text,
    countersign_expiry_hours integer DEFAULT 72,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    wire_bank_name text,
    wire_account_name text,
    wire_account_number text,
    wire_routing_number text,
    wire_swift_code text,
    wire_bank_address text,
    wire_reference text
);


--
-- Name: rounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    instrument_type text DEFAULT 'safe'::text NOT NULL,
    state text DEFAULT 'draft'::text NOT NULL,
    target_raise numeric(15,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    round_type text DEFAULT 's'::text NOT NULL,
    round_number integer DEFAULT 1 NOT NULL,
    closure_reason text,
    closure_notes text,
    closed_at timestamp with time zone,
    CONSTRAINT rounds_instrument_type_check CHECK ((instrument_type = ANY (ARRAY['safe'::text, 'note'::text, 'equity'::text]))),
    CONSTRAINT rounds_state_check CHECK ((state = ANY (ARRAY['draft'::text, 'open'::text, 'live'::text, 'closed'::text, 'archived'::text]))),
    CONSTRAINT valid_round_type CHECK ((round_type = ANY (ARRAY['ff'::text, 'ps'::text, 's'::text, 'br'::text, 'a'::text, 'b'::text, 'c'::text, 'd'::text, 'e'::text, 'f'::text])))
);


--
-- Name: share_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.share_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memo_id uuid,
    docket_id uuid,
    token text NOT NULL,
    permissions text DEFAULT 'view'::text NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT link_target_check CHECK ((((memo_id IS NOT NULL) AND (docket_id IS NULL)) OR ((memo_id IS NULL) AND (docket_id IS NOT NULL)) OR ((memo_id IS NOT NULL) AND (docket_id IS NOT NULL)))),
    CONSTRAINT share_links_permissions_check CHECK ((permissions = ANY (ARRAY['view'::text, 'edit'::text, 'preview'::text])))
);


--
-- Name: signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signatures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    docket_id uuid NOT NULL,
    signer_type text NOT NULL,
    signer_name text NOT NULL,
    signer_title text,
    signer_email text,
    signature_data text,
    ip_address text,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT signatures_signer_type_check CHECK ((signer_type = ANY (ARRAY['investor'::text, 'founder'::text])))
);


--
-- Name: stakeholders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stakeholders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    organization text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    short_code text,
    CONSTRAINT stakeholders_short_code_check CHECK ((short_code ~* '^[a-z0-9]{4}$'::text))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: access_keys access_keys_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_keys
    ADD CONSTRAINT access_keys_key_key UNIQUE (key);


--
-- Name: access_keys access_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_keys
    ADD CONSTRAINT access_keys_pkey PRIMARY KEY (id);


--
-- Name: access_logs access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_pkey PRIMARY KEY (id);


--
-- Name: action_messages action_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_messages
    ADD CONSTRAINT action_messages_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: circuit_chat_messages circuit_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit_chat_messages
    ADD CONSTRAINT circuit_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: dockets dockets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dockets
    ADD CONSTRAINT dockets_pkey PRIMARY KEY (id);


--
-- Name: dockets dockets_round_id_investor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dockets
    ADD CONSTRAINT dockets_round_id_investor_id_key UNIQUE (round_id, investor_id);


--
-- Name: documents documents_file_path_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_file_path_unique UNIQUE (file_path);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: investors investors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investors
    ADD CONSTRAINT investors_pkey PRIMARY KEY (id);


--
-- Name: investors investors_workspace_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investors
    ADD CONSTRAINT investors_workspace_id_slug_key UNIQUE (workspace_id, slug);


--
-- Name: invite_code_uses invite_code_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_code_uses
    ADD CONSTRAINT invite_code_uses_pkey PRIMARY KEY (id);


--
-- Name: invite_codes invite_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_codes
    ADD CONSTRAINT invite_codes_code_key UNIQUE (code);


--
-- Name: invite_codes invite_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_codes
    ADD CONSTRAINT invite_codes_pkey PRIMARY KEY (id);


--
-- Name: memo_versions memo_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_versions
    ADD CONSTRAINT memo_versions_pkey PRIMARY KEY (id);


--
-- Name: memos memos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos
    ADD CONSTRAINT memos_pkey PRIMARY KEY (id);


--
-- Name: memos memos_round_id_investor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos
    ADD CONSTRAINT memos_round_id_investor_id_key UNIQUE (round_id, investor_id);


--
-- Name: petition_content petition_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petition_content
    ADD CONSTRAINT petition_content_pkey PRIMARY KEY (id);


--
-- Name: petition_content_versions petition_content_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petition_content_versions
    ADD CONSTRAINT petition_content_versions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_company_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_company_slug_key UNIQUE (company_slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: round_terms round_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_terms
    ADD CONSTRAINT round_terms_pkey PRIMARY KEY (id);


--
-- Name: round_terms round_terms_round_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_terms
    ADD CONSTRAINT round_terms_round_id_key UNIQUE (round_id);


--
-- Name: rounds rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rounds
    ADD CONSTRAINT rounds_pkey PRIMARY KEY (id);


--
-- Name: rounds rounds_workspace_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rounds
    ADD CONSTRAINT rounds_workspace_id_slug_key UNIQUE (workspace_id, slug);


--
-- Name: share_links share_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_pkey PRIMARY KEY (id);


--
-- Name: share_links share_links_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_token_key UNIQUE (token);


--
-- Name: signatures signatures_docket_id_signer_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signatures
    ADD CONSTRAINT signatures_docket_id_signer_type_key UNIQUE (docket_id, signer_type);


--
-- Name: signatures signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signatures
    ADD CONSTRAINT signatures_pkey PRIMARY KEY (id);


--
-- Name: stakeholders stakeholders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stakeholders
    ADD CONSTRAINT stakeholders_pkey PRIMARY KEY (id);


--
-- Name: stakeholders stakeholders_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stakeholders
    ADD CONSTRAINT stakeholders_short_code_key UNIQUE (short_code);


--
-- Name: access_keys unique_investor_round_tool; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_keys
    ADD CONSTRAINT unique_investor_round_tool UNIQUE (investor_id, round_id, tool);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_access_keys_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_keys_key ON public.access_keys USING btree (key);


--
-- Name: idx_access_logs_stakeholder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_stakeholder ON public.access_logs USING btree (stakeholder_id);


--
-- Name: idx_access_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_timestamp ON public.access_logs USING btree ("timestamp" DESC);


--
-- Name: idx_action_messages_round_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_messages_round_id ON public.action_messages USING btree (round_id);


--
-- Name: idx_action_messages_user_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_messages_user_page ON public.action_messages USING btree (user_id, page_key, created_at DESC);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_workspace_id ON public.activity_logs USING btree (workspace_id);


--
-- Name: idx_circuit_chat_messages_round_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_circuit_chat_messages_round_id ON public.circuit_chat_messages USING btree (round_id);


--
-- Name: idx_circuit_chat_messages_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_circuit_chat_messages_user_created ON public.circuit_chat_messages USING btree (user_id, created_at DESC);


--
-- Name: idx_invite_code_uses_invite_code_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_code_uses_invite_code_id ON public.invite_code_uses USING btree (invite_code_id);


--
-- Name: idx_invite_code_uses_used_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_code_uses_used_at ON public.invite_code_uses USING btree (used_at DESC);


--
-- Name: idx_invite_codes_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_codes_owner_id ON public.invite_codes USING btree (owner_id);


--
-- Name: idx_memo_versions_memo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memo_versions_memo_id ON public.memo_versions USING btree (memo_id);


--
-- Name: idx_memo_versions_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memo_versions_version ON public.memo_versions USING btree (memo_id, version DESC);


--
-- Name: dockets generate_docket_id_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_docket_id_trigger BEFORE INSERT ON public.dockets FOR EACH ROW EXECUTE FUNCTION public.generate_docket_id();


--
-- Name: memos generate_memo_code_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_memo_code_trigger BEFORE INSERT ON public.memos FOR EACH ROW WHEN ((new.memo_code IS NULL)) EXECUTE FUNCTION public.generate_memo_code();


--
-- Name: dockets update_dockets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dockets_updated_at BEFORE UPDATE ON public.dockets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: investors update_investors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_investors_updated_at BEFORE UPDATE ON public.investors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: memos update_memos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_memos_updated_at BEFORE UPDATE ON public.memos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: petition_content update_petition_content_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_petition_content_updated_at BEFORE UPDATE ON public.petition_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: round_terms update_round_terms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_round_terms_updated_at BEFORE UPDATE ON public.round_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rounds update_rounds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON public.rounds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stakeholders update_stakeholders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stakeholders_updated_at BEFORE UPDATE ON public.stakeholders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: access_keys access_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_keys
    ADD CONSTRAINT access_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: access_keys access_keys_investor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_keys
    ADD CONSTRAINT access_keys_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE CASCADE;


--
-- Name: access_keys access_keys_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_keys
    ADD CONSTRAINT access_keys_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: access_keys access_keys_stakeholder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_keys
    ADD CONSTRAINT access_keys_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholders(id) ON DELETE CASCADE;


--
-- Name: access_logs access_logs_access_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_access_key_id_fkey FOREIGN KEY (access_key_id) REFERENCES public.access_keys(id) ON DELETE SET NULL;


--
-- Name: access_logs access_logs_stakeholder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholders(id) ON DELETE SET NULL;


--
-- Name: action_messages action_messages_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_messages
    ADD CONSTRAINT action_messages_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_docket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_docket_id_fkey FOREIGN KEY (docket_id) REFERENCES public.dockets(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_investor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE SET NULL;


--
-- Name: circuit_chat_messages circuit_chat_messages_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit_chat_messages
    ADD CONSTRAINT circuit_chat_messages_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: dockets dockets_access_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dockets
    ADD CONSTRAINT dockets_access_key_id_fkey FOREIGN KEY (access_key_id) REFERENCES public.access_keys(id);


--
-- Name: dockets dockets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dockets
    ADD CONSTRAINT dockets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: dockets dockets_investor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dockets
    ADD CONSTRAINT dockets_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE CASCADE;


--
-- Name: dockets dockets_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dockets
    ADD CONSTRAINT dockets_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: invite_code_uses invite_code_uses_invite_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_code_uses
    ADD CONSTRAINT invite_code_uses_invite_code_id_fkey FOREIGN KEY (invite_code_id) REFERENCES public.invite_codes(id) ON DELETE CASCADE;


--
-- Name: invite_code_uses invite_code_uses_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_code_uses
    ADD CONSTRAINT invite_code_uses_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: invite_codes invite_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_codes
    ADD CONSTRAINT invite_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: invite_codes invite_codes_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_codes
    ADD CONSTRAINT invite_codes_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: memo_versions memo_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_versions
    ADD CONSTRAINT memo_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: memo_versions memo_versions_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_versions
    ADD CONSTRAINT memo_versions_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;


--
-- Name: memos memos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos
    ADD CONSTRAINT memos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: memos memos_investor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos
    ADD CONSTRAINT memos_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE CASCADE;


--
-- Name: memos memos_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos
    ADD CONSTRAINT memos_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: petition_content petition_content_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petition_content
    ADD CONSTRAINT petition_content_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: petition_content petition_content_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petition_content
    ADD CONSTRAINT petition_content_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id);


--
-- Name: petition_content_versions petition_content_versions_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petition_content_versions
    ADD CONSTRAINT petition_content_versions_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.petition_content(id) ON DELETE CASCADE;


--
-- Name: petition_content_versions petition_content_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petition_content_versions
    ADD CONSTRAINT petition_content_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: round_terms round_terms_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_terms
    ADD CONSTRAINT round_terms_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: rounds rounds_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rounds
    ADD CONSTRAINT rounds_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: share_links share_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: share_links share_links_docket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_docket_id_fkey FOREIGN KEY (docket_id) REFERENCES public.dockets(id) ON DELETE CASCADE;


--
-- Name: share_links share_links_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;


--
-- Name: signatures signatures_docket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signatures
    ADD CONSTRAINT signatures_docket_id_fkey FOREIGN KEY (docket_id) REFERENCES public.dockets(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: access_keys Admins can delete access keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete access keys" ON public.access_keys FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: documents Admins can delete documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete documents" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invite_codes Admins can delete invite codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete invite codes" ON public.invite_codes FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petition_content Admins can delete petition content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete petition content" ON public.petition_content FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_roles user_roles_1
  WHERE ((user_roles_1.user_id = auth.uid()) AND (user_roles_1.role = 'admin'::public.app_role)))));


--
-- Name: stakeholders Admins can delete stakeholders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete stakeholders" ON public.stakeholders FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petition_content_versions Admins can delete versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete versions" ON public.petition_content_versions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: access_keys Admins can insert access keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert access keys" ON public.access_keys FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: documents Admins can insert documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invite_codes Admins can insert invite codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert invite codes" ON public.invite_codes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petition_content Admins can insert petition content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert petition content" ON public.petition_content FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles user_roles_1
  WHERE ((user_roles_1.user_id = auth.uid()) AND (user_roles_1.role = 'admin'::public.app_role)))));


--
-- Name: stakeholders Admins can insert stakeholders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert stakeholders" ON public.stakeholders FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petition_content_versions Admins can insert versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert versions" ON public.petition_content_versions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: access_keys Admins can update access keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update access keys" ON public.access_keys FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: documents Admins can update documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update documents" ON public.documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invite_codes Admins can update invite codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update invite codes" ON public.invite_codes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petition_content Admins can update petition content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update petition content" ON public.petition_content FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stakeholders Admins can update stakeholders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update stakeholders" ON public.stakeholders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: access_keys Admins can view all access keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all access keys" ON public.access_keys FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: access_logs Admins can view all access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all access logs" ON public.access_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: investors Admins can view all investors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all investors" ON public.investors FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invite_code_uses Admins can view all invite code uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all invite code uses" ON public.invite_code_uses FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: memos Admins can view all memos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all memos" ON public.memos FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petition_content Admins can view all petition content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all petition content" ON public.petition_content FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rounds Admins can view all rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all rounds" ON public.rounds FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stakeholders Admins can view all stakeholders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all stakeholders" ON public.stakeholders FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petition_content_versions Admins can view all versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all versions" ON public.petition_content_versions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: signatures Allow signature insertion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow signature insertion" ON public.signatures FOR INSERT WITH CHECK (true);


--
-- Name: invite_code_uses Allow system to insert invite code uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow system to insert invite code uses" ON public.invite_code_uses FOR INSERT WITH CHECK (true);


--
-- Name: documents Authenticated users can view documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view documents" ON public.documents FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Authenticated users can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: access_keys Founders can manage access keys for their investors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founders can manage access keys for their investors" ON public.access_keys USING (((workspace_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.rounds r
  WHERE ((r.id = access_keys.round_id) AND (r.created_by = auth.uid())))))) WITH CHECK (((workspace_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.rounds r
  WHERE ((r.id = access_keys.round_id) AND (r.created_by = auth.uid()))))));


--
-- Name: dockets Public can view dockets via share link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view dockets via share link" ON public.dockets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.share_links sl
  WHERE ((sl.docket_id = dockets.id) AND ((sl.expires_at IS NULL) OR (sl.expires_at > now()))))));


--
-- Name: memos Public can view memos via share link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view memos via share link" ON public.memos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.share_links sl
  WHERE ((sl.memo_id = memos.id) AND ((sl.expires_at IS NULL) OR (sl.expires_at > now()))))));


--
-- Name: petition_content Stakeholders can view published content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Stakeholders can view published content" ON public.petition_content FOR SELECT USING ((is_published = true));


--
-- Name: rounds Users can create rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create rounds" ON public.rounds FOR INSERT WITH CHECK ((created_by = auth.uid()));


--
-- Name: action_messages Users can delete their own action messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own action messages" ON public.action_messages FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: rounds Users can delete their own rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own rounds" ON public.rounds FOR DELETE USING ((created_by = auth.uid()));


--
-- Name: action_messages Users can insert their own action messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own action messages" ON public.action_messages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: activity_logs Users can insert their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own activity logs" ON public.activity_logs FOR INSERT WITH CHECK ((workspace_id = auth.uid()));


--
-- Name: circuit_chat_messages Users can insert their own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own chat messages" ON public.circuit_chat_messages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: dockets Users can manage dockets for their rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage dockets for their rounds" ON public.dockets USING ((EXISTS ( SELECT 1
   FROM public.rounds
  WHERE ((rounds.id = dockets.round_id) AND (rounds.created_by = auth.uid())))));


--
-- Name: memo_versions Users can manage memo versions for their memos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage memo versions for their memos" ON public.memo_versions USING ((EXISTS ( SELECT 1
   FROM (public.memos m
     JOIN public.rounds r ON ((r.id = m.round_id)))
  WHERE ((m.id = memo_versions.memo_id) AND (r.created_by = auth.uid())))));


--
-- Name: memos Users can manage memos for their rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage memos for their rounds" ON public.memos USING ((EXISTS ( SELECT 1
   FROM public.rounds
  WHERE ((rounds.id = memos.round_id) AND (rounds.created_by = auth.uid())))));


--
-- Name: round_terms Users can manage round_terms for their rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage round_terms for their rounds" ON public.round_terms USING ((EXISTS ( SELECT 1
   FROM public.rounds
  WHERE ((rounds.id = round_terms.round_id) AND (rounds.created_by = auth.uid())))));


--
-- Name: investors Users can manage their investors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their investors" ON public.investors USING ((EXISTS ( SELECT 1
   FROM public.rounds
  WHERE ((rounds.workspace_id = investors.workspace_id) AND (rounds.created_by = auth.uid())))));


--
-- Name: share_links Users can manage their share links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their share links" ON public.share_links USING ((created_by = auth.uid()));


--
-- Name: circuit_chat_messages Users can update their own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own chat messages" ON public.circuit_chat_messages FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: rounds Users can update their own rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own rounds" ON public.rounds FOR UPDATE USING ((created_by = auth.uid()));


--
-- Name: signatures Users can view signatures for their dockets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view signatures for their dockets" ON public.signatures FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.dockets d
     JOIN public.rounds r ON ((r.id = d.round_id)))
  WHERE ((d.id = signatures.docket_id) AND (r.created_by = auth.uid())))));


--
-- Name: action_messages Users can view their own action messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own action messages" ON public.action_messages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activity_logs Users can view their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activity logs" ON public.activity_logs FOR SELECT USING ((workspace_id = auth.uid()));


--
-- Name: circuit_chat_messages Users can view their own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own chat messages" ON public.circuit_chat_messages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: invite_code_uses Users can view their own invite code uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own invite code uses" ON public.invite_code_uses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.invite_codes ic
  WHERE ((ic.id = invite_code_uses.invite_code_id) AND (ic.owner_id = auth.uid())))));


--
-- Name: invite_codes Users can view their own invite codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own invite codes" ON public.invite_codes FOR SELECT USING ((owner_id = auth.uid()));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: rounds Users can view their own rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own rounds" ON public.rounds FOR SELECT USING ((created_by = auth.uid()));


--
-- Name: access_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: access_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: action_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.action_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: circuit_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.circuit_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: dockets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dockets ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: investors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

--
-- Name: invite_code_uses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invite_code_uses ENABLE ROW LEVEL SECURITY;

--
-- Name: invite_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: memo_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.memo_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: memos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

--
-- Name: petition_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.petition_content ENABLE ROW LEVEL SECURITY;

--
-- Name: petition_content_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.petition_content_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: round_terms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.round_terms ENABLE ROW LEVEL SECURITY;

--
-- Name: rounds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

--
-- Name: share_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

--
-- Name: signatures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

--
-- Name: stakeholders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


