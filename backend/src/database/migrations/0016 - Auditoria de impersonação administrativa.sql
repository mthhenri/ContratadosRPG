-- Migration M6 — trilha persistente das trocas administrativas de identidade.
-- O registro contém somente as duas identidades e a data da operação; credenciais e tokens
-- nunca são persistidos. As duas FKs preservam a rastreabilidade mesmo após soft delete.

-- UP

CREATE TABLE usuario_impersonacao (
  id                 SERIAL      NOT NULL,
  created_date       TIMESTAMPTZ NOT NULL,
  updated_date       TIMESTAMPTZ NOT NULL,
  is_deleted         BOOLEAN     NOT NULL,
  deleted_date       TIMESTAMPTZ,

  admin_origem_id    INTEGER     NOT NULL,
  usuario_alvo_id    INTEGER     NOT NULL,
  impersonacao_data  TIMESTAMPTZ NOT NULL,

  CONSTRAINT pk_usuario_impersonacao PRIMARY KEY (id),
  CONSTRAINT fk_usuario_impersonacao_admin_origem
    FOREIGN KEY (admin_origem_id) REFERENCES usuario (id),
  CONSTRAINT fk_usuario_impersonacao_usuario_alvo
    FOREIGN KEY (usuario_alvo_id) REFERENCES usuario (id)
);

CREATE INDEX ix_usuario_impersonacao_admin_origem
  ON usuario_impersonacao (admin_origem_id);

CREATE INDEX ix_usuario_impersonacao_usuario_alvo
  ON usuario_impersonacao (usuario_alvo_id);

CREATE TRIGGER trg_usuario_impersonacao_updated_date
  BEFORE UPDATE ON usuario_impersonacao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_usuario_impersonacao_updated_date ON usuario_impersonacao;
DROP TABLE IF EXISTS usuario_impersonacao;
