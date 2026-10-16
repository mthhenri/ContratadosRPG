-- Task 02: glossario e identidades por campanha, confirmacao/silencio informativo da faixa e snapshot do glossario por execucao.
-- UP
CREATE TABLE termo_glossario_transcricao (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  campanha_id INTEGER NOT NULL,
  termo VARCHAR(80) NOT NULL,
  chave_termo TEXT NOT NULL,
  CONSTRAINT pk_termo_glossario_transcricao PRIMARY KEY (id),
  CONSTRAINT fk_termo_glossario_transcricao_campanha FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT chk_termo_glossario_transcricao_termo CHECK (char_length(btrim(termo)) BETWEEN 1 AND 80),
  CONSTRAINT chk_termo_glossario_transcricao_chave CHECK (char_length(btrim(chave_termo)) BETWEEN 1 AND 320)
);
CREATE INDEX ix_termo_glossario_transcricao_campanha ON termo_glossario_transcricao (campanha_id);
CREATE UNIQUE INDEX uix_termo_glossario_transcricao_chave_ativa
  ON termo_glossario_transcricao (campanha_id, chave_termo) WHERE is_deleted = false;
CREATE TRIGGER trg_termo_glossario_transcricao_updated_date BEFORE UPDATE ON termo_glossario_transcricao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE identidade_transcricao (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  campanha_id INTEGER NOT NULL,
  nome_origem VARCHAR(255) NOT NULL,
  chave_origem TEXT NOT NULL,
  participante VARCHAR(255) NOT NULL,
  CONSTRAINT pk_identidade_transcricao PRIMARY KEY (id),
  CONSTRAINT fk_identidade_transcricao_campanha FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT chk_identidade_transcricao_origem CHECK (char_length(btrim(nome_origem)) BETWEEN 1 AND 255),
  CONSTRAINT chk_identidade_transcricao_chave CHECK (char_length(btrim(chave_origem)) BETWEEN 1 AND 765),
  CONSTRAINT chk_identidade_transcricao_participante CHECK (char_length(btrim(participante)) BETWEEN 1 AND 255)
);
CREATE INDEX ix_identidade_transcricao_campanha ON identidade_transcricao (campanha_id);
CREATE UNIQUE INDEX uix_identidade_transcricao_chave_ativa
  ON identidade_transcricao (campanha_id, chave_origem) WHERE is_deleted = false;
CREATE TRIGGER trg_identidade_transcricao_updated_date BEFORE UPDATE ON identidade_transcricao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

ALTER TABLE faixa_transcricao ADD COLUMN identidade_confirmada BOOLEAN;
UPDATE faixa_transcricao SET identidade_confirmada = false;
ALTER TABLE faixa_transcricao ALTER COLUMN identidade_confirmada SET NOT NULL;
ALTER TABLE faixa_transcricao ADD COLUMN silencio_inicial_milissegundos BIGINT;
ALTER TABLE faixa_transcricao ADD CONSTRAINT chk_faixa_transcricao_silencio
  CHECK (silencio_inicial_milissegundos IS NULL OR silencio_inicial_milissegundos BETWEEN 0 AND 9007199254740991);

ALTER TABLE execucao_transcricao ADD COLUMN glossario_efetivo JSONB;
-- DOWN
ALTER TABLE execucao_transcricao DROP COLUMN glossario_efetivo;

ALTER TABLE faixa_transcricao DROP CONSTRAINT chk_faixa_transcricao_silencio;
ALTER TABLE faixa_transcricao DROP COLUMN silencio_inicial_milissegundos;
ALTER TABLE faixa_transcricao DROP COLUMN identidade_confirmada;

DROP TABLE identidade_transcricao;
DROP TABLE termo_glossario_transcricao;
