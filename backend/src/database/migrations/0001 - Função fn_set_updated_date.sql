-- Migration inicial de infraestrutura.
-- Cria a function genérica fn_set_updated_date() — function de trigger reutilizável que
-- mantém a coluna BaseEntity updated_date em NOW() a cada UPDATE. Cada tabela que a use
-- terá seu próprio trigger trg_<tabela>_updated_date criado junto da tabela (M2+).
-- Nenhuma tabela de negócio é criada aqui.
-- Ver CONVENTIONS.md (prefixos fn_/trg_) e SYSTEM.SPEC §10.1 (BaseEntity).

-- UP

CREATE OR REPLACE FUNCTION fn_set_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DOWN

DROP FUNCTION IF EXISTS fn_set_updated_date();
