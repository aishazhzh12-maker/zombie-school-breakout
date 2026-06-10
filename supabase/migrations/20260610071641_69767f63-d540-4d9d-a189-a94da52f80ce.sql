DROP POLICY IF EXISTS "Anyone can insert score" ON public.leaderboard;
CREATE POLICY "Anyone can insert valid score" ON public.leaderboard
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(player_name)) BETWEEN 1 AND 32
  AND coins BETWEEN 0 AND 100000
  AND levels_completed BETWEEN 0 AND 1000
  AND time_seconds BETWEEN 0 AND 86400
);