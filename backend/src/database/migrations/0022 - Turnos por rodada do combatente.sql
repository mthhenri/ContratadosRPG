-- UP

ALTER TABLE encontro_combatente
  ADD COLUMN turnos_por_rodada INTEGER;

UPDATE encontro_combatente
SET turnos_por_rodada = CASE cadencia
  WHEN 'SINGULAR' THEN 1
  WHEN 'DUPLA' THEN 2
  WHEN 'TRIPLICE' THEN 3
  ELSE 4
END;

ALTER TABLE encontro_combatente
  ALTER COLUMN turnos_por_rodada SET NOT NULL,
  ADD CONSTRAINT ck_encontro_combatente_turnos_por_rodada
    CHECK (
      (cadencia = 'SINGULAR' AND turnos_por_rodada = 1)
      OR (cadencia = 'DUPLA' AND turnos_por_rodada = 2)
      OR (cadencia = 'TRIPLICE' AND turnos_por_rodada = 3)
      OR (cadencia = 'FRENETICA' AND turnos_por_rodada >= 4)
    );

-- DOWN

ALTER TABLE encontro_combatente
  DROP CONSTRAINT IF EXISTS ck_encontro_combatente_turnos_por_rodada,
  DROP COLUMN IF EXISTS turnos_por_rodada;
