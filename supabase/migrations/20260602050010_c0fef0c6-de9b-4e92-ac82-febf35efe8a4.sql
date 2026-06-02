
CREATE TABLE public.leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL CHECK (char_length(player_name) BETWEEN 1 AND 24),
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0 AND coins <= 1000000),
  levels_completed INTEGER NOT NULL DEFAULT 0 CHECK (levels_completed >= 0 AND levels_completed <= 100),
  time_seconds INTEGER NOT NULL DEFAULT 0 CHECK (time_seconds >= 0 AND time_seconds <= 86400),
  won BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.leaderboard TO anon;
GRANT SELECT, INSERT ON public.leaderboard TO authenticated;
GRANT ALL ON public.leaderboard TO service_role;

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard"
  ON public.leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert score"
  ON public.leaderboard FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_leaderboard_coins ON public.leaderboard (coins DESC, time_seconds ASC);
