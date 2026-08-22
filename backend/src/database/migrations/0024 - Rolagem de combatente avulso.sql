-- Rolagens podem nascer de uma ficha ou de um combatente avulso, nunca dos dois.

-- UP

ALTER TABLE rolagem
  ALTER COLUMN ficha_id DROP NOT NULL,
  ADD COLUMN encontro_combatente_id INTEGER,
  ADD CONSTRAINT fk_rolagem_encontro_combatente
    FOREIGN KEY (encontro_combatente_id) REFERENCES encontro_combatente (id),
  ADD CONSTRAINT ck_rolagem_origem
    CHECK ((ficha_id IS NOT NULL) <> (encontro_combatente_id IS NOT NULL));

CREATE INDEX ix_rolagem_encontro_combatente
  ON rolagem (encontro_combatente_id);

-- DOWN

DROP INDEX IF EXISTS ix_rolagem_encontro_combatente;
ALTER TABLE rolagem
  DROP CONSTRAINT IF EXISTS ck_rolagem_origem,
  DROP CONSTRAINT IF EXISTS fk_rolagem_encontro_combatente,
  DROP COLUMN IF EXISTS encontro_combatente_id,
  ALTER COLUMN ficha_id SET NOT NULL;
