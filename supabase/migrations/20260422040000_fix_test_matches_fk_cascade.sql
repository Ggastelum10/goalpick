-- Allow deleting / updating real matches by cascading to their test mirrors.
-- Previously the FK had no ON DELETE action (NO ACTION), which blocked
-- any delete on public.matches when a row in public.test_matches still
-- referenced it via source_match_id, producing:
--   update or delete on table "matches" violates foreign key constraint
--   "test_matches_source_match_id_fkey" on table "test_matches"

ALTER TABLE public.test_matches
  DROP CONSTRAINT IF EXISTS test_matches_source_match_id_fkey;

ALTER TABLE public.test_matches
  ADD CONSTRAINT test_matches_source_match_id_fkey
  FOREIGN KEY (source_match_id)
  REFERENCES public.matches(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
