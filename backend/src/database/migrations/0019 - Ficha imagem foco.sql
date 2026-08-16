-- Migração (ajuste pós-mockup) — enquadramento (pan/zoom) do avatar da ficha. Retomada do que
-- `m3-62` deixou fora de escopo ("crop/editor de imagem no client"), sem processamento de imagem
-- no servidor: só o metadado (offset percentual + escala) persiste, ao lado de `imagem_url`.
-- Nullable e sem `DEFAULT` (proibição #7): ficha existente nasce sem ajuste, caindo no
-- comportamento de hoje (`object-position: 50% 50%`, sem zoom).

-- UP

ALTER TABLE ficha ADD COLUMN imagem_foco JSONB;

-- DOWN

ALTER TABLE ficha DROP COLUMN IF EXISTS imagem_foco;
