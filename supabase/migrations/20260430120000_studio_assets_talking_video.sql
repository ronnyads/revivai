ALTER TABLE public.studio_assets DROP CONSTRAINT IF EXISTS studio_assets_type_check;
ALTER TABLE public.studio_assets ADD CONSTRAINT studio_assets_type_check
  CHECK (type IN (
    'image','video','talking_video','voice','upscale','script','caption',
    'model','animate','compose','render','face','join',
    'lipsync','angles','music','ugc_bundle','scene','look_split'
  ));
