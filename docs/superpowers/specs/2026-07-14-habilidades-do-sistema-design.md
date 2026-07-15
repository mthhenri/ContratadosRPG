# Habilidades do Sistema na Ficha — Design

> Data: 2026-07-14 · Milestone: M3 (ficha de jogador) · Alvo de fidelidade visual:
> stub `scratchpad/habilidades-stub.html` (tema "Terminal de Contenção").

## Problema

A aba **Habilidades** da ficha (m3-13) só permite adicionar habilidade por **texto livre**.
O jogador precisa usar as **habilidades do sistema** (documento `sistema-v4.1.0.md`), então
falta poder **escolher uma habilidade do catálogo** e adicioná-la à ficha. Além disso, o jogador
quer **utilizar** uma habilidade gastando a Energia automaticamente.

## Princípios herdados (não renegociar)

- **Fonte única de regras**: o catálogo vem do `sistema-v4.1.0.md`; se código e documento
  divergirem, o documento vence (proibições #26/#27).
- **Sem mudança de schema**: a ficha guarda a habilidade **desnormalizada** (`FichaHabilidadeDto`
  — contrato m3-01). O catálogo apenas **preenche** esse formato; nada de FK/tabela nova.
- **Edição no próprio lugar** e persistência otimista em lote (m3-10) — reusar, não recriar.
- **Só tokens do tema** nos estilos (proibição #29).
- **Regras puras em `shared/regras`** (frontend e backend consomem a mesma fonte).

## Escopo do catálogo

O catálogo cobre **todas** as habilidades **ativas** enumeradas no documento:

| Origem | Categoria (`HabilidadeCategoriaEnum`) | Observação |
|---|---|---|
| Habilidades Gerais (~59) | `GERAL` | valem para qualquer agente |
| Gerais Melhoradas (por arquétipo) | `GERAL_MELHORADA` | variação buffada de uma Geral, específica de um arquétipo |
| Habilidades de Classe (Combatente/Especialista/Suporte) | `CLASSE` | por classe-base |
| Habilidades de Arquétipo (9 arquétipos) | `ARQUETIPO` | por arquétipo |
| Habilidades de Subclasse (Experimento Bestial/Artificial/Híbrido) + Inicial | `SUBCLASSE` | por Experimento |

**Fora do catálogo (só criadas):** `PERSONALIDADE` e `ESPECIALIDADE` — não existe lista delas
no sistema; aparecem apenas no dropdown da adição **Personalizada**. `ESPECIALIDADE` **não existe
ainda** no enum e será adicionada.

Mapeamento Experimento → classe-base (as habilidades de classe acessíveis): Bestial → Combatente,
Artificial → Especialista, Híbrido → Suporte.

## Regras de visibilidade (o que o seletor mostra)

Nos **níveis 5/10/15/20** o agente ganha habilidade de **outra classe** ou de **outro arquétipo da
sua classe**. Isso define o alcance de cada aba:

- **Classe** — navegável entre **todas** as classes-base (o pick de "outra classe"). Sua classe
  em destaque; as demais acessíveis pelo sub-filtro.
- **Arquétipo** — **só os arquétipos da classe da ficha** (o pick de "outro arquétipo da sua
  classe"). **Não** lista arquétipos de outras classes. Se a ficha é um **Experimento**, a aba
  inclui também a **própria subclasse** (ela ocupa o nível de arquétipo).

Exceções de visibilidade:

1. **Gerais Melhoradas**: só as do **próprio arquétipo** da ficha aparecem. As de outros
   arquétipos **nunca** são exibidas. (Experimentos não têm melhoradas.)
2. **Subclasse (Experimento)**: as habilidades de subclasse **só** aparecem para a **própria**
   subclasse. Outras subclasses **nunca** aparecem (nem entre si, nem para classe-base). Uma ficha
   Experimento vê os arquétipos regulares **da sua classe-base** + a sua subclasse, e nunca outras
   subclasses.

## Arquitetura

### 1. Dados + regra pura (`shared/regras/agente`)

**`habilidades-catalogo.dados.ts`** — o catálogo transcrito fielmente do documento, desnormalizado:

```ts
interface HabilidadeCatalogoDto {
  readonly nome: string;
  readonly custoEnergia: number | null;   // null = custo variável [X E]
  readonly descricao: string;
  readonly categoria: HabilidadeCategoriaEnum;
}
```

Organização interna (constantes puras):
- `HABILIDADES_GERAIS: HabilidadeCatalogoDto[]`
- `HABILIDADES_CLASSE: Record<ClasseEnum, HabilidadeCatalogoDto[]>` (classes-base; Experimentos e
  Civil apontam para a lista da classe-base ou vazio)
- `HABILIDADES_ARQUETIPO: Record<ArquetipoEnum, HabilidadeCatalogoDto[]>`
- `HABILIDADES_GERAIS_MELHORADAS: Record<ArquetipoEnum, HabilidadeCatalogoDto[]>`
- `HABILIDADES_SUBCLASSE: Record<ClasseEnum, HabilidadeCatalogoDto[]>` (só as três Experimento)

**`habilidades-catalogo.ts`** — função pura que resolve os grupos de filtro para uma ficha:

```ts
interface GrupoHabilidades {
  readonly id: string;                 // 'gerais' | 'classe' | 'arquetipo'
  readonly rotulo: string;             // 'Gerais' | 'Classe' | 'Arquétipo'
  readonly subgrupos: SubgrupoHabilidades[];
}
interface SubgrupoHabilidades {
  readonly chave: string;              // ClasseEnum | ArquetipoEnum
  readonly rotulo: string;             // 'Combatente' | 'Lutador' | ...
  readonly ehDaFicha: boolean;         // marca o destaque leve + ativo por padrão
  readonly habilidades: HabilidadeCatalogoDto[];  // já com as Melhoradas do arquétipo da ficha, quando aplicável
}

function catalogoHabilidades(classe: ClasseEnum, arquetipo: ArquetipoEnum | null): GrupoHabilidades[]
```

Comportamento:
- Grupo **Gerais**: um subgrupo único (as ~59).
- Grupo **Classe**: um subgrupo por classe-base; o da ficha com `ehDaFicha=true`.
- Grupo **Arquétipo** (limitado à classe da ficha):
  - Se a ficha é **classe-base**: um subgrupo por arquétipo **daquela classe** (ex.: Combatente →
    Lutador/Mercenário/Vanguarda). No subgrupo do **arquétipo da ficha**, anexa as **Gerais
    Melhoradas daquele arquétipo**; `ehDaFicha=true` nele.
  - Se a ficha é **Experimento**: um subgrupo para a **própria subclasse** (`ehDaFicha=true`) +
    os subgrupos dos arquétipos **da classe-base** (ex.: Bestial → Combatente:
    Lutador/Mercenário/Vanguarda). **Sem** as outras subclasses. **Sem** melhoradas.
  - Se a ficha é **Civil / sem arquétipo**: grupo Arquétipo pode vir vazio (omitido na UI).
- Grupos/subgrupos vazios são omitidos.

### 2. Enum (`shared/enums`)

Adicionar `ESPECIALIDADE = 'ESPECIALIDADE'` a `HabilidadeCategoriaEnum` e o rótulo
`'Especialidade'` em `ROTULOS_HABILIDADE_CATEGORIA`. (Categoria só-criada, sem catálogo.)

### 3. UI (`frontend`)

**`FichaHabilidades`** (existente) ganha:
- inputs `classe: ClasseEnum` e `arquetipo: ArquetipoEnum | null` (a página já os tem em `dados`);
- input `energiaAtual: number` (para o Utilizar);
- dois botões de adição no cabeçalho: **＋ Do sistema** (accent) e **＋ Personalizada** (o
  fluxo de texto livre atual, intacto);
- output `habilidadeUtilizada = output<number>()` — emite o custo gasto; a página aplica ao
  `energiaAtual` reusando o caminho de `ajusteVitalidade` (persistência de m3-10).

**`FichaHabilidadeSeletor`** (novo subcomponente standalone):
- Recebe os `GrupoHabilidades[]` (via `catalogoHabilidades`) e a lista atual da ficha (para marcar
  "Na ficha").
- **Abas**: Gerais / Classe / Arquétipo (só as que têm conteúdo).
- **Sub-filtro inline** (chips) dentro de Classe e Arquétipo: um chip por subgrupo; o subgrupo
  **da ficha** com destaque leve permanente (ponto ● + borda accent) e **ativo por padrão**; o
  chip ativo em estado selecionado forte. Sem dropdown.
- **Busca** por nome, no escopo ativo (aba + sub-filtro).
- Escolher uma habilidade **fecha o seletor e pré-preenche o editor inline** existente
  (nome/categoria/custo/descrição), **editável antes de salvar** — reusa `habilidadeForm` e a
  persistência. Item já presente na ficha aparece esmaecido com selo "Na ficha".

**Botão ⚡ Utilizar** em cada habilidade da lista (dono/mestre — mesma audiência da edição):
- Custo **fixo** (`custoEnergia` número): emite `habilidadeUtilizada(custo)`; a página faz
  `energiaAtual -= custo` (pode **negativar** — regra do documento) e persiste.
- Custo **variável** (`[X E]`, `custoEnergia === null`): abre um **mini-campo** perguntando quanto
  gastar; ao confirmar, emite esse valor.

### 4. Wiring da página (`visualizar.page` / `FichaVisualizacao`)

- Passa `classe`/`arquetipo`/`energiaAtual` para `FichaHabilidades`.
- Trata `habilidadeUtilizada`: novo `energiaAtual = energiaAtual - custo`, reusando o
  `ajusteVitalidade`/`ajustarVitalidade` já existente (otimista + PUT em lote). Sem novo caminho
  de persistência.

## Fluxo de dados

```
Documento (sistema-v4.1.0.md)
  → habilidades-catalogo.dados.ts   (transcrição fiel, desnormalizada)
  → catalogoHabilidades(classe, arquetipo)   (regra pura, grupos+subgrupos)
  → FichaHabilidadeSeletor (abas + sub-filtro inline + busca)
  → escolher → pré-preenche habilidadeForm → salvar → habilidadesMudou (lista inteira)
  → visualizar.page persiste (alterarFicha, m3-10)

Utilizar → habilidadeUtilizada(custo) → energiaAtual -= custo → ajusteVitalidade → persiste
```

## Testes

**`shared` (`habilidades-catalogo.spec`):**
- `catalogoHabilidades` para Combatente/Lutador: grupo Arquétipo traz **apenas** os arquétipos de
  Combatente (Lutador/Mercenário/Vanguarda) — nenhum de outra classe; o subgrupo Lutador com
  `ehDaFicha=true` **incluindo** as Gerais Melhoradas do Lutador, e Mercenário/Vanguarda **sem**
  melhoradas.
- Para Experimento Bestial: grupo Classe traz Combatente como `ehDaFicha` (+ demais classes); grupo
  Arquétipo traz o subgrupo Bestial (`ehDaFicha`) + os arquétipos da classe-base Combatente, e
  **nenhuma** outra subclasse (Artificial/Híbrido ausentes) nem arquétipo de outra classe.
- Contagens conferem com o documento (nº de Gerais, de habilidades por classe/arquétipo).
- Toda entrada do catálogo tem `nome` não vazio e `custoEnergia` `number>=0` ou `null`.

**`frontend`:**
- `FichaHabilidadeSeletor`: troca de aba; sub-filtro inline destaca o da ficha e é o ativo
  inicial; busca filtra no escopo; item já na ficha vem esmaecido; escolher emite/pré-preenche.
- `FichaHabilidades`: botão "Do sistema" abre o seletor; Utilizar de custo fixo emite o custo;
  Utilizar de custo variável abre o mini-campo e emite o valor digitado.
- `visualizar.page`: `habilidadeUtilizada` reduz `energiaAtual` (inclusive negativando) e persiste.

## Fora de escopo (conscientemente)

- **Trava de regras** (limite de habilidades iniciais, pré-requisitos de nível, limite por turno
  como bloqueio) — liberdade total de m3-10; o seletor é conveniência, não validação.
- **Progressão automática** (desbloquear por nível) — o jogador escolhe manualmente.
- **Habilidades passivas / iniciais automáticas** — não são adicionadas sozinhas.
- **Backend**: nenhuma mudança (o contrato do `dados` JSONB não muda; a validação de forma
  existente basta).

## Faseamento sugerido (para o plano)

A maior parte do esforço é **transcrição de dados** (~224 habilidades de tabelas densas). Fatiar:
1. Enum `ESPECIALIDADE` + `HABILIDADES_GERAIS` + `catalogoHabilidades` (grupo Gerais) + testes.
2. `HABILIDADES_CLASSE` + grupo Classe com sub-filtro.
3. `HABILIDADES_ARQUETIPO` + `HABILIDADES_GERAIS_MELHORADAS` + grupo Arquétipo.
4. `HABILIDADES_SUBCLASSE` (Experimentos) + regra de visibilidade de subclasse.
5. UI: `FichaHabilidadeSeletor` + botões de adição + integração no editor inline.
6. Botão Utilizar (fixo + variável) + wiring de Energia na página.
