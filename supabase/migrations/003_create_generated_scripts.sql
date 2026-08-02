-- 003_create_generated_scripts.sql
-- Tabela para salvar historico de geracoes de roteiro

CREATE TABLE IF NOT EXISTS public.generated_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  tema TEXT NOT NULL,
  duracao TEXT,
  objetivos JSONB,
  quantity INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'error')),
  error_message TEXT,
  cards_data JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.generated_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios acessam seus proprios roteiros gerados"
  ON public.generated_scripts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_generated_scripts_user_id ON public.generated_scripts(user_id);
CREATE INDEX idx_generated_scripts_created_at ON public.generated_scripts(created_at DESC);
CREATE INDEX idx_generated_scripts_status ON public.generated_scripts(status);
