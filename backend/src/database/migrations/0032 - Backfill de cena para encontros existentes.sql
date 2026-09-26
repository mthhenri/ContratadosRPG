-- Migration M7 (m7-21) — backfill: todo `encontro` existente (inclusive soft-deletado) ganha uma
-- cena COMBATE equivalente, com o mesmo nome, o mesmo estado de exclusão e o status mapeado
-- (MONTAGEM → PLANEJADA, ATIVO → ATIVA, ENCERRADO → ENCERRADA). `ordem` segue a ordem de criação
-- dos encontros dentro de cada campanha.
--
-- Nenhum dado de `encontro`/`encontro_combatente`/`encontro_evento` muda além de
-- `encontro.cena_id`: o trigger de `updated_date` de `encontro` fica desligado durante o vínculo.
--
-- O `NOT NULL` de `encontro.cena_id` NÃO é aplicado aqui — fecha em m7-22 (ver 0031).
--
-- Identificação segura das cenas deste backfill (usada pelo DOWN): o UP roda numa transação só,
-- então toda cena criada aqui tem `created_date = NOW()` da transação, estritamente depois da
-- criação do encontro que ela embrulha. Cena criada pela aplicação nasce com o seu encontro na
-- mesma transação (m7-22) — `created_date` igual, nunca maior — ou não tem encontro nenhum.

-- UP

ALTER TABLE encontro DISABLE TRIGGER trg_encontro_updated_date;

WITH origem AS MATERIALIZED (
  SELECT encontro.id                                      AS encontro_id,
         nextval(pg_get_serial_sequence('cena', 'id'))    AS cena_id,
         encontro.campanha_id,
         encontro.nome,
         encontro.is_deleted,
         encontro.deleted_date,
         CASE tipo_encontro_status.codigo
           WHEN 'MONTAGEM'  THEN 'PLANEJADA'
           WHEN 'ATIVO'     THEN 'ATIVA'
           WHEN 'ENCERRADO' THEN 'ENCERRADA'
         END                                              AS codigo_status_cena,
         ROW_NUMBER() OVER (PARTITION BY encontro.campanha_id ORDER BY encontro.id) AS ordem
  FROM encontro
  INNER JOIN tipo_encontro_status
          ON tipo_encontro_status.id = encontro.tipo_encontro_status_id
  WHERE encontro.cena_id IS NULL
),
cena_inserida AS (
  INSERT INTO cena (id, campanha_id, tipo_cena_id, tipo_cena_status_id, nome, ordem,
                    created_date, updated_date, is_deleted, deleted_date)
  SELECT origem.cena_id,
         origem.campanha_id,
         (SELECT tipo_cena.id FROM tipo_cena
           WHERE tipo_cena.codigo = 'COMBATE' AND tipo_cena.is_deleted = false),
         (SELECT tipo_cena_status.id FROM tipo_cena_status
           WHERE tipo_cena_status.codigo = origem.codigo_status_cena
             AND tipo_cena_status.is_deleted = false),
         origem.nome,
         origem.ordem,
         NOW(), NOW(), origem.is_deleted, origem.deleted_date
  FROM origem
  RETURNING cena.id
)
UPDATE encontro
   SET cena_id = origem.cena_id
  FROM origem
 WHERE encontro.id = origem.encontro_id;

ALTER TABLE encontro ENABLE TRIGGER trg_encontro_updated_date;

-- DOWN

CREATE TEMPORARY TABLE cena_do_backfill AS
SELECT cena.id
FROM cena
INNER JOIN encontro
        ON encontro.cena_id = cena.id
INNER JOIN tipo_cena
        ON tipo_cena.id = cena.tipo_cena_id
WHERE tipo_cena.codigo = 'COMBATE'
  AND encontro.created_date < cena.created_date;

ALTER TABLE encontro DISABLE TRIGGER trg_encontro_updated_date;

UPDATE encontro
   SET cena_id = NULL
  FROM cena_do_backfill
 WHERE encontro.cena_id = cena_do_backfill.id;

ALTER TABLE encontro ENABLE TRIGGER trg_encontro_updated_date;

DELETE FROM cena
 USING cena_do_backfill
 WHERE cena.id = cena_do_backfill.id;

DROP TABLE cena_do_backfill;
