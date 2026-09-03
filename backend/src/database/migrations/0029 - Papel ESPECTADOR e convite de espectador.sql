-- Migration M8 (m8-01) — terceiro papel de campanha (ESPECTADOR) e seu convite independente.
-- Seed do código novo em tipo_campanha_membro_papel (literal SQL — exceção sancionada só em
-- migrations, SYSTEM.SPEC §10.7), sem alterar os vínculos ativos atuais. `campanha` ganha
-- `codigo_convite_espectador`: nasce nullable, recebe backfill único por linha existente e só
-- então vira NOT NULL com índice único parcial equivalente ao convite de jogador (mesmo padrão de
-- `0015`/`0020` — coluna nova nunca nasce NOT NULL com DEFAULT). O backfill usa MD5 de um valor
-- randômico por linha (sem extensão pgcrypto) só para preencher campanhas existentes; convites
-- novos continuam gerados pela service (`gerarCodigoConvite`, alfabeto sem caracteres ambíguos).

-- UP

INSERT INTO tipo_campanha_membro_papel (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ESPECTADOR', 'Espectador', NOW(), NOW(), false;

ALTER TABLE campanha ADD COLUMN codigo_convite_espectador VARCHAR;

UPDATE campanha
SET codigo_convite_espectador = UPPER(SUBSTRING(MD5(RANDOM()::text || CLOCK_TIMESTAMP()::text || campanha.id::text) FROM 1 FOR 8))
WHERE codigo_convite_espectador IS NULL;

ALTER TABLE campanha
  ALTER COLUMN codigo_convite_espectador SET NOT NULL;

CREATE UNIQUE INDEX uix_campanha_codigo_convite_espectador_ativo
  ON campanha (codigo_convite_espectador)
  WHERE is_deleted = false;

-- DOWN

DROP INDEX IF EXISTS uix_campanha_codigo_convite_espectador_ativo;
ALTER TABLE campanha DROP COLUMN IF EXISTS codigo_convite_espectador;
DELETE FROM tipo_campanha_membro_papel WHERE codigo = 'ESPECTADOR';
