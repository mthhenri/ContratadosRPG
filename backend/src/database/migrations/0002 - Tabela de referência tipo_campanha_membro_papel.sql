-- Migration M2 — tabela de referência dos papéis de membro de campanha.
-- Enum de coluna materializado como tabela tipo_* (BaseEntity + codigo + descricao), com seed
-- dos códigos MESTRE/JOGADOR por literais SQL (exceção sancionada só em migrations — SYSTEM.SPEC
-- §10.7). Espelha TipoCampanhaMembroPapelEnum (shared) e a matriz de papéis da §14 / SCHEMA.md.
-- Criada antes de campanha_membro, que a referencia por FK.

-- UP

CREATE TABLE tipo_campanha_membro_papel (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_campanha_membro_papel PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_campanha_membro_papel_codigo_ativo
  ON tipo_campanha_membro_papel (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_campanha_membro_papel_updated_date
  BEFORE UPDATE ON tipo_campanha_membro_papel
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_campanha_membro_papel (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'MESTRE', 'Mestre', NOW(), NOW(), false
UNION ALL
SELECT 'JOGADOR', 'Jogador', NOW(), NOW(), false;

-- DOWN

DROP TRIGGER IF EXISTS trg_tipo_campanha_membro_papel_updated_date ON tipo_campanha_membro_papel;
DROP TABLE IF EXISTS tipo_campanha_membro_papel CASCADE;
