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
  login   VARCHAR NOT NULL,
  senha   VARCHAR NOT NULL,   -- hash bcrypt
  nome    VARCHAR NOT NULL
);
-- uix_usuario_login_ativo: UNIQUE (login) WHERE is_deleted = false
-- Seed da conta inicial do autor ('senhor.contratados') criado na migration (senha como hash bcrypt).
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

Regras: uma campanha tem exatamente um membro `MESTRE` no v1 (inicialmente o criador; o papel
é transferível pelo mestre atual — §14); jogador entra via `codigo_convite` com papel `JOGADOR`.

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

> A forma final de cada documento é definida nas specs de M3 (jogador) e M4 (criatura/NPC),
> derivada de `docs/core/sistema-v4.1.0.md` e `docs/core/guia_de_mestre-v4.0.0.md`. O
> contrato tipado vive em `shared/src/dtos/ficha/` (`FichaJogadorDadosDto` — **final**,
> m3-01; `FichaCriaturaDadosDto` — esboço, fechar no M4) e o backend valida via `shared/regras`
> (coerência de domínio) + validação estrutural quando o `ValidationPipe` for ligado (m3-02/03).
> Campos de jogo nunca viram colunas — listagens usam `dados->>'campo'`.

### FichaJogadorDadosDto (final — m3-01)

Contrato: `shared/src/dtos/ficha/ficha.dtos.ts`. Forma 1:1 com `sistema-v4.1.0.md`
(classe/atributos/estado/inventário). O documento vence o código (proibição #27).

```jsonc
{
  "classe": "COMBATENTE",             // ClasseEnum — codifica classe base, subclasses
                                      // (EXPERIMENTO_*) e CIVIL; NÃO há campo "subclasse" à parte
  "arquetipo": "LUTADOR",             // ArquetipoEnum | null — null p/ Experimento ou Civil
  "nivel": 5,                         // 0–20 inteiro
  "prestigio": 12,                    // inteiro; pode ser negativo; a Patente é DERIVADA daqui
  "atributos": {                      // os 10 atributos (Sentidos é um deles, não campo à parte)
    "destreza": 2, "forca": 4, "luta": 3, "pontaria": 1, "vigor": 3,
    "intelecto": 1, "medicina": 0, "sentidos": 2, "social": 1, "vontade": 2
  },
  "maestria": "forca",                // keyof atributos | null — atributo com Maestria (m3-10);
                                      // único na ficha, só em atributo com 6+ (sistema-v4.1.0.md)
  "identidade": {                     // m3-23: opcional — ausente em fichas anteriores a esta task
    "personalidade": "Determinado",   // string | null — uma única palavra, um adjetivo
    "origem": {                       // FichaOrigemDto | null — imutável após definida (m3-24 trava)
      "nome": "Bombeiro",
      "descricao": "...",
      "formacao": [                   // exatamente 2 FichaFormacaoDto
        { "bonus": "COMBATE_RESISTENCIA_TIPO_DANO", "parametro": "Químico", "texto": "+3 de resistência a dano Químico" },
        { "bonus": null, "parametro": null, "texto": "+1 dado em testes de Escalada" } // bonus:null = custom autorizado pelo Mestre
      ],
      "especialidade": { "gatilho": "...", "efeito": "DADO_EXTRA" },
      "saberDeCampo": "..."
    }
  },
  "contrato": "0000",                 // m3-40: opcional, texto livre — só o Mestre altera
                                      // (dono/visualizador só leem; backend trava o dono)
  "estado": {
    "vidaAtual": 34,                  // atual PODE exceder a máxima (m3-10)
    "energiaAtual": 18,               // pode negativar; PODE exceder a máxima (m3-10)
    "vidaMaxima": 34,                 // m3-10: snapshot na criação, depois editável (opcional;
    "energiaMaxima": 18,              //        ausente em fichas antigas → cai no derivado)
    "sequelas": [ { "nome": "Paranoia", "descricao": "..." } ],          // temporárias
    "traumas":  [ { "nome": "...", "descricao": "...", "tratado": false } ], // permanentes, tratáveis
    "lesoes":   [ { "atributo": "forca", "pontos": 1,
                    "severidade": "LEVE", "permanente": false } ],       // remove ponto de atributo
    "morrendo": false, "machucado": false, "inconsciente": false
    // m2-16b: as três condições de sistema-v4.1.0.md ("Condições") rastreadas na ficha.
    // Opcionais (retrocompat) — ausente equivale a false. Alternadas MANUALMENTE pelo dono/mestre,
    // nunca recalculadas a partir de vidaAtual (mesma filosofia de m3-10: liberdade de edição).
  },
  "derivados": {                      // m3-10: TODO derivado é snapshot na criação e depois EDITÁVEL
    "defesa": 14, "esquiva": 12, "bloqueio": 16,   // "nada exclusivamente calculado" — tudo no banco
    "deslocamento": 9, "proficiencia": 2,
    "danoCorpoACorpo": 3, "danoFurtivo": 6,
    "percepcao": 15, "inventarioMaximo": 20,
    "habilidadesPorTurno": 2, "dtAtributo": 16
    // opcionais/retrocompat: ausentes → fallback ao cálculo de shared/regras (fichas antigas)
  },
  "rolagens": [                       // m3-15: presets de rolagem de dados salvos na ficha
    // m3-29 (gramática v3): a fórmula especifica tudo — NÃO há mais campo "modo".
    // Um teste é a expressão explícita `LUTd20kh1 + PROF` (kh/kl, margem `cm`, explosão `!`/implosão `?`).
    // Presets legados com "modo":"TESTE" migram na CARGA (normalizarPresetLegado, shared/regras/rolagem)
    // e persistem a fórmula nova no próximo save — o backend guarda o JSONB opaco (não valida rolagem).
    { "nome": "Ataque (Luta)", "formula": "LUTd20kh1 + PROF", "descricao": "..." }
  ],
  "habilidades": [
    { "nome": "6º Sentido", "categoria": "GERAL", "custoEnergia": 0, "descricao": "..." }
    // custoEnergia: número ([N E]), 0 ([0 E]) ou null (custo variável [X E])
    // categoria: HabilidadeCategoriaEnum (GERAL/CLASSE/ARQUETIPO/SUBCLASSE/OUTRA_CLASSE/…)
  ],
  "inventario": {                     // reusa o formato do carrinho da calculadora M1 (sem tipo duplicado)
    "itens": [ /* CarrinhoItemDto de shared/regras/compras — item + modificações */ ],
    "amplificadores": [ /* AmplificadorAplicadoDto de shared/regras/compras */ ]
  },
  "anotacoes": "..."
}
```

**Nada é exclusivamente calculado — todo derivado é persistido (revisto em `m3-10`).** O princípio
antigo ("nenhum derivado persistido") foi **invertido**: **tudo o que aparece na ficha existe no
banco**. Na **criação**, `shared/regras` calcula os derivados uma vez e eles são **gravados** no bloco
`derivados` (Vida/Energia máximas ficam em `estado`; Defesa/Esquiva/Bloqueio, Deslocamento,
Proficiência, Dano de Corpo/Furtivo, Percepção, Inventário máximo, Habilidades/turno, DT de atributo,
Patente… ficam em `derivados`). A partir daí são **stored e editáveis** — o motor **não os recalcula**
sobre as edições; a **atual pode exceder a máxima**; subir de nível **soma** o delta de progressão aos
máximos stored. Campos `derivados` **opcionais** — ausentes em fichas anteriores a `m3-10` caem no
cálculo de `shared/regras` como fallback. (A Patente segue derivada do Prestígio como rótulo; se
editada, mora em `derivados`.)

**Ainda fora do contrato:** Dinheiro corrente e Peculiaridade de Experimento — entram quando as
tasks de ficha os exigirem. **Identidade** (Personalidade, Origem) entrou em **m3-23**
(`FichaIdentidadeDto`, `shared/regras/identidade`): a tabela `FORMACOES` cobre as 21 linhas de bônus
de Formação do documento, mas só 5 têm campo hoje em `derivados` (`esquiva`/`bloqueio`,
`deslocamento`, `danoCorpoACorpo`, `danoFurtivo`, `inventarioMaximo`) — as outras 16 (modificadores de
rolagem, duração de efeito, resistências, Sobrecarga, Iniciativa, DT de reparo) ficam modeladas e sem consumidor até os
campos/motor que as aplicarão existirem. `FichaFormacaoDto.bonus: null` é o escape do documento ("Bônus
adicionais podem ser autorizados pelo Mestre") — nesse caso só o `texto` livre é exibido. Sem
validação nem trava de imutabilidade ainda (`m3-24`); sem UI ainda (`m3-25`).
**Maestrias** entraram em **m3-10** (`maestria`, campo único `keyof atributos | null`). As
sub-coleções de jogo — **sequelas/traumas/lesões** (Sanidade), **habilidades**, **inventário** e
**presets de rolagem** (`rolagens`) — moram no `dados` e ganham editores/abas nas tasks `m3-11`…`m3-15`.

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
