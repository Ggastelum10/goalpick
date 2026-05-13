CREATE UNIQUE INDEX IF NOT EXISTS predictions_user_match_league_unique
ON predictions (user_id, match_id, COALESCE(league_id, '00000000-0000-0000-0000-000000000000'));