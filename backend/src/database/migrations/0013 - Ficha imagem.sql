-- Migration M3 (m3-62) — avatar da ficha. O binário não entra no Postgres: só o caminho/URL da
-- imagem persiste, ao lado de `nome`/`cor` — nunca dentro do JSONB `dados` (mesma regra de
-- identidade/posse). Nullable e sem `DEFAULT` (proibição #7): ficha existente nasce sem imagem,
-- caindo no placeholder decorativo (frontend).

-- UP

ALTER TABLE ficha ADD COLUMN imagem_url VARCHAR;

-- DOWN

ALTER TABLE ficha DROP COLUMN IF EXISTS imagem_url;
