-- 004_create_rendered_videos.sql
-- Tabela para historico de videos gerados em massa

CREATE TABLE IF NOT EXISTS public.rendered_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'downloaded', 'posted')),
  is_posted BOOLEAN DEFAULT false,
  variation_data JSONB,
  duration REAL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.rendered_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam seus proprios videos renderizados"
  ON public.rendered_videos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_rendered_videos_user_id ON public.rendered_videos(user_id);
CREATE INDEX idx_rendered_videos_created_at ON public.rendered_videos(created_at DESC);
CREATE INDEX idx_rendered_videos_is_posted ON public.rendered_videos(is_posted);
