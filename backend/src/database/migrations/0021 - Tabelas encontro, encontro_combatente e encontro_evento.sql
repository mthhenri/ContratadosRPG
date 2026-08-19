-- Migration M7 (m7-03) — o Encontro de Combate: ordem de iniciativa com a Cadência das criaturas
-- intercalada, rodadas/turnos, vida e condições dos combatentes. "Encontro" é o nome do domínio; a
-- tela se chama "Iniciativa".
--
-- FONTE ÚNICA (decisão do milestone): vida, energia e as condições de um combatente COM ficha são
-- as da própria `ficha` — o encontro NÃO guarda segunda cópia. Só o combatente avulso (sem ficha)
-- persiste vida aqui (`vida_maxima_avulso`/`vida_atual_avulso`).
--
-- Depende de campanha (0004), ficha (0007/0009) e tipo_encontro_status (0020).

-- UP

CREATE TABLE encontro (
  id                       SERIAL      NOT NULL,
  created_date             TIMESTAMPTZ NOT NULL,
  updated_date             TIMESTAMPTZ NOT NULL,
  is_deleted               BOOLEAN     NOT NULL,
  deleted_date             TIMESTAMPTZ,

  campanha_id              INTEGER     NOT NULL,
  tipo_encontro_status_id  INTEGER     NOT NULL,
  nome                     VARCHAR     NOT NULL,
  rodada_atual             INTEGER     NOT NULL,
  turno_indice             INTEGER     NOT NULL,

  CONSTRAINT pk_encontro PRIMARY KEY (id),
  CONSTRAINT fk_encontro_campanha
    FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT fk_encontro_tipo_encontro_status
    FOREIGN KEY (tipo_encontro_status_id) REFERENCES tipo_encontro_status (id)
);

CREATE INDEX ix_encontro_campanha
  ON encontro (campanha_id);

-- Invariante "no máximo UM encontro não-encerrado por campanha" NÃO vira índice parcial único: o
-- predicado precisaria resolver o id de ENCERRADO em tipo_encontro_status, e o PostgreSQL proíbe
-- subquery no WHERE de um índice (a alternativa seria fixar o id numérico do seed, frágil a
-- qualquer reordenação da tabela de referência). A invariante é arbitrada pela EncontroService,
-- que recusa criar um segundo encontro enquanto houver um não-encerrado na campanha.

CREATE TRIGGER trg_encontro_updated_date
  BEFORE UPDATE ON encontro
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE encontro_combatente (
  id                  SERIAL      NOT NULL,
  created_date        TIMESTAMPTZ NOT NULL,
  updated_date        TIMESTAMPTZ NOT NULL,
  is_deleted          BOOLEAN     NOT NULL,
  deleted_date        TIMESTAMPTZ,

  encontro_id         INTEGER     NOT NULL,
  ficha_id            INTEGER,
  nome_avulso         VARCHAR,
  iniciativa          INTEGER,
  cadencia            VARCHAR     NOT NULL,
  ordem               INTEGER     NOT NULL,
  vida_maxima_avulso  INTEGER,
  vida_atual_avulso   INTEGER,
  condicoes           JSONB       NOT NULL,

  CONSTRAINT pk_encontro_combatente PRIMARY KEY (id),
  CONSTRAINT fk_encontro_combatente_encontro
    FOREIGN KEY (encontro_id) REFERENCES encontro (id),
  CONSTRAINT fk_encontro_combatente_ficha
    FOREIGN KEY (ficha_id) REFERENCES ficha (id),
  -- Ou é ficha (nome/vida vêm dela) ou é avulso (nome e vida próprios) — nunca os dois nem nenhum.
  CONSTRAINT ck_encontro_combatente_origem
    CHECK (
      (ficha_id IS NOT NULL AND nome_avulso IS NULL AND vida_maxima_avulso IS NULL AND vida_atual_avulso IS NULL)
      OR
      (ficha_id IS NULL AND nome_avulso IS NOT NULL AND vida_maxima_avulso IS NOT NULL AND vida_atual_avulso IS NOT NULL)
    )
);

CREATE INDEX ix_encontro_combatente_encontro
  ON encontro_combatente (encontro_id);

CREATE INDEX ix_encontro_combatente_ficha
  ON encontro_combatente (ficha_id);

-- A mesma ficha não entra duas vezes no mesmo encontro (avulsos repetem à vontade).
CREATE UNIQUE INDEX uix_encontro_combatente_encontro_ficha_ativo
  ON encontro_combatente (encontro_id, ficha_id)
  WHERE is_deleted = false AND ficha_id IS NOT NULL;

CREATE TRIGGER trg_encontro_combatente_updated_date
  BEFORE UPDATE ON encontro_combatente
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE encontro_evento (
  id                      SERIAL      NOT NULL,
  created_date            TIMESTAMPTZ NOT NULL,
  updated_date            TIMESTAMPTZ NOT NULL,
  is_deleted              BOOLEAN     NOT NULL,
  deleted_date            TIMESTAMPTZ,

  encontro_id             INTEGER     NOT NULL,
  encontro_combatente_id  INTEGER,
  tipo                    VARCHAR     NOT NULL,
  rodada                  INTEGER     NOT NULL,
  turno                   INTEGER     NOT NULL,
  texto                   VARCHAR     NOT NULL,

  CONSTRAINT pk_encontro_evento PRIMARY KEY (id),
  CONSTRAINT fk_encontro_evento_encontro
    FOREIGN KEY (encontro_id) REFERENCES encontro (id),
  CONSTRAINT fk_encontro_evento_encontro_combatente
    FOREIGN KEY (encontro_combatente_id) REFERENCES encontro_combatente (id)
);

CREATE INDEX ix_encontro_evento_encontro_rodada
  ON encontro_evento (encontro_id, rodada);

CREATE TRIGGER trg_encontro_evento_updated_date
  BEFORE UPDATE ON encontro_evento
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_encontro_evento_updated_date ON encontro_evento;
DROP TABLE IF EXISTS encontro_evento CASCADE;
DROP TRIGGER IF EXISTS trg_encontro_combatente_updated_date ON encontro_combatente;
DROP TABLE IF EXISTS encontro_combatente CASCADE;
DROP TRIGGER IF EXISTS trg_encontro_updated_date ON encontro;
DROP TABLE IF EXISTS encontro CASCADE;
