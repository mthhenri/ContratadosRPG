-- UP

ALTER TABLE encontro_combatente
  ADD COLUMN cor_avulso VARCHAR,
  ADD COLUMN imagem_url_avulso VARCHAR;

UPDATE encontro_combatente
SET cor_avulso = '#d53030'
WHERE ficha_id IS NULL;

ALTER TABLE encontro_combatente
  DROP CONSTRAINT ck_encontro_combatente_origem,
  ADD CONSTRAINT ck_encontro_combatente_origem
    CHECK (
      (ficha_id IS NOT NULL AND nome_avulso IS NULL AND vida_maxima_avulso IS NULL
        AND vida_atual_avulso IS NULL AND cor_avulso IS NULL AND imagem_url_avulso IS NULL)
      OR
      (ficha_id IS NULL AND nome_avulso IS NOT NULL AND vida_maxima_avulso IS NOT NULL
        AND vida_atual_avulso IS NOT NULL AND cor_avulso IS NOT NULL)
    );

-- DOWN

ALTER TABLE encontro_combatente
  DROP CONSTRAINT ck_encontro_combatente_origem,
  DROP COLUMN imagem_url_avulso,
  DROP COLUMN cor_avulso,
  ADD CONSTRAINT ck_encontro_combatente_origem
    CHECK (
      (ficha_id IS NOT NULL AND nome_avulso IS NULL AND vida_maxima_avulso IS NULL AND vida_atual_avulso IS NULL)
      OR
      (ficha_id IS NULL AND nome_avulso IS NOT NULL AND vida_maxima_avulso IS NOT NULL AND vida_atual_avulso IS NOT NULL)
    );
