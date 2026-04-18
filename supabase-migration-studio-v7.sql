-- ─────────────────────────────────────────────────────────────────────────────
-- Studio v7: Estabilização e tabelas de configuração
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Atualizar constraint de tipos de asset
ALTER TABLE public.studio_assets DROP CONSTRAINT IF EXISTS studio_assets_type_check;
ALTER TABLE public.studio_assets ADD CONSTRAINT studio_assets_type_check
  CHECK (type IN ('image','video','voice','upscale','script','caption','model','animate','compose','render','face','join','lipsync','angles','music'));

-- 2. Tabela de Configurações (Hero/Dashboard stats)
CREATE TABLE IF NOT EXISTS public.settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir defaults
INSERT INTO public.settings (key, value) VALUES 
('stat_photos', '48000'),
('stat_models', '4'),
('stat_satisfaction', '98'),
('stat_avg_time', '30')
ON CONFLICT (key) DO NOTHING;

-- 3. Tabela de Prompts do Studio (para controle remoto de prompts de IA)
CREATE TABLE IF NOT EXISTS public.studio_prompts (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Função para débito em lote (bulk)
CREATE OR REPLACE FUNCTION public.debit_credits_bulk(user_id_param UUID, amount_param INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE public.users
  SET credits = credits - amount_param
  WHERE id = user_id_param
    AND credits >= amount_param;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

-- RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_public_read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "prompts_public_read" ON public.studio_prompts FOR SELECT USING (true);
