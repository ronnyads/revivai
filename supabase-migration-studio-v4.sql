-- Studio v4: last_frame_url para encadeamento video→video
ALTER TABLE studio_assets ADD COLUMN IF NOT EXISTS last_frame_url TEXT;

-- Atualiza o CHECK constraint para incluir 'render'
ALTER TABLE studio_assets DROP CONSTRAINT IF EXISTS studio_assets_type_check;
ALTER TABLE studio_assets ADD CONSTRAINT studio_assets_type_check
  CHECK (type IN ('image', 'video', 'voice', 'upscale', 'script', 'caption', 'model', 'render'));
