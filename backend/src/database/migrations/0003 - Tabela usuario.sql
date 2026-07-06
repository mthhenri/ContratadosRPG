-- Migration M2 — tabela de contas de usuário.
-- BaseEntity + login (único entre ativos) + senha_encriptada (bcrypt) + nome_completo.
-- Sem DEFAULT (a aplicação fornece todos os valores). Ver SCHEMA.md (usuario) e SYSTEM.SPEC §14.

-- UP

CREATE TABLE usuario (
  id                SERIAL      NOT NULL,
  created_date      TIMESTAMPTZ NOT NULL,
  updated_date      TIMESTAMPTZ NOT NULL,
  is_deleted        BOOLEAN     NOT NULL,
  deleted_date      TIMESTAMPTZ,

  login             VARCHAR     NOT NULL,
  senha_encriptada  VARCHAR     NOT NULL,
  nome_completo     VARCHAR     NOT NULL,

  CONSTRAINT pk_usuario PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_usuario_login_ativo
  ON usuario (login)
  WHERE is_deleted = false;

CREATE TRIGGER trg_usuario_updated_date
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_usuario_updated_date ON usuario;
DROP TABLE IF EXISTS usuario CASCADE;
