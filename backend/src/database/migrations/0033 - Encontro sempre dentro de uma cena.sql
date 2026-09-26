-- Migration M7 (m7-22) — fecha o vínculo `encontro → cena` adiado pela m7-21: todo encontro com
-- `cena_id` nulo (criado pelo `POST campanha/:id/encontro` entre a 0032 e esta task) ganha uma cena
-- COMBATE equivalente, no mesmo molde da 0032 (mesmo nome, mesmo estado de exclusão, status
-- MONTAGEM → PLANEJADA, ATIVO → ATIVA, ENCERRADO → ENCERRADA), e `encontro.cena_id` vira NOT NULL.
-- A partir daqui o encontro só nasce dentro da `CenaService`, na mesma transação da cena.
--
-- `ordem` continua depois da maior `ordem` já usada na campanha. As cenas criadas aqui têm
-- `created_date` posterior ao do encontro, exatamente como as da 0032 — o DOWN da 0032 as reconhece
-- pelo mesmo critério, então este DOWN só desfaz a restrição.
--
-- Reconciliação de status: entre a 0032 e esta task o encontro ainda mudava de status sozinho
-- (iniciar/encerrar), sem tocar a cena — um encontro que estava em MONTAGEM no backfill e foi
-- encerrado depois deixou a cena PLANEJADA com o encontro ENCERRADO. O UP realinha a cena pelo
-- mesmo mapeamento, só para encontro ATIVO/ENCERRADO — o gap só avança o encontro, e a partir da
-- m7-22 cena ATIVA com encontro em MONTAGEM é estado legítimo, que uma reaplicação não pode
-- desfazer. Encontro manda; a invariante antiga de um encontro aberto por campanha garante que isso
-- nunca produz duas cenas ATIVA. Não há volta no DOWN: o status antigo da cena era o dado
-- incoerente, e as cenas de backfill somem de qualquer forma no DOWN da 0032.

-- UP

UPDATE cena
   SET tipo_cena_status_id = (SELECT tipo_cena_status.id FROM tipo_cena_status
                               WHERE tipo_cena_status.codigo = CASE tipo_encontro_status.codigo
                                                                 WHEN 'MONTAGEM'  THEN 'PLANEJADA'
                                                                 WHEN 'ATIVO'     THEN 'ATIVA'
                                                                 WHEN 'ENCERRADO' THEN 'ENCERRADA'
                                                               END
                                 AND tipo_cena_status.is_deleted = false)
  FROM encontro
  INNER JOIN tipo_encontro_status
          ON tipo_encontro_status.id = encontro.tipo_encontro_status_id,
       tipo_cena_status AS status_atual
 WHERE encontro.cena_id = cena.id
   AND status_atual.id = cena.tipo_cena_status_id
   AND tipo_encontro_status.codigo IN ('ATIVO', 'ENCERRADO')
   AND status_atual.codigo <> CASE tipo_encontro_status.codigo
                                WHEN 'MONTAGEM'  THEN 'PLANEJADA'
                                WHEN 'ATIVO'     THEN 'ATIVA'
                                WHEN 'ENCERRADO' THEN 'ENCERRADA'
                              END;

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
         COALESCE((SELECT MAX(cena_existente.ordem)
                     FROM cena AS cena_existente
                    WHERE cena_existente.campanha_id = encontro.campanha_id), 0)
           + ROW_NUMBER() OVER (PARTITION BY encontro.campanha_id ORDER BY encontro.id) AS ordem
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

ALTER TABLE encontro ALTER COLUMN cena_id SET NOT NULL;

-- DOWN

ALTER TABLE encontro ALTER COLUMN cena_id DROP NOT NULL;
