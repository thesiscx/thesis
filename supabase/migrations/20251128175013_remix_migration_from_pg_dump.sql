CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

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


SET default_table_access_method = heap;

--
-- Name: access_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    stakeholder_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    created_by uuid,
    CONSTRAINT access_keys_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


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
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: petition_content update_petition_content_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_petition_content_updated_at BEFORE UPDATE ON public.petition_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: petition_content Admins can view all petition content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all petition content" ON public.petition_content FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stakeholders Admins can view all stakeholders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all stakeholders" ON public.stakeholders FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petition_content_versions Admins can view all versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all versions" ON public.petition_content_versions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: access_logs Allow system to insert access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow system to insert access logs" ON public.access_logs FOR INSERT WITH CHECK (true);


--
-- Name: documents Authenticated users can view documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view documents" ON public.documents FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: petition_content Stakeholders can view published content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Stakeholders can view published content" ON public.petition_content FOR SELECT USING ((is_published = true));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: access_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: access_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

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


