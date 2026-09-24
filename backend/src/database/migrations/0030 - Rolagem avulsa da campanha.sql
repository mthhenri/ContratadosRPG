-- P-076 — a rolagem rápida do mestre na campanha não nasce de ficha nem de combatente: grava os
-- dois nulos e só a `campanha_id`. O CHECK passa a aceitar no máximo um entre ficha e combatente,
-- e nenhum dos dois apenas quando a rolagem pertence a uma campanha.

-- UP

ALTER TABLE rolagem
  DROP CONSTRAINT chk_rolagem_origem;

ALTER TABLE rolagem
  ADD CONSTRAINT chk_rolagem_origem
    CHECK (
      NOT (ficha_id IS NOT NULL AND encontro_combatente_id IS NOT NULL)
      AND (ficha_id IS NOT NULL OR encontro_combatente_id IS NOT NULL OR campanha_id IS NOT NULL)
    );

-- DOWN

-- Atenção: este DOWN falha enquanto existir qualquer rolagem avulsa da campanha (ficha_id e
-- encontro_combatente_id nulos), inclusive soft-deletada — o CHECK vale para toda linha da
-- tabela. Reverter exige decidir antes o destino dessas linhas; não apague dado para destravar.

ALTER TABLE rolagem
  DROP CONSTRAINT chk_rolagem_origem;

ALTER TABLE rolagem
  ADD CONSTRAINT chk_rolagem_origem
    CHECK ((ficha_id IS NOT NULL) <> (encontro_combatente_id IS NOT NULL));
