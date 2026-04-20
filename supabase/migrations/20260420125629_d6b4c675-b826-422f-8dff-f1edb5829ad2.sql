ALTER TABLE public.rounds ALTER COLUMN target_raise TYPE numeric(20,2);
ALTER TABLE public.round_terms ALTER COLUMN valuation_cap TYPE numeric(20,2);
ALTER TABLE public.round_terms ALTER COLUMN minimum_ticket TYPE numeric(20,2);
ALTER TABLE public.dockets ALTER COLUMN amount TYPE numeric(20,2);