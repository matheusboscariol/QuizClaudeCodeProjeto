-- Claude Code Quiz — schema Supabase
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute uma vez.
-- Após executar, vá em Database → Replication e habilite Realtime para a tabela quiz_attempts.

-- =========================================================
-- Tabelas
-- =========================================================

CREATE TABLE participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 30),
  -- Segredo do cliente — validado pelo RPC save_attempt para impedir inserção de tentativas por terceiros.
  insert_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES participants(id),
  level           TEXT NOT NULL CHECK (level IN ('business', 'developer', 'advanced', 'complete')),
  score           INT NOT NULL,
  total           INT NOT NULL,
  percentage      NUMERIC(5,2) NOT NULL,
  time_seconds    INT NOT NULL,
  completed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- View: ranking global (melhor tentativa por participante)
-- =========================================================

CREATE VIEW ranking_global AS
SELECT
  ROW_NUMBER() OVER (ORDER BY best.percentage DESC, best.time_seconds ASC) AS position,
  p.id AS participant_id,
  p.name,
  best.level,
  best.score,
  best.total,
  best.percentage,
  best.time_seconds,
  best.completed_at
FROM participants p
JOIN LATERAL (
  SELECT *
  FROM quiz_attempts qa
  WHERE qa.participant_id = p.id
  ORDER BY qa.percentage DESC, qa.time_seconds ASC
  LIMIT 1
) best ON true;

-- =========================================================
-- Row Level Security
-- =========================================================

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_participants" ON participants FOR INSERT WITH CHECK (true);
-- Tentativas são inseridas exclusivamente via RPC save_attempt (SECURITY DEFINER),
-- que valida o insert_token. INSERT direto pela API é bloqueado.
CREATE POLICY "read_participants"   ON participants FOR SELECT USING (true);
CREATE POLICY "read_attempts"       ON quiz_attempts FOR SELECT USING (true);

-- =========================================================
-- RPC: inserção segura de tentativas
-- Valida que o insert_token pertence ao participant_id antes de gravar.
-- SECURITY DEFINER permite bypass de RLS após validação.
-- =========================================================

CREATE OR REPLACE FUNCTION save_attempt(
  p_participant_id UUID,
  p_insert_token   UUID,
  p_level          TEXT,
  p_score          INT,
  p_total          INT,
  p_percentage     NUMERIC,
  p_time_seconds   INT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM participants
    WHERE id = p_participant_id AND insert_token = p_insert_token
  ) THEN
    RAISE EXCEPTION 'Unauthorized: invalid token';
  END IF;

  INSERT INTO quiz_attempts (participant_id, level, score, total, percentage, time_seconds)
  VALUES (p_participant_id, p_level, p_score, p_total, p_percentage, p_time_seconds);
END;
$$;

GRANT EXECUTE ON FUNCTION save_attempt TO anon;
GRANT EXECUTE ON FUNCTION save_attempt TO authenticated;

-- Views não herdam RLS — o role anon precisa de SELECT explícito.
-- Sem isso, o ranking_global não aparece via PostgREST/API.
GRANT SELECT ON ranking_global TO anon;
GRANT SELECT ON ranking_global TO authenticated;

-- =========================================================
-- Migração (se as tabelas já existem sem insert_token):
--   ALTER TABLE participants ADD COLUMN insert_token UUID NOT NULL DEFAULT gen_random_uuid();
-- =========================================================
