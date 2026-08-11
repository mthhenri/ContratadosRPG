-- Migration M3 (m3-65) — ficha oculta. Dono esconde a própria ficha de qualquer outro jogador
-- (nem carteirinha aparece — ver CampanhaRepository.listarMembros); mestre e o próprio dono
-- continuam vendo normal. Coluna relacional (ao lado de `nome`/`cor`), nunca dentro do JSONB
-- `dados` — mesma regra de identidade/posse. Nullable e sem `DEFAULT` (proibição #7): ficha
-- existente nasce sem a flag, tratada como `false` na leitura (`COALESCE`).

-- UP

ALTER TABLE ficha ADD COLUMN oculta BOOLEAN;

-- DOWN

ALTER TABLE ficha DROP COLUMN IF EXISTS oculta;
