-- Cadernos privados por membro/campanha e infraestrutura inicial de busca textual. O caderno é
-- conceitual: cada linha é uma página, agrupada por campanha_id + usuario_autor_id. A configuração
-- de português aplica unaccent antes do stemmer; o título da página/ficha recebe peso A e o corpo
-- ou as anotações recebem peso B. Sem DEFAULT e sem exclusão física.

-- UP

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TEXT SEARCH CONFIGURATION public.contratados_portugues
  (COPY = pg_catalog.portuguese);

ALTER TEXT SEARCH CONFIGURATION public.contratados_portugues
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, portuguese_stem;

ALTER TEXT SEARCH CONFIGURATION public.contratados_portugues
  ALTER MAPPING FOR hword_asciipart, asciihword, asciiword
  WITH portuguese_stem;

CREATE TABLE pagina_caderno (
  id                 SERIAL      NOT NULL,
  created_date       TIMESTAMPTZ NOT NULL,
  updated_date       TIMESTAMPTZ NOT NULL,
  is_deleted         BOOLEAN     NOT NULL,
  deleted_date       TIMESTAMPTZ,

  campanha_id        INTEGER     NOT NULL,
  usuario_autor_id   INTEGER     NOT NULL,
  titulo             VARCHAR(120) NOT NULL,
  conteudo_markdown  TEXT        NOT NULL,
  busca              TSVECTOR    NOT NULL,

  CONSTRAINT pk_pagina_caderno PRIMARY KEY (id),
  CONSTRAINT fk_pagina_caderno_campanha
    FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT fk_pagina_caderno_usuario_autor
    FOREIGN KEY (usuario_autor_id) REFERENCES usuario (id),
  CONSTRAINT chk_pagina_caderno_titulo
    CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 120),
  CONSTRAINT chk_pagina_caderno_conteudo
    CHECK (char_length(conteudo_markdown) <= 100000)
);

CREATE FUNCTION fn_pagina_caderno_busca()
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

CREATE TRIGGER trg_pagina_caderno_busca
  BEFORE INSERT OR UPDATE OF titulo, conteudo_markdown ON pagina_caderno
  FOR EACH ROW EXECUTE FUNCTION fn_pagina_caderno_busca();

CREATE TRIGGER trg_pagina_caderno_updated_date
  BEFORE UPDATE ON pagina_caderno
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE INDEX ix_pagina_caderno_campanha_autor
  ON pagina_caderno (campanha_id, usuario_autor_id);

CREATE INDEX ix_pagina_caderno_busca
  ON pagina_caderno USING GIN (busca);

CREATE INDEX ix_ficha_anotacoes_busca
  ON ficha USING GIN (
    (
      setweight(
        to_tsvector('public.contratados_portugues'::regconfig, COALESCE(nome, '')),
        'A'
      ) ||
      setweight(
        to_tsvector(
          'public.contratados_portugues'::regconfig,
          COALESCE(dados->>'anotacoes', '')
        ),
        'B'
      )
    )
  )
  WHERE is_deleted = false
    AND NULLIF(btrim(dados->>'anotacoes'), '') IS NOT NULL;

-- DOWN

DROP INDEX IF EXISTS ix_ficha_anotacoes_busca;
DROP INDEX IF EXISTS ix_pagina_caderno_busca;
DROP INDEX IF EXISTS ix_pagina_caderno_campanha_autor;
DROP TRIGGER IF EXISTS trg_pagina_caderno_updated_date ON pagina_caderno;
DROP TRIGGER IF EXISTS trg_pagina_caderno_busca ON pagina_caderno;
DROP FUNCTION IF EXISTS fn_pagina_caderno_busca();
DROP TABLE IF EXISTS pagina_caderno CASCADE;
DROP TEXT SEARCH CONFIGURATION IF EXISTS public.contratados_portugues;
