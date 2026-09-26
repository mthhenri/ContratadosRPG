-- Migration M9 (m9-01) — o documento de campanha ("Biblioteca"): texto em markdown ou imagem que o
-- mestre cria oculto e revela a campanha inteira. A busca textual copia o desenho da 0018
-- (vetor mantido por trigger, título peso A, corpo peso B, índice GIN) e só USA a configuração
-- public.contratados_portugues — ela é da 0018 e não é recriada nem removida aqui.
--
-- A coerência com o tipo (TEXTO ⇒ sem imagem_url; IMAGEM ⇒ sem conteudo_markdown) NÃO vira CHECK:
-- dependeria de consultar tipo_documento, e o PostgreSQL não permite subquery em CHECK. É arbitrada
-- pela DocumentoService (m9-02). O banco só garante que um documento nunca carrega os dois.

-- UP

CREATE TABLE tipo_documento (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_documento PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_documento_codigo_ativo
  ON tipo_documento (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_documento_updated_date
  BEFORE UPDATE ON tipo_documento
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_documento (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'TEXTO', 'Texto', NOW(), NOW(), false
UNION ALL
SELECT 'IMAGEM', 'Imagem', NOW(), NOW(), false;

CREATE TABLE documento (
  id                  SERIAL       NOT NULL,
  created_date        TIMESTAMPTZ  NOT NULL,
  updated_date        TIMESTAMPTZ  NOT NULL,
  is_deleted          BOOLEAN      NOT NULL,
  deleted_date        TIMESTAMPTZ,

  campanha_id         INTEGER      NOT NULL,
  tipo_documento_id   INTEGER      NOT NULL,
  titulo              VARCHAR(120) NOT NULL,
  conteudo_markdown   TEXT,
  imagem_url          VARCHAR,
  revelado            BOOLEAN      NOT NULL,
  ordem               INTEGER      NOT NULL,
  busca               TSVECTOR     NOT NULL,

  CONSTRAINT pk_documento PRIMARY KEY (id),
  CONSTRAINT fk_documento_campanha
    FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT fk_documento_tipo_documento
    FOREIGN KEY (tipo_documento_id) REFERENCES tipo_documento (id),
  CONSTRAINT chk_documento_titulo
    CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 120),
  CONSTRAINT chk_documento_conteudo
    CHECK (conteudo_markdown IS NULL OR char_length(conteudo_markdown) <= 100000),
  CONSTRAINT chk_documento_conteudo_ou_imagem
    CHECK (NOT (conteudo_markdown IS NOT NULL AND imagem_url IS NOT NULL))
);

-- Um documento de imagem tem só o título no vetor: o COALESCE do corpo vira vetor vazio.
CREATE FUNCTION fn_documento_busca()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.busca :=
    setweight(
      to_tsvector('public.contratados_portugues'::regconfig, COALESCE(NEW.titulo, '')),
      'A'
    ) ||
    setweight(
      to_tsvector('public.contratados_portugues'::regconfig, COALESCE(NEW.conteudo_markdown, '')),
      'B'
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_documento_busca
  BEFORE INSERT OR UPDATE OF titulo, conteudo_markdown ON documento
  FOR EACH ROW EXECUTE FUNCTION fn_documento_busca();

CREATE TRIGGER trg_documento_updated_date
  BEFORE UPDATE ON documento
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE INDEX ix_documento_campanha_ordem
  ON documento (campanha_id, ordem);

CREATE INDEX ix_documento_busca
  ON documento USING GIN (busca);

-- DOWN

DROP INDEX IF EXISTS ix_documento_busca;
DROP INDEX IF EXISTS ix_documento_campanha_ordem;
DROP TRIGGER IF EXISTS trg_documento_updated_date ON documento;
DROP TRIGGER IF EXISTS trg_documento_busca ON documento;
DROP FUNCTION IF EXISTS fn_documento_busca();
DROP TABLE IF EXISTS documento CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_documento_updated_date ON tipo_documento;
DROP TABLE IF EXISTS tipo_documento CASCADE;
