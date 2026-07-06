-- Migration M2 — vínculo usuário ↔ campanha com papel.
-- BaseEntity + FKs (campanha, usuario, tipo_campanha_membro_papel). O par (campanha, usuario) é
-- único entre ativos (um usuário não entra duas vezes na mesma campanha); índice auxiliar por
-- usuario para as listagens de "minhas campanhas". Criada por último (depende das três tabelas
-- referenciadas). Ver SCHEMA.md (campanha_membro) e SYSTEM.SPEC §14.

-- UP

CREATE TABLE campanha_membro (
  id                             SERIAL      NOT NULL,
  created_date                   TIMESTAMPTZ NOT NULL,
  updated_date                   TIMESTAMPTZ NOT NULL,
  is_deleted                     BOOLEAN     NOT NULL,
  deleted_date                   TIMESTAMPTZ,

  campanha_id                    INTEGER     NOT NULL,
  usuario_id                     INTEGER     NOT NULL,
  tipo_campanha_membro_papel_id  INTEGER     NOT NULL,

  CONSTRAINT pk_campanha_membro PRIMARY KEY (id),
  CONSTRAINT fk_campanha_membro_campanha
    FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT fk_campanha_membro_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (id),
  CONSTRAINT fk_campanha_membro_tipo_campanha_membro_papel
    FOREIGN KEY (tipo_campanha_membro_papel_id) REFERENCES tipo_campanha_membro_papel (id)
);

CREATE UNIQUE INDEX uix_campanha_membro_campanha_usuario_ativo
  ON campanha_membro (campanha_id, usuario_id)
  WHERE is_deleted = false;

CREATE INDEX ix_campanha_membro_usuario
  ON campanha_membro (usuario_id);

CREATE TRIGGER trg_campanha_membro_updated_date
  BEFORE UPDATE ON campanha_membro
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_campanha_membro_updated_date ON campanha_membro;
DROP TABLE IF EXISTS campanha_membro CASCADE;
