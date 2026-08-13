-- Migration M6 — inventário de esquadrão (campanha). Duas colunas novas, ambas nullable e sem
-- `DEFAULT` (proibição #7): campanha existente nasce com `na_base = null` (tratado como "Na
-- Base"/`true` na leitura via COALESCE) e `inventario = null` (tratado como lista vazia). O
-- inventário é um array JSONB simples de itens descritivos (nome/categoria/custo/peso/
-- quantidade/dano/informação/resistência/bônus) — sem equipar, sem sub-inventário, sem limite de
-- peso; guardado inteiro a cada mutação (mesmo padrão de `ficha.dados`).

-- UP

ALTER TABLE campanha ADD COLUMN na_base BOOLEAN;
ALTER TABLE campanha ADD COLUMN inventario JSONB;

-- DOWN

ALTER TABLE campanha DROP COLUMN IF EXISTS inventario;
ALTER TABLE campanha DROP COLUMN IF EXISTS na_base;
