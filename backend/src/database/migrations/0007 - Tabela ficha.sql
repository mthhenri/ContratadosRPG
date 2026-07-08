-- Migration M3 — tabela de fichas (jogador no M3; criatura/NPC no M4).
-- Relacional para identidade, posse e permissão; JSONB `dados` para o conteúdo de jogo
-- (atributos, classe, nível, estado, inventário… — forma fechada em m3-01 / SCHEMA.md §10.4).
-- FKs: campanha (contexto), usuario (dono; mestre para CRIATURA/NPC), tipo_ficha. Índices
-- auxiliares por campanha e por usuario para as listagens. Sem DEFAULT. Depende de campanha
-- (M2), usuario (M2) e tipo_ficha (0006).

-- UP

CREATE TABLE ficha (
  id             SERIAL      NOT NULL,
  created_date   TIMESTAMPTZ NOT NULL,
  updated_date   TIMESTAMPTZ NOT NULL,
  is_deleted     BOOLEAN     NOT NULL,
  deleted_date   TIMESTAMPTZ,

  campanha_id    INTEGER     NOT NULL,
  usuario_id     INTEGER     NOT NULL,
  tipo_ficha_id  INTEGER     NOT NULL,
  nome           VARCHAR     NOT NULL,
  dados          JSONB       NOT NULL,

  CONSTRAINT pk_ficha PRIMARY KEY (id),
  CONSTRAINT fk_ficha_campanha
    FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT fk_ficha_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (id),
  CONSTRAINT fk_ficha_tipo_ficha
    FOREIGN KEY (tipo_ficha_id) REFERENCES tipo_ficha (id)
);

CREATE INDEX ix_ficha_campanha
  ON ficha (campanha_id);

CREATE INDEX ix_ficha_usuario
  ON ficha (usuario_id);

CREATE TRIGGER trg_ficha_updated_date
  BEFORE UPDATE ON ficha
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_ficha_updated_date ON ficha;
DROP TABLE IF EXISTS ficha CASCADE;
