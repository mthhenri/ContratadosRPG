-- Migration M7 (m7-03) — tabela de referência da situação de um Encontro de Combate no seu ciclo
-- de vida. Enum de coluna materializado como tabela tipo_* (BaseEntity + codigo + descricao), com
-- seed dos códigos MONTAGEM/ATIVO/ENCERRADO por literais SQL (exceção sancionada só em migrations
-- — SYSTEM.SPEC §10.7). Espelha EncontroStatusEnum (shared). Criada antes de `encontro`, que a
-- referencia por FK.

-- UP

CREATE TABLE tipo_encontro_status (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_encontro_status PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_encontro_status_codigo_ativo
  ON tipo_encontro_status (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_encontro_status_updated_date
  BEFORE UPDATE ON tipo_encontro_status
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_encontro_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'MONTAGEM', 'Montagem', NOW(), NOW(), false
UNION ALL
SELECT 'ATIVO', 'Ativo', NOW(), NOW(), false
UNION ALL
SELECT 'ENCERRADO', 'Encerrado', NOW(), NOW(), false;

-- DOWN

DROP TRIGGER IF EXISTS trg_tipo_encontro_status_updated_date ON tipo_encontro_status;
DROP TABLE IF EXISTS tipo_encontro_status CASCADE;
