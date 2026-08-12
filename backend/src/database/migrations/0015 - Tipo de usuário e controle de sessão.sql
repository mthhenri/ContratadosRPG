-- Migration M6 — tipo global do usuário e versão que permite invalidar sessões emitidas.
-- A coluna de tipo nasce nullable, recebe backfill e só então vira NOT NULL; nenhuma coluna usa
-- DEFAULT. O registro público resolve codigo → id no repositório e sempre cria usuário NORMAL.

-- UP

CREATE TABLE tipo_usuario (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_usuario PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_usuario_codigo_ativo
  ON tipo_usuario (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_usuario_updated_date
  BEFORE UPDATE ON tipo_usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_usuario (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'NORMAL', 'Normal', NOW(), NOW(), false
UNION ALL
SELECT 'ADMIN', 'Administrador', NOW(), NOW(), false
UNION ALL
SELECT 'TESTER', 'Testador', NOW(), NOW(), false;

ALTER TABLE usuario ADD COLUMN tipo_usuario_id INTEGER;
ALTER TABLE usuario ADD COLUMN token_versao INTEGER;

ALTER TABLE usuario
  ADD CONSTRAINT fk_usuario_tipo_usuario
  FOREIGN KEY (tipo_usuario_id) REFERENCES tipo_usuario (id);

UPDATE usuario
SET tipo_usuario_id = (
      SELECT id
      FROM tipo_usuario
      WHERE codigo = 'ADMIN' AND is_deleted = false
    ),
    token_versao = 1
WHERE login = 'senhor.contratados';

UPDATE usuario
SET tipo_usuario_id = (
      SELECT id
      FROM tipo_usuario
      WHERE codigo = 'NORMAL' AND is_deleted = false
    ),
    token_versao = 1
WHERE tipo_usuario_id IS NULL;

ALTER TABLE usuario
  ALTER COLUMN tipo_usuario_id SET NOT NULL,
  ALTER COLUMN token_versao SET NOT NULL;

-- DOWN

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS fk_usuario_tipo_usuario;
ALTER TABLE usuario DROP COLUMN IF EXISTS token_versao;
ALTER TABLE usuario DROP COLUMN IF EXISTS tipo_usuario_id;
DROP TRIGGER IF EXISTS trg_tipo_usuario_updated_date ON tipo_usuario;
DROP TABLE IF EXISTS tipo_usuario;
