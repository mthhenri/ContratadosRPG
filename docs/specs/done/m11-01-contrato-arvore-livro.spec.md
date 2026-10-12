# m11-01-contrato-arvore-livro.spec.md

> **Concluída em 2026-10-10.** Decisões do mapeamento aprovadas pelo autor (D1–D6) e D8 (apresentação
> das grades como dado da peça, para não perder o visual atual). Verificação no fecho de
> `docs/context/HISTORY.md`.

> Task 1/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Primeira
> peça da Oficina das Regras: o contrato tipado da árvore de peças, que todas as outras tasks
> (migration, importador, publicação, comparador, editor) consomem.

## Objetivo

Definir no `shared/` o contrato da árvore de um livro: tipos de peça, o `dados` de cada tipo, o
envelope da fotografia (`conteudo` de `livro_versao`) e um validador puro. Os tipos do leitor de
Regras (`frontend/src/app/modules/regras/regras.model.ts`) passam a vir daí, sem mudar o que o
leitor renderiza hoje.

## Entregáveis

1. **Tipos de peça.** Enum `TipoRegraPecaEnum` em `shared/src/enums/` com os códigos de
   `tipo_regra_peca` da umbrella (`SECAO`, `PARAGRAFO`, `NOTA`, `LISTA`, `TABELA`, `CLASSE`,
   `ARQUETIPO`, `SUBCLASSE`, `ORIGEM`, `HABILIDADE`, `EQUIPAMENTO`, `MODIFICACAO`, `CONDICAO`,
   `TERMO`, `FICHA_CRIATURA`, `ROTEIRO`…). A lista final sai do mapeamento do item 2 — todo bloco
   de `RegrasBloco` precisa ter destino (peça própria ou conteúdo de uma peça).
2. **Mapeamento documentado** `RegrasBloco`/`RegrasSecao` → peça, em
   `docs/specs/done/m11-01-contrato-arvore-livro/mapeamento.md` (anexo): para cada tipo atual,
   se vira peça ou fica em `dados` de uma peça-mãe, aplicando a regra da umbrella ("tem identidade
   → peça; só conteúdo → `dados`"). Blocos estruturais de apresentação (`grade`, `faixas`,
   `generico`, `capa`, `abertura`) têm decisão explícita, para o autor revisar.
3. **`dados` por tipo** como interfaces em `shared/` (DTOs de value object, nome do conceito +
   `Dto`, sem herança entre DTOs de negócio — ver skill `dto-conventions`). O texto rico continua
   o `RegrasTrecho` atual, movido para o `shared/`.
4. **Envelope da fotografia**: `LivroVersaoConteudoDto` — `formato` (inteiro, versão do contrato),
   metadados do livro e a árvore de peças, cada uma com `identificador`, `ancora`, `tipo`, `ordem`,
   `dados` e `filhos`. O link interno do texto rico referencia `identificador`; a âncora é
   resolvida na montagem da fotografia (a resolução em si é `m11-04`, aqui só o tipo).
5. **Validador puro** `validarArvoreLivro(...)` em `shared/`, sem dependências: `identificador`
   único, `ancora` única por livro, filho permitido para o pai (dentro de classe só arquétipo etc.,
   tabela de regra de aninhamento), `dados` coerente com o tipo, link interno apontando para
   `identificador` existente. Devolve lista de problemas tipada (não lança), pronta para virar a
   contagem de pendências da Oficina.
6. **Leitor aponta para o `shared/`.** `regras.model.ts` passa a importar o texto rico
   (`RegrasTrecho` = `LivroTrechoDto`) do `shared/`. O restante do modelo (`RegrasBloco`,
   `RegrasSecao`, campos de auditoria da fonte) é o formato de **renderização** do leitor, produzido
   pelo normalizador; ele só é substituído na `m11-04`, quando o leitor passar a montar a árvore a
   partir da fotografia. Nenhuma mudança de renderização nem do JSON gerado por
   `normalizar-regras.mjs`; o JSON atual continua sendo a entrada do leitor até a `m11-04`.

## Critérios de Aceite

- `npm run test --workspace=shared` verde, com testes novos do validador (ok, `identificador`
  duplicado, `ancora` duplicada, filho inválido, link quebrado, `dados` incoerente com o tipo).
- Uma fixture construída a partir de um trecho real do Sistema (uma classe com arquétipos e
  habilidades) valida sem problemas; a mesma fixture quebrada de cada jeito acima devolve o
  problema esperado.
- `npm run lint` nos três workspaces e `npm run build --workspace=shared` verdes; build do
  frontend verde (garante que o leitor compila com os tipos vindos do `shared/`).
- Sem diferença no leitor: testes existentes de `modules/regras` passam sem alteração de
  expectativa. Não há UI nova, logo sem gate visual.
- `npm run repo:verificar` limpo.

## Fora de Escopo

Migration, repositórios e importador (`m11-02`/`m11-03`); montar fotografia, API e papéis
(`m11-04`); comparador (`m11-05`); qualquer UI; mudar o JSON que o leitor consome; alterar
`shared/regras` (motor), que não é tocado por editar texto.

## Dependências

Nenhuma task anterior. Fontes: umbrella (decisões e modelagem), anexo `m11-modelagem.html`,
`regras.model.ts` e `normalizar-regras.mjs` (comportamento atual), skill `dto-conventions`,
`SYSTEM.SPEC.md` §6 (o que pode viver no `shared/`; `regras/` é só do motor — a árvore do livro
vai em pasta própria, p.ex. `shared/src/livro/`, e os DTOs em `shared/src/dtos/livro/`).

## Riscos e Mitigação

- **Estrutura muito fiel ao leitor atual.** O `RegrasBloco` mistura apresentação (`grade`,
  `faixas`) e conteúdo; copiar 1:1 para `dados` engessa a Oficina. O mapeamento do item 2 é o
  ponto de decisão do autor antes de escrever tipos.
- **Peça demais ou de menos.** Regra de corte da umbrella (identidade → peça); casos duvidosos
  (item de equipamento, linha de termo) listados no anexo com a escolha e o motivo.
