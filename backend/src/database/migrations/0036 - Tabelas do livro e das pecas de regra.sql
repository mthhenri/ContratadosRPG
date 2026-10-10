-- Migration M11 (m11-02) — a Oficina das Regras: os livros de regras (Sistema, Guia do Mestre e
-- futuras expansões) passam a viver no banco.
--
--   livro                      quais livros existem (codigo vira a URL /regras/<codigo>)
--   tipo_regra_peca            tipos de peça (espelha TipoRegraPecaEnum)
--   regra_peca                 a CÓPIA DE TRABALHO: uma linha por peça, em árvore (peca_pai_id)
--   regra_peca_ancora_antiga   âncoras que a peça já teve, para links antigos continuarem valendo
--   tipo_livro_versao_situacao RASCUNHO | PUBLICADA (espelha TipoLivroVersaoSituacaoEnum)
--   livro_versao               FOTOGRAFIAS imutáveis do livro inteiro (rascunho ou versão)
--
-- Decisões de modelagem:
-- * `regra_peca.dados` e `livro_versao.conteudo` são JSONB cujo contrato é do shared/ (m11-01); o
--   banco não valida a forma, quem valida é o validarArvoreLivro.
-- * `ancora` é opcional (nem toda peça é linkável) e única por livro entre as peças ativas. Excluir
--   a peça (soft delete) libera a âncora.
-- * `regra_peca_ancora_antiga` guarda também `livro_id` (além da modelagem original), amarrado ao da
--   peça por FK composta, para o banco garantir que uma âncora antiga nunca se repete dentro do livro
--   nem aponta para peça de outro livro. Que ela não colida com a âncora
--   ATUAL de outra peça não cabe em índice: é arbitrado pela service (m11-04/07).
-- * O pai de uma peça é do MESMO livro (FK composta com `uix_regra_peca_livro_id`). Que o pai esteja
--   ativo e que a árvore não tenha ciclo são arbitrados no SQL do repositório (INSERT/UPDATE só
--   aplicam com pai ativo; mover recusa destino dentro da própria subárvore).
-- * `revisao` é a trava otimista da peça: a alteração só vale se enviar a revisão que está no banco
--   e a incrementa. Existe desde já, com um único editor, por ser pré-requisito da I-060.
-- * A fotografia é imutável: um trigger recusa qualquer UPDATE que mude livro, situação, número,
--   formato, conteúdo, data ou autor. Só o soft delete (is_deleted/deleted_date) passa.

-- UP

CREATE TABLE livro (
  id            SERIAL       NOT NULL,
  created_date  TIMESTAMPTZ  NOT NULL,
  updated_date  TIMESTAMPTZ  NOT NULL,
  is_deleted    BOOLEAN      NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(60)  NOT NULL,
  titulo        VARCHAR(200) NOT NULL,
  ordem         INTEGER      NOT NULL,

  CONSTRAINT pk_livro PRIMARY KEY (id),
  CONSTRAINT chk_livro_codigo CHECK (codigo ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX uix_livro_codigo_ativo
  ON livro (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_livro_updated_date
  BEFORE UPDATE ON livro
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE tipo_regra_peca (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_regra_peca PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_regra_peca_codigo_ativo
  ON tipo_regra_peca (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_regra_peca_updated_date
  BEFORE UPDATE ON tipo_regra_peca
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_regra_peca (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'SECAO', 'Seção', NOW(), NOW(), false
UNION ALL
SELECT 'PARAGRAFO', 'Parágrafo', NOW(), NOW(), false
UNION ALL
SELECT 'EXEMPLO', 'Exemplo', NOW(), NOW(), false
UNION ALL
SELECT 'FORMULA', 'Fórmula', NOW(), NOW(), false
UNION ALL
SELECT 'NOTA', 'Nota', NOW(), NOW(), false
UNION ALL
SELECT 'LISTA', 'Lista', NOW(), NOW(), false
UNION ALL
SELECT 'TABELA', 'Tabela', NOW(), NOW(), false
UNION ALL
SELECT 'HABILIDADE', 'Habilidade', NOW(), NOW(), false
UNION ALL
SELECT 'CLASSE', 'Classe', NOW(), NOW(), false
UNION ALL
SELECT 'ARQUETIPO', 'Arquétipo', NOW(), NOW(), false
UNION ALL
SELECT 'SUBCLASSE', 'Subclasse', NOW(), NOW(), false
UNION ALL
SELECT 'ORIGENS', 'Origens', NOW(), NOW(), false
UNION ALL
SELECT 'ORIGEM', 'Origem', NOW(), NOW(), false
UNION ALL
SELECT 'TERMOS', 'Termos', NOW(), NOW(), false
UNION ALL
SELECT 'TERMO', 'Termo', NOW(), NOW(), false
UNION ALL
SELECT 'EQUIPAMENTOS', 'Equipamentos', NOW(), NOW(), false
UNION ALL
SELECT 'EQUIPAMENTO', 'Equipamento', NOW(), NOW(), false
UNION ALL
SELECT 'MODIFICACOES', 'Modificações', NOW(), NOW(), false
UNION ALL
SELECT 'MODIFICACAO', 'Modificação', NOW(), NOW(), false
UNION ALL
SELECT 'AMPLIFICADORES', 'Amplificadores', NOW(), NOW(), false
UNION ALL
SELECT 'AMPLIFICADOR', 'Amplificador', NOW(), NOW(), false
UNION ALL
SELECT 'MODULOS', 'Módulos', NOW(), NOW(), false
UNION ALL
SELECT 'NIVEIS_AMEACA', 'Níveis de ameaça', NOW(), NOW(), false
UNION ALL
SELECT 'FICHA_CRIATURA', 'Ficha de criatura', NOW(), NOW(), false
UNION ALL
SELECT 'HABILIDADE_CRIATURA', 'Habilidade de criatura', NOW(), NOW(), false
UNION ALL
SELECT 'ROTEIRO', 'Roteiro', NOW(), NOW(), false
UNION ALL
SELECT 'FAIXAS', 'Faixas', NOW(), NOW(), false
UNION ALL
SELECT 'GRADE', 'Grade', NOW(), NOW(), false
UNION ALL
SELECT 'ABERTURA', 'Abertura', NOW(), NOW(), false
UNION ALL
SELECT 'GENERICO', 'Genérico', NOW(), NOW(), false;

CREATE TABLE tipo_livro_versao_situacao (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_livro_versao_situacao PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_livro_versao_situacao_codigo_ativo
  ON tipo_livro_versao_situacao (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_livro_versao_situacao_updated_date
  BEFORE UPDATE ON tipo_livro_versao_situacao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_livro_versao_situacao (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'RASCUNHO', 'Rascunho publicado', NOW(), NOW(), false
UNION ALL
SELECT 'PUBLICADA', 'Versão publicada', NOW(), NOW(), false;

CREATE TABLE regra_peca (
  id                  SERIAL      NOT NULL,
  created_date        TIMESTAMPTZ NOT NULL,
  updated_date        TIMESTAMPTZ NOT NULL,
  is_deleted          BOOLEAN     NOT NULL,
  deleted_date        TIMESTAMPTZ,

  livro_id            INTEGER     NOT NULL,
  peca_pai_id         INTEGER,
  tipo_regra_peca_id  INTEGER     NOT NULL,
  identificador       UUID        NOT NULL,
  ancora              VARCHAR(200),
  ordem               INTEGER     NOT NULL,
  dados               JSONB       NOT NULL,
  revisao             INTEGER     NOT NULL,

  CONSTRAINT pk_regra_peca PRIMARY KEY (id),
  CONSTRAINT fk_regra_peca_livro
    FOREIGN KEY (livro_id) REFERENCES livro (id),
  CONSTRAINT uix_regra_peca_livro_id UNIQUE (livro_id, id),
  CONSTRAINT fk_regra_peca_peca_pai
    FOREIGN KEY (livro_id, peca_pai_id) REFERENCES regra_peca (livro_id, id),
  CONSTRAINT fk_regra_peca_tipo_regra_peca
    FOREIGN KEY (tipo_regra_peca_id) REFERENCES tipo_regra_peca (id),
  CONSTRAINT chk_regra_peca_ordem CHECK (ordem >= 0),
  CONSTRAINT chk_regra_peca_revisao CHECK (revisao >= 1),
  CONSTRAINT chk_regra_peca_ancora CHECK (ancora IS NULL OR char_length(btrim(ancora)) >= 1),
  CONSTRAINT chk_regra_peca_peca_pai_propria CHECK (peca_pai_id IS NULL OR peca_pai_id <> id)
);

-- Total (não parcial): o identificador de uma peça excluída nunca é reaproveitado por outra, ou o
-- comparador (m11-05) leria "removida + nova" como "alterada".
CREATE UNIQUE INDEX uix_regra_peca_identificador
  ON regra_peca (identificador);

CREATE UNIQUE INDEX uix_regra_peca_livro_ancora_ativo
  ON regra_peca (livro_id, ancora)
  WHERE is_deleted = false AND ancora IS NOT NULL;

CREATE INDEX ix_regra_peca_livro_pai_ordem
  ON regra_peca (livro_id, peca_pai_id, ordem);

CREATE INDEX ix_regra_peca_peca_pai
  ON regra_peca (peca_pai_id);

CREATE TRIGGER trg_regra_peca_updated_date
  BEFORE UPDATE ON regra_peca
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE regra_peca_ancora_antiga (
  id             SERIAL       NOT NULL,
  created_date   TIMESTAMPTZ  NOT NULL,
  updated_date   TIMESTAMPTZ  NOT NULL,
  is_deleted     BOOLEAN      NOT NULL,
  deleted_date   TIMESTAMPTZ,

  livro_id       INTEGER      NOT NULL,
  regra_peca_id  INTEGER      NOT NULL,
  ancora         VARCHAR(200) NOT NULL,

  CONSTRAINT pk_regra_peca_ancora_antiga PRIMARY KEY (id),
  CONSTRAINT fk_regra_peca_ancora_antiga_livro
    FOREIGN KEY (livro_id) REFERENCES livro (id),
  CONSTRAINT fk_regra_peca_ancora_antiga_regra_peca
    FOREIGN KEY (livro_id, regra_peca_id) REFERENCES regra_peca (livro_id, id),
  CONSTRAINT chk_regra_peca_ancora_antiga_ancora CHECK (char_length(btrim(ancora)) >= 1)
);

CREATE UNIQUE INDEX uix_regra_peca_ancora_antiga_livro_ancora_ativo
  ON regra_peca_ancora_antiga (livro_id, ancora)
  WHERE is_deleted = false;

CREATE INDEX ix_regra_peca_ancora_antiga_regra_peca
  ON regra_peca_ancora_antiga (regra_peca_id);

CREATE TRIGGER trg_regra_peca_ancora_antiga_updated_date
  BEFORE UPDATE ON regra_peca_ancora_antiga
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE livro_versao (
  id                                 SERIAL       NOT NULL,
  created_date                       TIMESTAMPTZ  NOT NULL,
  updated_date                       TIMESTAMPTZ  NOT NULL,
  is_deleted                         BOOLEAN      NOT NULL,
  deleted_date                       TIMESTAMPTZ,

  livro_id                           INTEGER      NOT NULL,
  tipo_livro_versao_situacao_id      INTEGER      NOT NULL,
  numero                             VARCHAR(40)  NOT NULL,
  formato                            INTEGER      NOT NULL,
  conteudo                           JSONB        NOT NULL,
  publicacao_data                    TIMESTAMPTZ  NOT NULL,
  usuario_id                         INTEGER      NOT NULL,
  nota                               TEXT,

  CONSTRAINT pk_livro_versao PRIMARY KEY (id),
  CONSTRAINT fk_livro_versao_livro
    FOREIGN KEY (livro_id) REFERENCES livro (id),
  CONSTRAINT fk_livro_versao_tipo_livro_versao_situacao
    FOREIGN KEY (tipo_livro_versao_situacao_id) REFERENCES tipo_livro_versao_situacao (id),
  CONSTRAINT fk_livro_versao_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (id),
  CONSTRAINT chk_livro_versao_numero CHECK (char_length(btrim(numero)) >= 1),
  CONSTRAINT chk_livro_versao_formato CHECK (formato >= 1)
);

CREATE INDEX ix_livro_versao_livro_situacao_publicacao
  ON livro_versao (livro_id, tipo_livro_versao_situacao_id, publicacao_data DESC);

-- A fotografia é imutável: só o soft delete passa.
CREATE FUNCTION fn_livro_versao_imutavel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.livro_id IS DISTINCT FROM OLD.livro_id
     OR NEW.tipo_livro_versao_situacao_id IS DISTINCT FROM OLD.tipo_livro_versao_situacao_id
     OR NEW.numero IS DISTINCT FROM OLD.numero
     OR NEW.formato IS DISTINCT FROM OLD.formato
     OR NEW.conteudo IS DISTINCT FROM OLD.conteudo
     OR NEW.publicacao_data IS DISTINCT FROM OLD.publicacao_data
     OR NEW.usuario_id IS DISTINCT FROM OLD.usuario_id
     OR NEW.nota IS DISTINCT FROM OLD.nota THEN
    RAISE EXCEPTION 'livro_versao é uma fotografia imutável (id %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_livro_versao_imutavel
  BEFORE UPDATE ON livro_versao
  FOR EACH ROW EXECUTE FUNCTION fn_livro_versao_imutavel();

CREATE TRIGGER trg_livro_versao_updated_date
  BEFORE UPDATE ON livro_versao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_livro_versao_updated_date ON livro_versao;
DROP TRIGGER IF EXISTS trg_livro_versao_imutavel ON livro_versao;
DROP FUNCTION IF EXISTS fn_livro_versao_imutavel();
DROP INDEX IF EXISTS ix_livro_versao_livro_situacao_publicacao;
DROP TABLE IF EXISTS livro_versao CASCADE;

DROP TRIGGER IF EXISTS trg_regra_peca_ancora_antiga_updated_date ON regra_peca_ancora_antiga;
DROP INDEX IF EXISTS ix_regra_peca_ancora_antiga_regra_peca;
DROP INDEX IF EXISTS uix_regra_peca_ancora_antiga_livro_ancora_ativo;
DROP TABLE IF EXISTS regra_peca_ancora_antiga CASCADE;

DROP TRIGGER IF EXISTS trg_regra_peca_updated_date ON regra_peca;
DROP INDEX IF EXISTS ix_regra_peca_livro_pai_ordem;
DROP INDEX IF EXISTS uix_regra_peca_livro_ancora_ativo;
DROP INDEX IF EXISTS ix_regra_peca_peca_pai;
DROP INDEX IF EXISTS uix_regra_peca_identificador;
DROP TABLE IF EXISTS regra_peca CASCADE;

DROP TRIGGER IF EXISTS trg_tipo_livro_versao_situacao_updated_date ON tipo_livro_versao_situacao;
DROP TABLE IF EXISTS tipo_livro_versao_situacao CASCADE;

DROP TRIGGER IF EXISTS trg_tipo_regra_peca_updated_date ON tipo_regra_peca;
DROP TABLE IF EXISTS tipo_regra_peca CASCADE;

DROP TRIGGER IF EXISTS trg_livro_updated_date ON livro;
DROP TABLE IF EXISTS livro CASCADE;
