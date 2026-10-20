-- Pastas da Biblioteca (biblioteca-pastas). Duas organizações independentes por campanha, uma por
-- cargo: MESTRE (só o mestre vê e edita) e JOGADOR (compartilhada por jogadores e espectadores).
-- O documento NUNCA ganha coluna de pasta: o vínculo vive em documento_pasta_vinculo, no máximo um
-- por documento e por organização. Documento sem vínculo está na raiz daquela organização.
--
-- A profundidade máxima da árvore (5) e a coerência de campanha entre pasta, mãe e documento são
-- arbitradas pela DocumentoService; o banco garante nome, unicidade de vínculo e integridade.

-- UP

CREATE TABLE tipo_documento_organizacao (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_documento_organizacao PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_documento_organizacao_codigo_ativo
  ON tipo_documento_organizacao (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_documento_organizacao_updated_date
  BEFORE UPDATE ON tipo_documento_organizacao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_documento_organizacao (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'MESTRE', 'Mestre', NOW(), NOW(), false
UNION ALL
SELECT 'JOGADOR', 'Jogadores e espectadores', NOW(), NOW(), false;

CREATE TABLE documento_pasta (
  id                                SERIAL       NOT NULL,
  created_date                      TIMESTAMPTZ  NOT NULL,
  updated_date                      TIMESTAMPTZ  NOT NULL,
  is_deleted                        BOOLEAN      NOT NULL,
  deleted_date                      TIMESTAMPTZ,

  campanha_id                       INTEGER      NOT NULL,
  tipo_documento_organizacao_id     INTEGER      NOT NULL,
  documento_pasta_mae_id            INTEGER,
  nome                              VARCHAR(60)  NOT NULL,
  ordem                             INTEGER      NOT NULL,

  CONSTRAINT pk_documento_pasta PRIMARY KEY (id),
  CONSTRAINT fk_documento_pasta_campanha
    FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT fk_documento_pasta_tipo_documento_organizacao
    FOREIGN KEY (tipo_documento_organizacao_id) REFERENCES tipo_documento_organizacao (id),
  CONSTRAINT fk_documento_pasta_mae
    FOREIGN KEY (documento_pasta_mae_id) REFERENCES documento_pasta (id),
  CONSTRAINT chk_documento_pasta_nome
    CHECK (char_length(btrim(nome)) BETWEEN 1 AND 60),
  CONSTRAINT chk_documento_pasta_mae_diferente
    CHECK (documento_pasta_mae_id IS NULL OR documento_pasta_mae_id <> id)
);

CREATE TRIGGER trg_documento_pasta_updated_date
  BEFORE UPDATE ON documento_pasta
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE INDEX ix_documento_pasta_campanha_organizacao
  ON documento_pasta (campanha_id, tipo_documento_organizacao_id);

CREATE INDEX ix_documento_pasta_mae
  ON documento_pasta (documento_pasta_mae_id);

CREATE TABLE documento_pasta_vinculo (
  id                                SERIAL       NOT NULL,
  created_date                      TIMESTAMPTZ  NOT NULL,
  updated_date                      TIMESTAMPTZ  NOT NULL,
  is_deleted                        BOOLEAN      NOT NULL,
  deleted_date                      TIMESTAMPTZ,

  documento_id                      INTEGER      NOT NULL,
  documento_pasta_id                INTEGER      NOT NULL,
  tipo_documento_organizacao_id     INTEGER      NOT NULL,
  ordem                             INTEGER      NOT NULL,

  CONSTRAINT pk_documento_pasta_vinculo PRIMARY KEY (id),
  CONSTRAINT fk_documento_pasta_vinculo_documento
    FOREIGN KEY (documento_id) REFERENCES documento (id),
  CONSTRAINT fk_documento_pasta_vinculo_pasta
    FOREIGN KEY (documento_pasta_id) REFERENCES documento_pasta (id),
  CONSTRAINT fk_documento_pasta_vinculo_tipo_documento_organizacao
    FOREIGN KEY (tipo_documento_organizacao_id) REFERENCES tipo_documento_organizacao (id)
);

-- No máximo um vínculo ativo por documento e por organização.
CREATE UNIQUE INDEX uix_documento_pasta_vinculo_documento_organizacao_ativo
  ON documento_pasta_vinculo (documento_id, tipo_documento_organizacao_id)
  WHERE is_deleted = false;

CREATE INDEX ix_documento_pasta_vinculo_pasta
  ON documento_pasta_vinculo (documento_pasta_id);

CREATE TRIGGER trg_documento_pasta_vinculo_updated_date
  BEFORE UPDATE ON documento_pasta_vinculo
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_documento_pasta_vinculo_updated_date ON documento_pasta_vinculo;
DROP TABLE IF EXISTS documento_pasta_vinculo CASCADE;
DROP TRIGGER IF EXISTS trg_documento_pasta_updated_date ON documento_pasta;
DROP TABLE IF EXISTS documento_pasta CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_documento_organizacao_updated_date ON tipo_documento_organizacao;
DROP TABLE IF EXISTS tipo_documento_organizacao CASCADE;
