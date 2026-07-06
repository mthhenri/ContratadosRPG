-- Migration M2 — tabela de contas de usuário.
-- BaseEntity + login (único entre ativos) + senha (hash bcrypt) + nome.
-- Sem DEFAULT (a aplicação fornece todos os valores). Ver SCHEMA.md (usuario) e SYSTEM.SPEC §14.
-- Inclui o seed da conta inicial do autor (login 'senhor.contratados'); a senha já entra como
-- hash bcrypt literal (exceção de migration §10.7 — o runtime nunca guarda senha em claro).

-- UP

CREATE TABLE usuario (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  login         VARCHAR     NOT NULL,
  senha         VARCHAR     NOT NULL,   -- hash bcrypt (nunca senha em claro)
  nome          VARCHAR     NOT NULL,

  CONSTRAINT pk_usuario PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_usuario_login_ativo
  ON usuario (login)
  WHERE is_deleted = false;

CREATE TRIGGER trg_usuario_updated_date
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- Seed da conta inicial. A senha é o hash bcrypt (cost 10) do valor definido pelo autor —
-- literal, pois migration não recebe input (§10.7); o backend valida via bcrypt.compare (m2-02).
-- Recomendado trocar a senha após o primeiro acesso em produção.
INSERT INTO usuario (login, senha, nome, created_date, updated_date, is_deleted)
SELECT 'senhor.contratados',
       '$2b$10$YPM9dwsMdAquj7tKHzKlEOukrOLodBixcTW67pu4G4aOR7Yz64Q7O',
       'Matheus',
       NOW(), NOW(), false;

-- DOWN

DROP TRIGGER IF EXISTS trg_usuario_updated_date ON usuario;
DROP TABLE IF EXISTS usuario CASCADE;
