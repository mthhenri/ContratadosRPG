-- Migration M7 (m7-21) — a Cena: raiz tipada da mesa (Combate, Investigação, Furtiva,
-- Perseguição, Resistência — docs/core/sistema-v4.1.0.md, "⬡ Cenas"), com ciclo de vida
-- PLANEJADA → ATIVA → ENCERRADA. O `encontro` (iniciativa) continua existindo e passa a pendurar
-- numa cena-mãe por `cena_id` — no máximo um encontro por cena.
--
-- Só estrutura: o backfill dos encontros existentes vive na migration 0032. `encontro.cena_id`
-- nasce nullable e continua nullable depois do backfill: o `NOT NULL` só fecha em m7-22, quando a
-- criação de encontro passa a nascer dentro de uma cena (até lá o POST de encontro atual não grava
-- cena_id).
--
-- A invariante "no máximo uma cena ATIVA por campanha" NÃO vira índice parcial único, pelo mesmo
-- motivo de `encontro` (0021): o predicado dependeria do id de ATIVA em tipo_cena_status, e o
-- PostgreSQL proíbe subquery no WHERE de índice. É arbitrada pela CenaService (m7-22).

-- UP

CREATE TABLE tipo_cena (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_cena PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_cena_codigo_ativo
  ON tipo_cena (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_cena_updated_date
  BEFORE UPDATE ON tipo_cena
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_cena (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'COMBATE', 'Combate', NOW(), NOW(), false
UNION ALL
SELECT 'INVESTIGACAO', 'Investigação', NOW(), NOW(), false
UNION ALL
SELECT 'FURTIVA', 'Furtiva', NOW(), NOW(), false
UNION ALL
SELECT 'PERSEGUICAO', 'Perseguição', NOW(), NOW(), false
UNION ALL
SELECT 'RESISTENCIA', 'Resistência', NOW(), NOW(), false;

CREATE TABLE tipo_cena_status (
  id            SERIAL      NOT NULL,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR     NOT NULL,
  descricao     VARCHAR     NOT NULL,

  CONSTRAINT pk_tipo_cena_status PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uix_tipo_cena_status_codigo_ativo
  ON tipo_cena_status (codigo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_tipo_cena_status_updated_date
  BEFORE UPDATE ON tipo_cena_status
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_cena_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PLANEJADA', 'Planejada', NOW(), NOW(), false
UNION ALL
SELECT 'ATIVA', 'Ativa', NOW(), NOW(), false
UNION ALL
SELECT 'ENCERRADA', 'Encerrada', NOW(), NOW(), false;

CREATE TABLE cena (
  id                   SERIAL      NOT NULL,
  created_date         TIMESTAMPTZ NOT NULL,
  updated_date         TIMESTAMPTZ NOT NULL,
  is_deleted           BOOLEAN     NOT NULL,
  deleted_date         TIMESTAMPTZ,

  campanha_id          INTEGER     NOT NULL,
  tipo_cena_id         INTEGER     NOT NULL,
  tipo_cena_status_id  INTEGER     NOT NULL,
  nome                 VARCHAR     NOT NULL,
  ordem                INTEGER     NOT NULL,

  CONSTRAINT pk_cena PRIMARY KEY (id),
  CONSTRAINT fk_cena_campanha
    FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT fk_cena_tipo_cena
    FOREIGN KEY (tipo_cena_id) REFERENCES tipo_cena (id),
  CONSTRAINT fk_cena_tipo_cena_status
    FOREIGN KEY (tipo_cena_status_id) REFERENCES tipo_cena_status (id)
);

CREATE INDEX ix_cena_campanha
  ON cena (campanha_id);

CREATE TRIGGER trg_cena_updated_date
  BEFORE UPDATE ON cena
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

ALTER TABLE encontro
  ADD COLUMN cena_id INTEGER,
  ADD CONSTRAINT fk_encontro_cena
    FOREIGN KEY (cena_id) REFERENCES cena (id);

-- Um-para-um: no máximo um encontro vivo por cena (m7-cenas, decisão #1).
CREATE UNIQUE INDEX uix_encontro_cena_ativo
  ON encontro (cena_id)
  WHERE is_deleted = false AND cena_id IS NOT NULL;

-- DOWN

DROP INDEX IF EXISTS uix_encontro_cena_ativo;
ALTER TABLE encontro
  DROP CONSTRAINT IF EXISTS fk_encontro_cena,
  DROP COLUMN IF EXISTS cena_id;
DROP TRIGGER IF EXISTS trg_cena_updated_date ON cena;
DROP TABLE IF EXISTS cena CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_cena_status_updated_date ON tipo_cena_status;
DROP TABLE IF EXISTS tipo_cena_status CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_cena_updated_date ON tipo_cena;
DROP TABLE IF EXISTS tipo_cena CASCADE;
