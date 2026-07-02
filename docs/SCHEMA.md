# SCHEMA.md — contratados-rpg

> Schema SQL **alvo** do sistema. As tabelas são criadas por migrations Knex ao longo dos
> milestones (M2 cria usuario/campanha; M3 cria ficha; etc.). Este documento é a referência
> canônica da forma — mantê-lo sincronizado com as migrations é obrigatório.
>
> Regras gerais: BaseEntity em toda tabela, sem DEFAULT, soft delete, constraints sempre
> nomeadas (`pk_`, `fk_`, `uix_`, `ix_`, `chk_`, `trg_`, `fn_`). Ver SYSTEM.SPEC §10.

---

## Infraestrutura de BaseEntity

```sql
-- Function/trigger genéricos de infraestrutura → inglês
CREATE FUNCTION fn_set_updated_date() RETURNS trigger AS $$
BEGIN
  NEW.updated_date := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cada tabela recebe: CREATE TRIGGER trg_<tabela>_updated_date BEFORE UPDATE ...
```

Campos de BaseEntity em toda tabela:

```sql
id            SERIAL      PRIMARY KEY,       -- CONSTRAINT pk_<tabela>
created_date  TIMESTAMPTZ NOT NULL,
updated_date  TIMESTAMPTZ NOT NULL,
is_deleted    BOOLEAN     NOT NULL,
deleted_date  TIMESTAMPTZ
```

---

## Tabelas de Referência (Enums de coluna)

Criadas com seed na mesma migration. BaseEntity + `codigo` + `descricao`.

```sql
CREATE TABLE tipo_campanha_membro_papel (
  -- BaseEntity...
  codigo    VARCHAR NOT NULL,   -- MESTRE | JOGADOR
  descricao VARCHAR NOT NULL
);
-- uix_tipo_campanha_membro_papel_codigo_ativo: UNIQUE (codigo) WHERE is_deleted = false

CREATE TABLE tipo_ficha (
  -- BaseEntity...
  codigo    VARCHAR NOT NULL,   -- JOGADOR | CRIATURA | NPC
  descricao VARCHAR NOT NULL
);
-- uix_tipo_ficha_codigo_ativo: UNIQUE (codigo) WHERE is_deleted = false
```

Enums TS espelhos: `TipoCampanhaMembroPapelEnum`, `TipoFichaEnum` (em `shared/src/enums/`).

> **Enums de conteúdo de jogo** (`ClasseEnum`, `PatenteEnum`, categorias de item, portes…)
> vivem dentro do JSONB `ficha.dados` e **não** têm tabela `tipo_*` (SYSTEM.SPEC §10.3).

---

## usuario (M2)

```sql
CREATE TABLE usuario (
  -- BaseEntity...
  login             VARCHAR NOT NULL,
  senha_encriptada  VARCHAR NOT NULL,   -- bcrypt
  nome_completo     VARCHAR NOT NULL
);
-- uix_usuario_login_ativo: UNIQUE (login) WHERE is_deleted = false
```

## campanha (M2)

```sql
CREATE TABLE campanha (
  -- BaseEntity...
  nome            VARCHAR NOT NULL,
  descricao       TEXT,
  codigo_convite  VARCHAR NOT NULL    -- regenerável pelo mestre; invalida o anterior
);
-- uix_campanha_codigo_convite_ativo: UNIQUE (codigo_convite) WHERE is_deleted = false
```

## campanha_membro (M2)

```sql
CREATE TABLE campanha_membro (
  -- BaseEntity...
  campanha_id                    INTEGER NOT NULL,  -- fk_campanha_membro_campanha
  usuario_id                     INTEGER NOT NULL,  -- fk_campanha_membro_usuario
  tipo_campanha_membro_papel_id  INTEGER NOT NULL   -- fk_campanha_membro_tipo_campanha_membro_papel
);
-- uix_campanha_membro_campanha_usuario_ativo: UNIQUE (campanha_id, usuario_id) WHERE is_deleted = false
-- ix_campanha_membro_usuario: (usuario_id)
```

Regras: uma campanha tem exatamente um membro `MESTRE` (o criador) no v1; jogador entra
via `codigo_convite` com papel `JOGADOR`.

## ficha (M3 jogador; M4 criatura/NPC)

```sql
CREATE TABLE ficha (
  -- BaseEntity...
  campanha_id    INTEGER NOT NULL,   -- fk_ficha_campanha
  usuario_id     INTEGER NOT NULL,   -- fk_ficha_usuario (dono; mestre para CRIATURA/NPC)
  tipo_ficha_id  INTEGER NOT NULL,   -- fk_ficha_tipo_ficha
  nome           VARCHAR NOT NULL,
  dados          JSONB   NOT NULL    -- conteúdo de jogo — forma abaixo
);
-- ix_ficha_campanha: (campanha_id)
-- ix_ficha_usuario:  (usuario_id)
```

## usuario_ficha_acesso (M3)

Concessão de **visualização** de uma ficha a outro membro da campanha.
Dono e mestre não precisam de linha (permissão implícita por papel/posse).

```sql
CREATE TABLE usuario_ficha_acesso (
  -- BaseEntity...
  ficha_id    INTEGER NOT NULL,   -- fk_usuario_ficha_acesso_ficha
  usuario_id  INTEGER NOT NULL    -- fk_usuario_ficha_acesso_usuario
);
-- uix_usuario_ficha_acesso_ficha_usuario_ativo: UNIQUE (ficha_id, usuario_id) WHERE is_deleted = false
```

---

## Forma dos documentos JSONB (`ficha.dados`)

> **Rascunho direcional.** A forma final de cada documento é definida nas specs de M3
> (jogador) e M4 (criatura/NPC), derivada de `docs/core/sistema-v4.1.0.md` e
> `docs/core/guia_de_mestre-v4.0.0.md`. O contrato tipado vive em
> `shared/src/dtos/ficha/` (`FichaJogadorDadosDto`, `FichaCriaturaDadosDto`) e o backend
> valida via class-validator + `shared/regras`. Campos de jogo nunca viram colunas —
> listagens usam `dados->>'campo'`.

### FichaJogadorDadosDto (esboço — fechar no M3)

```jsonc
{
  "classe": "COMBATENTE",            // ClasseEnum
  "arquetipo": "...",
  "subclasse": "...",
  "nivel": 5,
  "prestigio": 12,
  "atributos": { "vigor": 3, "destreza": 2, "forca": 4, "vontade": 1 },
  "sentidos": 2,
  "estado": { "vidaAtual": 34, "energiaAtual": 18, "traumas": [], "lesoes": [] },
  "habilidades": [ /* gerais, de classe, arquétipo, outra classe */ ],
  "inventario": [ /* itens + modificações + amplificadores (formato do carrinho M1) */ ],
  "anotacoes": "..."
}
```

Derivados (vida máxima, energia máxima, defesa, deslocamento, dano corpo a corpo, limite
de inventário, área de percepção…) **não são persistidos** — são calculados por
`shared/regras` a partir de classe/nível/atributos, no front (exibição) e no back
(validação de coerência do estado salvo).

### FichaCriaturaDadosDto / NPC (esboço — fechar no M4)

```jsonc
{
  "classificacao": { /* identidade e classificação conforme guia de mestre */ },
  "atributos": { /* ... */ },
  "modificadores": { /* ... */ },
  "saude": { /* vida, limiares */ },
  "defesa": 14,
  "resistencias": [ /* tipo + grau */ ],
  "fraquezas": [ /* ... */ ],
  "regeneracao": { /* ... */ },
  "porte": "...",
  "deslocamento": { /* ... */ },
  "acoes": [ /* ações e habilidades */ ],
  "anotacoes": "..."
}
```
