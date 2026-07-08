-- Migration M3 — concessão de visualização de uma ficha a outro membro da campanha.
-- BaseEntity + FKs (ficha, usuario). Dono e mestre não precisam de linha (permissão implícita
-- por posse/papel — §14); esta tabela existe só para revelar a ficha a um outro membro. O par
-- (ficha, usuario) é único entre ativos (uma concessão por membro). Criada por último (depende
-- de ficha e usuario). Ver SCHEMA.md (usuario_ficha_acesso) e SYSTEM.SPEC §14.

-- UP

CREATE TABLE usuario_ficha_acesso (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  ficha_id      INTEGER     NOT NULL,
  usuario_id    INTEGER     NOT NULL,

  CONSTRAINT pk_usuario_ficha_acesso PRIMARY KEY (id),
  CONSTRAINT fk_usuario_ficha_acesso_ficha
    FOREIGN KEY (ficha_id) REFERENCES ficha (id),
  CONSTRAINT fk_usuario_ficha_acesso_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (id)
);

CREATE UNIQUE INDEX uix_usuario_ficha_acesso_ficha_usuario_ativo
  ON usuario_ficha_acesso (ficha_id, usuario_id)
  WHERE is_deleted = false;

CREATE TRIGGER trg_usuario_ficha_acesso_updated_date
  BEFORE UPDATE ON usuario_ficha_acesso
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_usuario_ficha_acesso_updated_date ON usuario_ficha_acesso;
DROP TABLE IF EXISTS usuario_ficha_acesso CASCADE;
