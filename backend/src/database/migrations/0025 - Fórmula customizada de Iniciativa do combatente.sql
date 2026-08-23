-- Mestre pode sobrescrever, por combatente e por encontro, a expressão de dados usada para rolar
-- a Iniciativa (m7-19). Nula por padrão: usa a fórmula padrão do sistema/origem quando ausente.

-- UP

ALTER TABLE encontro_combatente
  ADD COLUMN iniciativa_formula_custom VARCHAR;

-- DOWN

ALTER TABLE encontro_combatente
  DROP COLUMN iniciativa_formula_custom;
