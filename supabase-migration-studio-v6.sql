-- Migration: Studio v6 — adicionar 'compose' ao CHECK constraint de studio_assets
-- Rodar no SQL Editor do Supabase

ALTER TABLE studio_assets DROP CONSTRAINT IF EXISTS studio_assets_type_check;
ALTER TABLE studio_assets ADD CONSTRAINT studio_assets_type_check
  CHECK (type IN ('image', 'video', 'voice', 'upscale', 'script', 'caption', 'model', 'render', 'animate', 'compose'));
