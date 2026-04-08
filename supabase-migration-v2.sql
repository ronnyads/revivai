-- Enterprise Pipeline v2 — Migration
-- Run this in your Supabase SQL editor

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS colorization_suggested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS colorization_url text,
  ADD COLUMN IF NOT EXISTS damage_analysis jsonb;
