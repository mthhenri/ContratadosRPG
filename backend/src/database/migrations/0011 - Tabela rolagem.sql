-- Migration M3 (m3-27) — tabela de rolagens registradas a partir de uma ficha. Relacional para
-- identidade (ficha/campanha/autor); JSONB `resultado` para o resultado do motor de rolagem
-- (`ResultadoRolagemDto`, shared/regras/rolagem — reusado 1:1, nenhum tipo novo). `campanha_id`
-- nullable: ficha solta no acervo (m3-28) grava normalmente, sem campanha. `visibilidade` traduz
-- `codigo → id` de `tipo_rolagem_visibilidade` (0010). Depende de ficha (0007/0009), campanha
-- (0004) e usuario (0003).

-- UP

CREATE TABLE rolagem (
  id                          SERIAL      NOT NULL,
  created_date                TIMESTAMPTZ NOT NULL,
  updated_date                TIMESTAMPTZ NOT NULL,
  is_deleted                  BOOLEAN     NOT NULL,
  deleted_date                TIMESTAMPTZ,

  ficha_id                    INTEGER     NOT NULL,
  campanha_id                 INTEGER,
  usuario_id                  INTEGER     NOT NULL,
  rotulo                      VARCHAR     NOT NULL,
  tipo_rolagem_visibilidade_id INTEGER    NOT NULL,
  resultado                   JSONB       NOT NULL,

  CONSTRAINT pk_rolagem PRIMARY KEY (id),
  CONSTRAINT fk_rolagem_ficha
    FOREIGN KEY (ficha_id) REFERENCES ficha (id),
  CONSTRAINT fk_rolagem_campanha
    FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT fk_rolagem_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (id),
  CONSTRAINT fk_rolagem_tipo_rolagem_visibilidade
    FOREIGN KEY (tipo_rolagem_visibilidade_id) REFERENCES tipo_rolagem_visibilidade (id)
);

CREATE INDEX ix_rolagem_ficha
  ON rolagem (ficha_id);

CREATE INDEX ix_rolagem_campanha
  ON rolagem (campanha_id);

CREATE TRIGGER trg_rolagem_updated_date
  BEFORE UPDATE ON rolagem
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_rolagem_updated_date ON rolagem;
DROP TABLE IF EXISTS rolagem CASCADE;
