-- Brand rename (circuit → thesis): rename the legacy chat table and its
-- constraints/indexes to match. RLS policy names are generic and travel with
-- the table, so they need no change. Guarded so it is safe to re-run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'circuit_chat_messages'
  ) THEN
    ALTER TABLE public.circuit_chat_messages RENAME TO thesis_chat_messages;

    ALTER TABLE public.thesis_chat_messages
      RENAME CONSTRAINT circuit_chat_messages_pkey TO thesis_chat_messages_pkey;
    ALTER TABLE public.thesis_chat_messages
      RENAME CONSTRAINT circuit_chat_messages_role_check TO thesis_chat_messages_role_check;
    ALTER TABLE public.thesis_chat_messages
      RENAME CONSTRAINT circuit_chat_messages_round_id_fkey TO thesis_chat_messages_round_id_fkey;

    ALTER INDEX public.idx_circuit_chat_messages_round_id
      RENAME TO idx_thesis_chat_messages_round_id;
    ALTER INDEX public.idx_circuit_chat_messages_user_created
      RENAME TO idx_thesis_chat_messages_user_created;
  END IF;
END $$;
