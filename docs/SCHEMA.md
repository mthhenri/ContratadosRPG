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
```

### tipo_usuario (M6)

```sql
CREATE TABLE tipo_usuario (
  -- BaseEntity...
  codigo    VARCHAR NOT NULL,   -- NORMAL | ADMIN | TESTER
  descricao VARCHAR NOT NULL
);
-- uix_tipo_usuario_codigo_ativo: UNIQUE (codigo) WHERE is_deleted = false
```

```sql
CREATE TABLE tipo_ficha (
  -- BaseEntity...
  codigo    VARCHAR NOT NULL,   -- JOGADOR | CRIATURA | NPC
  descricao VARCHAR NOT NULL
);
-- uix_tipo_ficha_codigo_ativo: UNIQUE (codigo) WHERE is_deleted = false

CREATE TABLE tipo_rolagem_visibilidade (
  -- BaseEntity...
  codigo    VARCHAR NOT NULL,   -- PUBLICA | PRIVADA
  descricao VARCHAR NOT NULL
);
-- uix_tipo_rolagem_visibilidade_codigo_ativo: UNIQUE (codigo) WHERE is_deleted = false

CREATE TABLE tipo_encontro_status (
  -- BaseEntity...
  codigo    VARCHAR NOT NULL,   -- MONTAGEM | ATIVO | ENCERRADO
  descricao VARCHAR NOT NULL
);
-- uix_tipo_encontro_status_codigo_ativo: UNIQUE (codigo) WHERE is_deleted = false
```

Enums TS espelhos: `TipoCampanhaMembroPapelEnum`, `TipoUsuarioEnum`, `TipoFichaEnum`, `RolagemVisibilidadeEnum`,
`EncontroStatusEnum`
(em `shared/src/enums/`). `RolagemVisibilidadeEnum` é coluna relacional de `rolagem` (não vive no
JSONB) — a exceção do §10.3 abaixo não se aplica a ela, segue a regra geral §10.2.12.

> **Enums de conteúdo de jogo** (`ClasseEnum`, `PatenteEnum`, categorias de item, portes…)
> vivem dentro do JSONB `ficha.dados` e **não** têm tabela `tipo_*` (SYSTEM.SPEC §10.3).

---

## usuario (M2; tipo e controle de sessão no M6)

```sql
CREATE TABLE usuario (
  -- BaseEntity...
  login            VARCHAR NOT NULL,
  senha            VARCHAR NOT NULL,   -- hash bcrypt
  nome             VARCHAR NOT NULL,
  tipo_usuario_id  INTEGER NOT NULL,   -- fk_usuario_tipo_usuario
  token_versao     INTEGER NOT NULL    -- começa em 1; permite invalidar tokens emitidos
);
-- uix_usuario_login_ativo: UNIQUE (login) WHERE is_deleted = false
-- Seed da conta inicial do autor ('senhor.contratados') criado na migration (senha como hash bcrypt).
```

## usuario_impersonacao (M6)

Auditoria append-only de uma troca administrativa de identidade. A linha só nasce depois que
origem e alvo foram validados; não contém token, senha ou hash.

```sql
CREATE TABLE usuario_impersonacao (
  -- BaseEntity...
  admin_origem_id   INTEGER NOT NULL,      -- fk_usuario_impersonacao_admin_origem
  usuario_alvo_id   INTEGER NOT NULL,      -- fk_usuario_impersonacao_usuario_alvo
  impersonacao_data TIMESTAMPTZ NOT NULL
);
-- ix_usuario_impersonacao_admin_origem: INDEX (admin_origem_id)
-- ix_usuario_impersonacao_usuario_alvo: INDEX (usuario_alvo_id)
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
  campanha_id    INTEGER,            -- fk_ficha_campanha (nullable — m3-28, ver nota abaixo)
  usuario_id     INTEGER NOT NULL,   -- fk_ficha_usuario (dono; mestre para CRIATURA/NPC)
  tipo_ficha_id  INTEGER NOT NULL,   -- fk_ficha_tipo_ficha
  nome           VARCHAR NOT NULL,
  dados          JSONB   NOT NULL    -- conteúdo de jogo — forma abaixo
);
-- ix_ficha_campanha: (campanha_id)
-- ix_ficha_usuario:  (usuario_id)
```

**`campanha_id` nullable (m3-28 — acervo).** A ficha deixou de ser filha obrigatória da
campanha: `NULL` = ficha **solta** no acervo do dono (`/fichas`), visível/editável só pelo
dono (mais concessões explícitas em `usuario_ficha_acesso`, que continuam ficha-scoped, não
campanha-scoped). Cardinalidade **1:N** — no máximo **uma** campanha por vez; atribuir
(`PUT /ficha/:id/campanha`) **move**, nunca soma. As rotas campanha-scoped
(`/painel/:campanhaId/ficha/*`) continuam existindo em paralelo até a m3-26 aposentá-las —
dívida de rota assumida na m3-28, não no componente (`FichaVisualizar` é o mesmo nas duas
rotas, resolvendo `campanhaId` do payload quando a URL não o traz).

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

## pagina_caderno (cadernos de campanha)

Uma linha representa uma página. O caderno não possui tabela própria: é o agrupamento lógico das
páginas ativas por `(campanha_id, usuario_autor_id)`. O autor precisa ser membro ativo da campanha
para a página aparecer; remover o membro preserva os dados, mas os exclui de listagens e buscas.

```sql
CREATE TABLE pagina_caderno (
  -- BaseEntity...
  campanha_id        INTEGER      NOT NULL, -- fk_pagina_caderno_campanha
  usuario_autor_id   INTEGER      NOT NULL, -- fk_pagina_caderno_usuario_autor
  titulo             VARCHAR(120) NOT NULL,
  conteudo_markdown  TEXT         NOT NULL,
  busca              TSVECTOR     NOT NULL
);

-- ix_pagina_caderno_campanha_autor: (campanha_id, usuario_autor_id)
-- ix_pagina_caderno_busca: GIN (busca)
```

`fn_pagina_caderno_busca` mantém o vetor com `titulo` em peso A e `conteudo_markdown` em peso B.
A configuração `contratados_portugues` encadeia `unaccent` e `portuguese_stem`, permitindo que uma
consulta sem acento encontre texto acentuado. As anotações existentes em `ficha.dados.anotacoes`
permanecem no JSONB e usam o índice parcial de expressão `ix_ficha_anotacoes_busca`, que combina o
nome da ficha em peso A com as anotações em peso B.

## rolagem (M3 — m3-27)

Persistência das rolagens disparadas a partir de uma ficha (teste de atributo, dano, fórmula
avulsa, passo de preset) — histórico por ficha + feed em tempo real na campanha. Relacional para
identidade/permissão; `resultado` em JSONB reusa **1:1** `ResultadoRolagemDto`
(`shared/src/regras/rolagem/rolagem.dtos.ts`) — nenhum tipo novo de resultado.

```sql
CREATE TABLE rolagem (
  -- BaseEntity...
  ficha_id                     INTEGER NOT NULL,   -- fk_rolagem_ficha
  campanha_id                  INTEGER,            -- fk_rolagem_campanha (nullable — ficha solta, m3-28)
  usuario_id                   INTEGER NOT NULL,   -- fk_rolagem_usuario (autor da rolagem)
  rotulo                       VARCHAR NOT NULL,
  formula                      VARCHAR,            -- expressão de dados (ex.: "2d6+3[Físico]") — m3-27-ui22
  tipo_rolagem_visibilidade_id INTEGER NOT NULL,   -- fk_rolagem_tipo_rolagem_visibilidade
  resultado                    JSONB   NOT NULL    -- ResultadoRolagemDto — forma abaixo
);
-- ix_rolagem_ficha:    (ficha_id)
-- ix_rolagem_campanha: (campanha_id)
```

**Autor ≠ dono da ficha, sempre.** `usuario_id` é quem **disparou** a rolagem — o dono da ficha
na maioria dos casos, mas também um visualizador com acesso concedido (`usuario_ficha_acesso`,
quem pode **ver** a ficha pode rolar) ou o mestre. `campanha_id` é resolvido da ficha no momento
do registro (não vem do cliente).

**`formula` é opcional por design.** Guarda a expressão de dados exibida como legenda discreta
no histórico/feed (ui-22, followup pós-lançamento). `NULL` quando quem registra não a informa —
o teste de Atributo direto (`FichaVisualizacao.rolarTesteAtributo`/
`CriaturaVisualizacao.rolarTesteAtributo`) nunca a envia, porque o `rotulo` já é o nome do
atributo e repeti-lo como fórmula seria redundante. Todo outro caminho (rolagem rápida, preset,
dano de item/ataque, avulso do encontro) envia a fórmula usada.

**Visibilidade.** `PUBLICA` (default) aparece para todos os membros da campanha no feed; `PRIVADA`
só para o **autor** e o **mestre** — o mesmo mecanismo cobre o mestre rolando "só para si" (autor
= mestre). Rolagem numa ficha **sem campanha** (`campanha_id NULL`) só alimenta o histórico da
própria ficha; nenhum feed de campanha a recebe.

**Emissão em tempo real (evento `rolagem:registrada`, sala `campanha:<id>`).** Só rolagens
`PUBLICA` são broadcastadas — emitir uma `PRIVADA` pela sala inteira (broadcast não-direcionado,
§9) vazaria o conteúdo a quem não deveria vê-la; o autor/mestre a recebe via REST no próximo
carregamento/refresh do feed (decisão de design v1, `docs/specs/done/m3-27-*.spec.md`). Ficha sem
campanha (`campanha_id NULL`) não tem sala — o emit é guardado (no-op).

---

## encontro (M7 — m7-01/m7-03)

O **Encontro de Combate**: ordem de iniciativa com a Cadência das criaturas intercalada, rodadas e
turnos, vida e condições dos combatentes, espelhado em tempo real na campanha. "Encontro" é o nome
do domínio; a tela se chama **"Iniciativa"**.

**Fonte única.** Vida/Energia e as condições derivadas de um combatente **com ficha** são as da
própria `ficha` — o encontro **não** guarda segunda cópia. Só o combatente **avulso** (sem ficha)
persiste vida no encontro (`vida_maxima_avulso`/`vida_atual_avulso`).

```sql
CREATE TABLE encontro (
  -- BaseEntity...
  campanha_id              INTEGER NOT NULL,  -- fk_encontro_campanha
  tipo_encontro_status_id  INTEGER NOT NULL,  -- fk_encontro_tipo_encontro_status
  nome                     VARCHAR NOT NULL,
  rodada_atual             INTEGER NOT NULL,  -- 0 enquanto MONTAGEM; 1+ quando ATIVO
  turno_indice             INTEGER NOT NULL   -- posição corrente em ordem_rodada (0-based)
);
-- ix_encontro_campanha: (campanha_id)
```

A invariante **um encontro não-encerrado por campanha** não vira índice parcial único: o predicado
precisaria resolver o id de `ENCERRADO` em `tipo_encontro_status`, e o PostgreSQL proíbe subquery
no `WHERE` de um índice (fixar o id numérico do seed seria frágil a qualquer reordenação da tabela
de referência). Quem arbitra é a `EncontroService`, que recusa criar um segundo encontro enquanto
houver um não-encerrado na campanha.

## encontro_combatente (M7 — m7-01/m7-03)

Um combatente é **ou** uma ficha (`ficha_id` preenchido — agente, criatura ou NPC) **ou** um avulso
(`ficha_id NULL` — inimigo improvisado digitado na sessão). `iniciativa` fica `NULL` até ser rolada
pelo jogador ou atribuída pelo mestre.

```sql
CREATE TABLE encontro_combatente (
  -- BaseEntity...
  encontro_id        INTEGER NOT NULL,  -- fk_encontro_combatente_encontro
  ficha_id           INTEGER,           -- fk_encontro_combatente_ficha (NULL = avulso)
  nome_avulso        VARCHAR,           -- obrigatório quando ficha_id IS NULL
  iniciativa         INTEGER,           -- NULL enquanto não rolada/atribuída
  cadencia           VARCHAR NOT NULL,  -- CadenciaEnum (SINGULAR quando não é criatura)
  turnos_por_rodada  INTEGER NOT NULL,  -- 1/2/3 nas fixas; >= 4 na Frenética
  ordem              INTEGER NOT NULL,  -- desempate estável definido pelo mestre
  vida_maxima_avulso INTEGER,           -- só avulso; ficha lê da própria ficha
  vida_atual_avulso  INTEGER,           -- só avulso
  condicoes          JSONB   NOT NULL   -- CondicaoCombatenteDto[] (nome, rodadasRestantes, perdeTurno)
);
-- ix_encontro_combatente_encontro: (encontro_id)
-- ix_encontro_combatente_ficha: (ficha_id)
-- uix_encontro_combatente_encontro_ficha_ativo:
--   UNIQUE (encontro_id, ficha_id) WHERE is_deleted = false AND ficha_id IS NOT NULL
--   → a mesma ficha não entra duas vezes no mesmo encontro
```

`condicoes` guarda os **marcadores** do encontro (`Sangramento · 2 rodadas`, `Inconsciente · perde
o turno`), com duração em rodadas e expiração automática na virada. Não confundir com as três
condições da ficha (`morrendo`/`machucado`/`inconsciente`, em `FichaEstadoDto`), que são **flags
alternadas manualmente** por quem joga — o motor nunca as recalcula a partir de `vidaAtual`
(m3-10: "o estado narrativo é refletido por quem joga, não travado pelo motor"). O encontro as
**lê** da ficha e as exibe, mas não as grava nem as deduz.

## encontro_evento (M7 — m7-01/m7-03, alimentado na m7-04)

Log do encontro — a trilha legível exibida no painel "Log da rodada" do mockup. `texto` já é a
frase pronta ("sofreu 11 de dano de V. Corvalho"); `rodada`/`turno` posicionam a entrada
(`R3`, `T3 · 2`).

```sql
CREATE TABLE encontro_evento (
  -- BaseEntity...
  encontro_id             INTEGER NOT NULL,  -- fk_encontro_evento_encontro
  encontro_combatente_id  INTEGER,           -- fk_encontro_evento_encontro_combatente (NULL = evento da rodada)
  tipo                    VARCHAR NOT NULL,  -- EncontroEventoTipoEnum
  rodada                  INTEGER NOT NULL,
  turno                   INTEGER NOT NULL,
  texto                   VARCHAR NOT NULL
);
-- ix_encontro_evento_encontro_rodada: (encontro_id, rodada)
```

**Emissão em tempo real (eventos `encontro:alterado` e `encontro:iniciativa-pedido`, sala
`campanha:<id>`).** Broadcast-only (§9): toda mutação entra por REST e a service emite **após**
salvar. Mudanças de vida de combatente com ficha continuam propagando pelo `ficha:alterada` já
existente. O contrato tipado vive em `shared/src/dtos/encontro/` (`m7-01`).

---

## Forma dos documentos JSONB (`ficha.dados`)

> A forma final de cada documento é definida nas specs de M3 (jogador) e M4 (criatura/NPC),
> derivada de `docs/core/sistema-v4.1.0.md` e `docs/core/guia_de_mestre-v4.0.0.md`. O
> contrato tipado vive em `shared/src/dtos/ficha/` (`FichaJogadorDadosDto` — **final**,
> m3-01; `FichaCriaturaDadosDto` — **final**, m4-01; `FichaNpcDadosDto` — design fechado a
> partir do capítulo "Guia de Criação de NPCs" do guia de mestre, contrato TS a codificar em
> `m4-05`) e o backend valida via `shared/regras` (coerência de domínio) + validação
> estrutural quando o `ValidationPipe` for ligado (m3-02/03). Campos de jogo nunca viram
> colunas — listagens usam `dados->>'campo'`.

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
  "anotacoes": "...",                 // m3-51: opcional, mesmo tratamento de "historia" abaixo —
                                      // só dono/mestre veem e editam; visualizador só-acesso nunca
                                      // recebe este campo (omitirCamposPrivados)
  "historia": "..."                   // m3-50: opcional, texto livre — só dono/mestre veem e
                                      // editam; um visualizador só-acesso nunca recebe este campo
                                      // (omitido em FichaService.recuperarFicha e no broadcast
                                      // ficha:alterada — omitirCamposPrivados, mesmo mecanismo
                                      // que a m3-51 reusa para "anotacoes")
}
```

**Sub-inventários próprios (m3-44 — Pochete/Bolso de Corpo).** `CarrinhoItemDto` ganhou dois campos
opcionais: `id?` (atribuído só a um item Armazenamento cujo catálogo marca `inventarioProprio` —
hoje Pochete/Bolso de Corpo, doc: "Possui inventário separado") e `containerId?` (aponta pro `id` do
container onde este item foi guardado). Um container vestido com `id` abre sua própria lista
(`listarSubInventarios`, `shared/regras/compras`): a capacidade vem do `bonus` do catálogo, e os
itens com `containerId` correspondente pesam só contra ela, nunca contra o inventário principal —
`calcularTotaisCarrinho` exclui os dois dos totais do pool principal. Containers de antes desta task
(sem `id`) continuam se comportando como um armazenamento comum até serem removidos/recriados.

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

### FichaCriaturaDadosDto (final — m4-01)

Contrato: `shared/src/dtos/ficha/ficha-criatura.dtos.ts`, exportado pelo subpath `./dtos/ficha`
(mesmo subpath de `FichaJogadorDadosDto`). Capítulo "Guia de Criação de Ameaças".

Criatura e NPC **não compartilham forma** (M4 fecha dois DTOs, não um com variação — a mecânica
divergiu). Segue a mesma filosofia de `FichaJogadorDadosDto`: tudo que aparece na ficha é
persistido (`m3-10`), Vida Máxima/Defesa são **snapshot na criação + editáveis depois** (o motor
não recalcula sobre a edição), sem Maestria (mecânica exclusiva de jogador).

```jsonc
{
  "identidade": {
    "designacao": "A Estátua",          // nome da criação
    "origem": "SCP_ADAPTADO",           // OrigemCriaturaEnum: SCP_ADAPTADO | ORIGINAL
    "conceito": "...",                  // "linha de conceito" — 1 frase, o gancho de criação
    "naturezaFisica": "...",
    "comportamento": "CACADORA",        // ComportamentoCriaturaEnum: CACADORA|TERRITORIAL|OPORTUNISTA|INDIFERENTE|INTELIGENTE|CAOTICA
    "motivacao": "...",
    "ganchoUnico": "...",
    "temaHorror": "..."                 // opcional
  },
  "na": "MEDIA",                        // NivelAmeacaEnum: NULA|BAIXA|MEDIA|ALTA|EXTREMA|CATASTROFICA|APOCALIPTICA
  "vd": 30,                             // Valor de Desafio — meta de design que orienta o resto da ficha
  "atributos": {                        // valor final (Base do VD + Pontos de Ajuste + Realocação); mesmos 10 campos do jogador
    "forca": 3, "destreza": 4, "luta": 5, "pontaria": 2, "vigor": 3,
    "intelecto": 2, "medicina": 2, "sentidos": 3, "social": 0, "vontade": 2
  },
  "modificadores": {                    // fixo: 2 FORTE / 3 MEDIO / 3 FRACO / 2 FRAGIL, um por atributo — valor atrelado ao VD
    "forca": "MEDIO", "destreza": "FORTE", "luta": "FORTE", "pontaria": "FRAGIL", "vigor": "MEDIO",
    "intelecto": "FRACO", "medicina": "FRACO", "sentidos": "MEDIO", "social": "FRAGIL", "vontade": "FRACO"
  },
  "tenacidade": "PADRAO",               // TenacidadeEnum: DESCARTAVEL|FRAGIL|PADRAO|ROBUSTA|RESISTENTE|IMPLACAVEL|ABSOLUTA
  "vidaMaxima": 1050,                   // snapshot: VD × multiplicador de Tenacidade (m3-10: editável depois)
  "vidaAtual": 1050,
  "defesa": 30,                         // snapshot: 15 + VD ÷ 2 (m3-10: editável depois) — criatura nunca reage a ataques
  "resistencias": [ { "tipo": "FISICO", "subtipo": null, "valor": 36 } ],   // soma ≤ Limite (2×VD; +25% por Fraqueza extra além da 1ª)
  "fraquezas":    [ { "tipo": "EXPLOSAO", "subtipo": null, "valor": 20 } ], // ao menos 1; mínimo 5 ou metade das resistências
  "regeneracao": {                      // opcional — campo ausente = sem regeneração
    "modo": "PASSIVA",                  // PASSIVA | CONDICIONAL
    "intensidade": "MODERADA",          // RESIDUAL|MODERADA|ALTA|SEVERA|IMPARAVEL
    "valor": 105,                       // absoluto — % da Vida Máxima calculado uma vez na criação
    "condicao": null                    // texto — obrigatório quando modo = CONDICIONAL
  },
  "porte": "MEDIO",                     // PorteCriaturaEnum: MINUSCULO|MEDIO|GRANDE|ENORME|GIGANTE|TITANICO|COLOSSAL
  "deslocamento": {                     // ao menos um modo declarado; cada campo é opcional
    "terrestre": 9, "voador": null, "aquatico": null, "sobrenatural": null
  },
  "cadencia": "SINGULAR",               // CadenciaEnum: SINGULAR|DUPLA|TRIPLICE|FRENETICA
  "turnosPorRodada": 1,                  // 1/2/3 nas fixas; valor declarado >= 4 na Frenética
  "iniciativaBonus": 0,                 // opcional — Habilidade Especial Passiva de +X somado à Iniciativa (~10% da VD, sugestão)
  "ataques": [
    { "nome": "Esmagamento", "atributo": "luta", "custoAcao": "PADRAO", // MOVIMENTO|PADRAO|COMPLETA
      "dano": "4D12+10", "tipoDano": "FISICO", "area": false,
      "efeito": "Vigor DT 20 ou Imobilizado por 1 turno" }             // opcional — reduz 1 patamar de dano quando presente
  ],
  "habilidades": [
    { "nome": "Imobilidade Absoluta", "tipo": "PASSIVA",               // PASSIVA|ATIVA|GATILHO
      "descricao": "...", "restricao": null }
  ],
  "anotacoes": "..."                    // opcional, mesmo tratamento privado do jogador (dono/mestre)
}
```

### FichaNpcDadosDto (design fechado — capítulo "Guia de Criação de NPCs" — codificar no M4)

O NPC é descrito no guia como uma "versão otimizada" da estrutura de agente: mesmos dez atributos,
Vida e reações, mas o teto de tudo vem da **Categoria** em vez de classe/Nível livre. Mesma
filosofia de `m3-10` — Vida/Defesa/Energia são snapshot editável, nunca recalculados sobre a
edição.

```jsonc
{
  "identidadeNarrativa": {
    "nome": "...",
    "funcao": "..."                     // propósito operacional / relevância no arco
  },
  "categoria": "VETERANO",              // CategoriaNpcEnum: CIVIL|OPERATIVO|VETERANO|ELITE|LENDARIO — teto de poder
  "nivel": 8,                           // 0–20; funciona como Proficiência (ataque, Defesa, DT)
  "cooperacao": 6,                      // 0–10, estado ATUAL — mutável em jogo pelas regras padrão, não fixo pós-criação
  "atributos": {                        // mesmos 10 campos do jogador; cap por Categoria arbitrado por shared/regras (Veterano: 4)
    "forca": 2, "destreza": 3, "luta": 4, "pontaria": 2, "vigor": 3,
    "intelecto": 2, "medicina": 1, "sentidos": 1, "social": 1, "vontade": 2
    // só a Categoria Civil trava Luta/Pontaria em 0 por padrão; exceção justificada (ex-militar) desbloqueia manualmente
  },
  "vidaMaxima": 245,                    // snapshot: Base(25) + (Nível 8 + VIG 3) × Multiplicador(20) da Categoria (m3-10: editável depois)
  "vidaAtual": 245,
  "defesaBase": 18,                     // snapshot: 10 + Nível (m3-10: editável depois)
  "bloquear": 21,                       // snapshot: Defesa Base + VIG
  "esquivar": 21,                       // snapshot: Defesa Base + DES
  "energia": {                          // modelo depende da Categoria; ausente/zerado para Civil
    "maxima": 21,                       // Veterano = Reserva Fixa: 12 + DES × 3; Elite/Lendário usam Pool + Recarga
    "atual": 21,
    "recargaPorTurno": null             // só Elite/Lendário (modelo Pool + Recarga); null nos demais
  },
  "sanidade": {                         // esquema análogo a estado.sequelas/traumas do jogador; efeito a critério do Mestre
    "sequelas": [], "traumas": []
  },
  "habilidades": [
    { "nomeNeutro": "Disparo de Supressão", "nomeNarrativo": "Cabeça Abaixada", // narrativo opcional
      "tipo": "ATIVA",                  // PASSIVA | ATIVA
      "custoEnergia": 4,                // só Ativas; ausente/null em Passiva
      "descricao": "...", "restricao": null }
  ],
  "condutaCombate": {                   // roteiro "Conduta de Combate" do guia
    "gatilhosFuga": "...",
    "prioridadesAlvo": "...",
    "reacaoFerimentoSevero": "..."
  },
  "anotacoes": "..."                    // opcional, mesmo tratamento privado do jogador (dono/mestre)
}
```

**DT de atributo não é persistida.** Diferente dos `derivados.dtAtributo` do jogador (um único
valor stored), a DT de um NPC é `10 + Nível + (Atributo × 2)` e varia por **qual** atributo o
contexto exige (Vontade para manipulação, VIG para pressão física…) — `shared/regras/npc` calcula
sob demanda, nunca persiste um valor único.
