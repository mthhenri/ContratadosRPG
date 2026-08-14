-- Prova local dos índices de busca. Tudo roda dentro de uma transação e termina em ROLLBACK.
-- Resultado esperado nos dois planos: Bitmap Index Scan no índice GIN correspondente.

BEGIN;

WITH alvo AS (
  SELECT campanha_membro.campanha_id, campanha_membro.usuario_id
  FROM campanha_membro
  INNER JOIN campanha
    ON campanha.id = campanha_membro.campanha_id
   AND campanha.is_deleted = false
  INNER JOIN usuario
    ON usuario.id = campanha_membro.usuario_id
   AND usuario.is_deleted = false
  WHERE campanha_membro.is_deleted = false
  ORDER BY campanha_membro.id
  LIMIT 1
)
INSERT INTO pagina_caderno
  (campanha_id, usuario_autor_id, titulo, conteudo_markdown, busca,
   created_date, updated_date, is_deleted)
SELECT alvo.campanha_id,
       alvo.usuario_id,
       CASE WHEN serie % 1000 = 0 THEN 'Quarentena ' || serie ELSE 'Relatório ' || serie END,
       CASE WHEN serie % 1000 = 0 THEN 'protocolo de quarentena ativo' ELSE 'rotina operacional' END,
       ''::tsvector,
       NOW(), NOW(), false
FROM alvo
CROSS JOIN generate_series(1, 10000) AS serie;

WITH alvo AS (
  SELECT campanha_membro.campanha_id, campanha_membro.usuario_id, tipo_ficha.id AS tipo_ficha_id
  FROM campanha_membro
  INNER JOIN campanha
    ON campanha.id = campanha_membro.campanha_id
   AND campanha.is_deleted = false
  INNER JOIN usuario
    ON usuario.id = campanha_membro.usuario_id
   AND usuario.is_deleted = false
  CROSS JOIN LATERAL (
    SELECT id FROM tipo_ficha WHERE is_deleted = false ORDER BY id LIMIT 1
  ) AS tipo_ficha
  WHERE campanha_membro.is_deleted = false
  ORDER BY campanha_membro.id
  LIMIT 1
)
INSERT INTO ficha
  (campanha_id, usuario_id, tipo_ficha_id, nome, dados,
   created_date, updated_date, is_deleted)
SELECT alvo.campanha_id,
       alvo.usuario_id,
       alvo.tipo_ficha_id,
       CASE WHEN serie % 1000 = 0 THEN 'Agente Quarentena ' || serie ELSE 'Agente Rotina ' || serie END,
       jsonb_build_object(
         'anotacoes',
         CASE WHEN serie % 1000 = 0 THEN 'protocolo de quarentena ativo' ELSE 'rotina operacional' END
       ),
       NOW(), NOW(), false
FROM alvo
CROSS JOIN generate_series(1, 10000) AS serie;

SELECT gin_clean_pending_list('ix_pagina_caderno_busca');
SELECT gin_clean_pending_list('ix_ficha_anotacoes_busca');

ANALYZE pagina_caderno;
ANALYZE ficha;

\echo 'PLANO PAGINA_CADERNO'
EXPLAIN (ANALYZE, BUFFERS)
SELECT pagina_caderno.id
FROM pagina_caderno
WHERE pagina_caderno.is_deleted = false
  AND pagina_caderno.busca @@ websearch_to_tsquery(
    'public.contratados_portugues'::regconfig,
    'quarentena'
  );

\echo 'PLANO FICHA'
EXPLAIN (ANALYZE, BUFFERS)
SELECT ficha.id
FROM ficha
WHERE ficha.is_deleted = false
  AND NULLIF(btrim(ficha.dados->>'anotacoes'), '') IS NOT NULL
  AND (
    setweight(
      to_tsvector('public.contratados_portugues'::regconfig, COALESCE(ficha.nome, '')),
      'A'
    ) ||
    setweight(
      to_tsvector(
        'public.contratados_portugues'::regconfig,
        COALESCE(ficha.dados->>'anotacoes', '')
      ),
      'B'
    )
  ) @@ websearch_to_tsquery('public.contratados_portugues'::regconfig, 'quarentena');

ROLLBACK;
