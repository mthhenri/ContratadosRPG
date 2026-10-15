-- Task 03: vínculo restrito do aplicativo, sem WAV ou credenciais de nuvem.
-- UP
CREATE TABLE transcricao_vinculo (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  identificador UUID NOT NULL,
  segredo_hash CHAR(64) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  codigo CHAR(8) NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  confirmado BOOLEAN NOT NULL,
  CONSTRAINT pk_transcricao_vinculo PRIMARY KEY (id),
  CONSTRAINT uix_transcricao_vinculo_identificador UNIQUE (identificador),
  CONSTRAINT uix_transcricao_vinculo_hash UNIQUE (segredo_hash),
  CONSTRAINT chk_transcricao_vinculo_hash CHECK (segredo_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT chk_transcricao_vinculo_nome CHECK (char_length(btrim(nome)) BETWEEN 1 AND 120)
);
CREATE TABLE transcricao_dispositivo (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  identificador UUID NOT NULL,
  vinculo_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  token_versao INTEGER NOT NULL,
  segredo_hash CHAR(64) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  ultimo_uso TIMESTAMPTZ NOT NULL,
  CONSTRAINT pk_transcricao_dispositivo PRIMARY KEY (id),
  CONSTRAINT fk_transcricao_dispositivo_vinculo FOREIGN KEY (vinculo_id) REFERENCES transcricao_vinculo (id),
  CONSTRAINT fk_transcricao_dispositivo_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id),
  CONSTRAINT uix_transcricao_dispositivo_identificador UNIQUE (identificador),
  CONSTRAINT uix_transcricao_dispositivo_vinculo UNIQUE (vinculo_id),
  CONSTRAINT uix_transcricao_dispositivo_hash UNIQUE (segredo_hash)
);
CREATE TABLE transcricao_intencao (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  identificador UUID NOT NULL,
  usuario_id INTEGER NOT NULL,
  sessao_transcricao_id INTEGER NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  consumida_em TIMESTAMPTZ,
  CONSTRAINT pk_transcricao_intencao PRIMARY KEY (id),
  CONSTRAINT fk_transcricao_intencao_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id),
  CONSTRAINT fk_transcricao_intencao_sessao FOREIGN KEY (sessao_transcricao_id) REFERENCES sessao_transcricao (id),
  CONSTRAINT uix_transcricao_intencao_identificador UNIQUE (identificador)
);
CREATE TRIGGER trg_transcricao_vinculo_updated_date BEFORE UPDATE ON transcricao_vinculo
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
CREATE TRIGGER trg_transcricao_dispositivo_updated_date BEFORE UPDATE ON transcricao_dispositivo
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
CREATE TRIGGER trg_transcricao_intencao_updated_date BEFORE UPDATE ON transcricao_intencao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
CREATE INDEX ix_transcricao_dispositivo_usuario ON transcricao_dispositivo (usuario_id) WHERE is_deleted = false;
CREATE INDEX ix_transcricao_vinculo_expira ON transcricao_vinculo (expira_em) WHERE is_deleted = false;
-- DOWN
DROP TABLE transcricao_intencao;
DROP TABLE transcricao_dispositivo;
DROP TABLE transcricao_vinculo;
