-- 005_add_video_generated_to_scripts.sql
-- Adiciona campo para controlar se o vídeo do roteiro já foi criado
ALTER TABLE public.generated_scripts 
ADD COLUMN IF NOT EXISTS video_generated BOOLEAN DEFAULT FALSE NOT NULL;
