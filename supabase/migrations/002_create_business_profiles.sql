-- Tabela de perfis de negocio do usuario
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  nicho TEXT DEFAULT '',
  publico TEXT DEFAULT '',
  produto TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam seus proprios perfis de negocio"
  ON public.business_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id
  ON public.business_profiles(user_id);
