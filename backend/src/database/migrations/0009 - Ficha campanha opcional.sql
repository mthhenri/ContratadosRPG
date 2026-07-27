-- Migration M3 (m3-28) — a ficha deixa de ser filha obrigatória da campanha: ela ganha um
-- acervo próprio do usuário (cardinalidade 1:N — no máximo uma campanha por vez; reatribuir
-- move). A FK `fk_ficha_campanha` e o índice `ix_ficha_campanha` já toleram NULL — mantidos.

-- UP

ALTER TABLE ficha
  ALTER COLUMN campanha_id DROP NOT NULL;

-- DOWN

ALTER TABLE ficha
  ALTER COLUMN campanha_id SET NOT NULL;
