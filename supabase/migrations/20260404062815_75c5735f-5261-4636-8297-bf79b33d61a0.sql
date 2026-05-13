
-- Delete predictions pointing to stale duplicate matches
DELETE FROM predictions WHERE match_id IN (
  SELECT id FROM matches WHERE external_id IN ('400021507L', '400021509L')
);

-- Delete the duplicate matches with legacy 'L' suffix external_ids
DELETE FROM matches WHERE external_id IN ('400021507L', '400021509L');
