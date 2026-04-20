-- ─────────────────────────────────────────────────────────────────────────────
-- Studio v8: Adiciona ugc_bundle e scene ao check constraint de tipos
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.studio_assets DROP CONSTRAINT IF EXISTS studio_assets_type_check;
ALTER TABLE public.studio_assets ADD CONSTRAINT studio_assets_type_check
  CHECK (type IN (
    'image','video','voice','upscale','script','caption',
    'model','animate','compose','render','face','join',
    'lipsync','angles','music','ugc_bundle','scene'
  ));
