-- Adiciona coluna para salvar modelo UGC no perfil do usuário
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_model_prompt TEXT;
