-- Páginas do Esquadrão não têm autor individual: o snapshot Yjs é a fonte de verdade de
-- colaboração e titulo/conteúdo são a projeção pesquisável. O tipo segue o padrão tipo_*.

-- UP

CREATE TABLE tipo_pagina_caderno (
  id           SERIAL       NOT NULL,
  created_date TIMESTAMPTZ  NOT NULL,
  updated_date TIMESTAMPTZ  NOT NULL,
  is_deleted   BOOLEAN      NOT NULL,
  deleted_date TIMESTAMPTZ,
  codigo       VARCHAR(20) NOT NULL,
  descricao    VARCHAR(80) NOT NULL,

  CONSTRAINT pk_tipo_pagina_caderno PRIMARY KEY (id),
  CONSTRAINT uix_tipo_pagina_caderno_codigo_ativo UNIQUE (codigo, is_deleted)
);

INSERT INTO tipo_pagina_caderno
  (created_date, updated_date, is_deleted, deleted_date, codigo, descricao)
SELECT NOW(), NOW(), false, NULL::TIMESTAMPTZ, 'PRIVADA', 'Página privada'
UNION ALL
SELECT NOW(), NOW(), false, NULL::TIMESTAMPTZ, 'ESQUADRAO', 'Página colaborativa do Esquadrão';

ALTER TABLE pagina_caderno
  ADD COLUMN tipo_pagina_caderno_id INTEGER,
  ADD COLUMN estado_colaborativo BYTEA;

UPDATE pagina_caderno
SET tipo_pagina_caderno_id = (
  SELECT tipo_pagina_caderno.id
  FROM tipo_pagina_caderno
  WHERE tipo_pagina_caderno.codigo = 'PRIVADA'
    AND tipo_pagina_caderno.is_deleted = false
);

ALTER TABLE pagina_caderno
  ALTER COLUMN tipo_pagina_caderno_id SET NOT NULL,
  ALTER COLUMN usuario_autor_id DROP NOT NULL,
  ADD CONSTRAINT fk_pagina_caderno_tipo
    FOREIGN KEY (tipo_pagina_caderno_id) REFERENCES tipo_pagina_caderno (id),
  ADD CONSTRAINT chk_pagina_caderno_autoria_estado
    CHECK (
      (usuario_autor_id IS NOT NULL AND estado_colaborativo IS NULL)
      OR (usuario_autor_id IS NULL AND estado_colaborativo IS NOT NULL)
    );

CREATE INDEX ix_pagina_caderno_esquadrao_campanha_atualizacao
  ON pagina_caderno (campanha_id, updated_date DESC)
  WHERE usuario_autor_id IS NULL
    AND estado_colaborativo IS NOT NULL
    AND is_deleted = false;

-- DOWN

DROP INDEX IF EXISTS ix_pagina_caderno_esquadrao_campanha_atualizacao;
ALTER TABLE pagina_caderno DROP CONSTRAINT IF EXISTS chk_pagina_caderno_autoria_estado;
ALTER TABLE pagina_caderno DROP CONSTRAINT IF EXISTS fk_pagina_caderno_tipo;
DELETE FROM pagina_caderno WHERE usuario_autor_id IS NULL;
ALTER TABLE pagina_caderno ALTER COLUMN usuario_autor_id SET NOT NULL;
ALTER TABLE pagina_caderno DROP COLUMN estado_colaborativo;
ALTER TABLE pagina_caderno DROP COLUMN tipo_pagina_caderno_id;
DROP TABLE IF EXISTS tipo_pagina_caderno;
