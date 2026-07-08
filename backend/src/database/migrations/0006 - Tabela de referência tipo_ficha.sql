-- Migration M3 — tabela de referência dos tipos de ficha.
-- Enum de coluna materializado como tabela tipo_* (BaseEntity + codigo + descricao), com seed
-- dos códigos JOGADOR/CRIATURA/NPC por literais SQL (exceção sancionada só em migrations —
-- SYSTEM.SPEC §10.7). Espelha TipoFichaEnum (shared) e o modelo de fichas da §14 / SCHEMA.md.
-- Criada antes de ficha, que a referencia por FK.

-- UP

CREATE TABLE tipo_ficha (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_ficha PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_ficha_codigo_ativo
  ON tipo_ficha (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_ficha_updated_date
  BEFORE UPDATE ON tipo_ficha
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_ficha (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'JOGADOR', 'Jogador', NOW(), NOW(), false
UNION ALL
SELECT 'CRIATURA', 'Criatura', NOW(), NOW(), false
UNION ALL
SELECT 'NPC', 'NPC', NOW(), NOW(), false;

-- DOWN

DROP TRIGGER IF EXISTS trg_tipo_ficha_updated_date ON tipo_ficha;
DROP TABLE IF EXISTS tipo_ficha CASCADE;
