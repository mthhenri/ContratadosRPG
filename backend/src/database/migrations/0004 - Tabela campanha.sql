-- Migration M2 — tabela de campanhas.
-- BaseEntity + nome + descricao (opcional) + codigo_convite (único entre ativas, regenerável
-- pelo mestre — invalida o anterior). Sem DEFAULT. Ver SCHEMA.md (campanha) e SYSTEM.SPEC §14.

-- UP

CREATE TABLE campanha (
  id              SERIAL      NOT NULL,
  created_date    TIMESTAMPTZ NOT NULL,
  updated_date    TIMESTAMPTZ NOT NULL,
  is_deleted      BOOLEAN     NOT NULL,
  deleted_date    TIMESTAMPTZ,

  nome            VARCHAR     NOT NULL,
  descricao       TEXT,
  codigo_convite  VARCHAR     NOT NULL,

  CONSTRAINT pk_campanha PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_campanha_codigo_convite_ativo
  ON campanha (codigo_convite)
  WHERE is_deleted = false;

CREATE TRIGGER trg_campanha_updated_date
  BEFORE UPDATE ON campanha
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_campanha_updated_date ON campanha;
DROP TABLE IF EXISTS campanha CASCADE;
