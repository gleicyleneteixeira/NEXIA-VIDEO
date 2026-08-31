CREATE TABLE IF NOT EXISTS public.media_gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sem titulo',
  media_url TEXT NOT NULL,
  original_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'video' CHECK (media_type IN ('video', 'audio')),
  is_favorite BOOLEAN DEFAULT false NOT NULL,
  transcription TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.media_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gerenciam suas proprias midias" ON public.media_gallery;

CREATE POLICY "media_select"
  ON public.media_gallery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "media_insert"
  ON public.media_gallery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "media_update"
  ON public.media_gallery FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "media_delete"
  ON public.media_gallery FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_media_gallery_user_id
  ON public.media_gallery(user_id);

CREATE INDEX IF NOT EXISTS idx_media_gallery_created_at
  ON public.media_gallery(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_gallery_is_favorite
  ON public.media_gallery(user_id, is_favorite);
