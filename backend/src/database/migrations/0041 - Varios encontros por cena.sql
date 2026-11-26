-- Troca de tipo da cena (cena-trocar-tipo). Cada passagem da cena por um tipo com iniciativa abre
-- um encontro novo e o anterior fica ENCERRADO no histórico — uma cena passa a ter vários encontros
-- ao longo da vida. O índice único da 0031 (um encontro vivo por cena) vira um índice comum.
--
-- A invariante "no máximo um encontro NÃO encerrado por cena" é arbitrada pela CenaService dentro
-- da transação: um índice parcial pelo status exigiria fixar aqui o id serial de
-- tipo_encontro_status, o que é frágil.

-- UP

DROP INDEX IF EXISTS uix_encontro_cena_ativo;

CREATE INDEX ix_encontro_cena
  ON encontro (cena_id)
  WHERE is_deleted = false AND cena_id IS NOT NULL;

-- DOWN

-- Recriar o índice único com uma cena de vários encontros apagaria histórico; falha de propósito.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM encontro
    WHERE is_deleted = false AND cena_id IS NOT NULL
    GROUP BY cena_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Há cenas com mais de um encontro; o índice único uix_encontro_cena_ativo não pode voltar sem perder histórico';
  END IF;
END $$;

DROP INDEX IF EXISTS ix_encontro_cena;

CREATE UNIQUE INDEX uix_encontro_cena_ativo
  ON encontro (cena_id)
  WHERE is_deleted = false AND cena_id IS NOT NULL;
