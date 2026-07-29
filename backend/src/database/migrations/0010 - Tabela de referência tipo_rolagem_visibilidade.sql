-- Migration M3 (m3-27) — tabela de referência da visibilidade de uma rolagem registrada.
-- Enum de coluna materializado como tabela tipo_* (BaseEntity + codigo + descricao), com seed
-- dos códigos PUBLICA/PRIVADA por literais SQL (exceção sancionada só em migrations — SYSTEM.SPEC
-- §10.7). Espelha RolagemVisibilidadeEnum (shared). `visibilidade` é coluna relacional da tabela
-- `rolagem` (não conteúdo do JSONB) — a exceção do §10.3 (enums de conteúdo de jogo sem tabela
-- tipo_*) não se aplica aqui; segue a regra geral §10.2.12. Criada antes de rolagem, que a
-- referencia por FK.

-- UP

CREATE TABLE tipo_rolagem_visibilidade (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_rolagem_visibilidade PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_rolagem_visibilidade_codigo_ativo
  ON tipo_rolagem_visibilidade (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_rolagem_visibilidade_updated_date
  BEFORE UPDATE ON tipo_rolagem_visibilidade
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_rolagem_visibilidade (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PUBLICA', 'Pública', NOW(), NOW(), false
UNION ALL
SELECT 'PRIVADA', 'Privada', NOW(), NOW(), false;

-- DOWN

DROP TRIGGER IF EXISTS trg_tipo_rolagem_visibilidade_updated_date ON tipo_rolagem_visibilidade;
DROP TABLE IF EXISTS tipo_rolagem_visibilidade CASCADE;
