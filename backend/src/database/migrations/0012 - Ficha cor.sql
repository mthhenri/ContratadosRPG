-- Migration M3 (m3-61) — cor de identidade visual por ficha. Coluna relacional (ao lado de `nome`),
-- nunca dentro do JSONB `dados` — mesma regra de identidade/posse já aplicada a `nome`. Nullable e
-- sem `DEFAULT` (proibição #7): ficha existente nasce sem cor definida, caindo no `--accent` de
-- quem visualiza (frontend). Formato hex de 6 dígitos validado na service (camada 1), não aqui.

-- UP

ALTER TABLE ficha ADD COLUMN cor VARCHAR;

-- DOWN

ALTER TABLE ficha DROP COLUMN IF EXISTS cor;
