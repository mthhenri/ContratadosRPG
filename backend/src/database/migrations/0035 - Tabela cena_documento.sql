-- Migration m7-25 — vínculo entre uma cena de Investigação e os documentos da biblioteca (M9) que
-- ela apresenta. Tabela filha simples, molde de `usuario_ficha_acesso` (0008): sem estado de
-- visibilidade próprio — quem sabe se um documento está revelado é a tabela `documento` (0034); a
-- `CenaDocumentoService` chama a `DocumentoService` para revelar/ocultar, nunca grava isso aqui.
--
-- `em_foco` é o documento aberto no palco do mestre — no máximo um por cena (índice parcial), como
-- a "cena ativa única" da 0031/0032.

-- UP

CREATE TABLE cena_documento (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  cena_id       INTEGER     NOT NULL,
  documento_id  INTEGER     NOT NULL,
  ordem         INTEGER     NOT NULL,
  em_foco       BOOLEAN     NOT NULL,

  CONSTRAINT pk_cena_documento PRIMARY KEY (id),
  CONSTRAINT fk_cena_documento_cena
    FOREIGN KEY (cena_id) REFERENCES cena (id),
  CONSTRAINT fk_cena_documento_documento
    FOREIGN KEY (documento_id) REFERENCES documento (id)
);

CREATE UNIQUE INDEX uix_cena_documento_cena_documento_ativo
  ON cena_documento (cena_id, documento_id)
  WHERE is_deleted = false;

CREATE UNIQUE INDEX uix_cena_documento_cena_em_foco
  ON cena_documento (cena_id)
  WHERE is_deleted = false AND em_foco = true;

CREATE INDEX ix_cena_documento_cena_ordem
  ON cena_documento (cena_id, ordem);

CREATE TRIGGER trg_cena_documento_updated_date
  BEFORE UPDATE ON cena_documento
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_cena_documento_updated_date ON cena_documento;
DROP INDEX IF EXISTS ix_cena_documento_cena_ordem;
DROP INDEX IF EXISTS uix_cena_documento_cena_em_foco;
DROP INDEX IF EXISTS uix_cena_documento_cena_documento_ativo;
DROP TABLE IF EXISTS cena_documento CASCADE;
