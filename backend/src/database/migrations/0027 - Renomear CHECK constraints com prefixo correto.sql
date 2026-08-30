-- P-031 — migrations históricas usavam ck_; a convenção canônica é chk_.

-- UP

ALTER TABLE encontro_combatente
  RENAME CONSTRAINT ck_encontro_combatente_origem
  TO chk_encontro_combatente_origem;

ALTER TABLE encontro_combatente
  RENAME CONSTRAINT ck_encontro_combatente_turnos_por_rodada
  TO chk_encontro_combatente_turnos_por_rodada;

ALTER TABLE rolagem
  RENAME CONSTRAINT ck_rolagem_origem
  TO chk_rolagem_origem;

-- DOWN

ALTER TABLE rolagem
  RENAME CONSTRAINT chk_rolagem_origem
  TO ck_rolagem_origem;

ALTER TABLE encontro_combatente
  RENAME CONSTRAINT chk_encontro_combatente_turnos_por_rodada
  TO ck_encontro_combatente_turnos_por_rodada;

ALTER TABLE encontro_combatente
  RENAME CONSTRAINT chk_encontro_combatente_origem
  TO ck_encontro_combatente_origem;
