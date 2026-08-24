# formatacao-legibilidade-frontend.spec.md

> Spec avulsa, fora da fila de milestone. Corrige `PROBLEMS.md` `P-020` (**CRÍTICO** ·
> qualidade/manutenibilidade) — arquivos de template HTML/Angular e folhas SCSS/CSS do
> `frontend` contêm blocos extensos compactados em uma única linha, dificultando revisão
> humana e favorecendo edição do elemento errado.

## Objetivo

Tornar todo `.html`/`.scss` de `frontend/src` legível por leitura direta — sem depender de
formatador do editor nem de "descompactação mental" — preservando comportamento e
identidade visual exatamente como estão hoje. É refatoração pura de formatação: nenhuma
regra de negócio, contrato, classe/id usado por teste, marcação semântica ou seletor CSS
muda de sentido.

Escopo explicitamente **não inclui** `.ts` — ver "Fora de Escopo".

## Inventário confirmado (linha mais longa por arquivo, `frontend/src`)

Levantado nesta sessão (`awk '{print length}'`), arquivos com pelo menos uma linha
> 150 caracteres — piso abaixo do qual uma linha ainda é seguida a olho:

**HTML (5 arquivos com linha > 300 chars, 20 no total > 150):**
- `usuario/paginas/gestao/gestao.page.html` — pior linha 2158 chars.
- `ficha/componentes/ficha-inventario/ficha-inventario.component.html` — 663.
- `ficha/paginas/criar/criar.page.html` — 397.
- `ficha/paginas/criar-criatura/criar-criatura.page.html` — 372.
- `usuario/paginas/perfil/perfil.page.html` — 309.
- mais 15 arquivos entre 150–300 chars (listar de novo com o comando abaixo antes de
  começar, o inventário pode ter mudado desde este levantamento).

**SCSS (9 arquivos com linha > 300 chars):**
- `ficha/paginas/criar/criar.page.scss` — pior linha 2815 chars.
- `usuario/paginas/gestao/gestao.page.scss` — 2581.
- `ficha/paginas/criar-criatura/criar-criatura.page.scss` — 2259.
- `pagina-caderno/caderno-flutuante.component.scss` — 658.
- `campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.scss` — 381.
- `shared/inventario-esquadrao-sidebar/inventario-esquadrao-sidebar.component.scss` — 366.
- `ficha/componentes/criatura-resistencia-lista/criatura-resistencia-lista.component.scss` — 322.
- `ficha/componentes/criatura-habilidade-lista/criatura-habilidade-lista.component.scss` — 322.
- `ficha/componentes/criatura-ataque-lista/criatura-ataque-lista.component.scss` — 322.

Comando para reconferir o inventário no início da task (a lista acima pode estar
desatualizada por trabalho concorrente):

```bash
for f in $(find frontend/src -name "*.html" -o -name "*.scss"); do
  maxlen=$(awk '{print length}' "$f" | sort -rn | head -1)
  [ "$maxlen" -gt 150 ] && echo "$maxlen $f"
done | sort -rn
```

Nenhum `.prettierrc`/`prettier.config.*` existe hoje no repositório — o projeto nunca teve
formatador automático configurado para HTML/SCSS.

## Decisão de ferramenta

Adotar **Prettier**, escopado **somente a `.html` e `.scss`** — nunca a `.ts`/`.tsx`. O
autor considera a formatação padrão do Prettier para TypeScript ruim e quer manter estilo
próprio nesses arquivos; a config precisa impedir que rodar Prettier no repo (localmente,
em editor com "format on save", ou futuramente em CI) toque em qualquer `.ts`.

Mecanismo: `overrides` no `.prettierrc` com um bloco para `*.ts`/`*.tsx` usando
`"requirePragma": true` — isso faz o Prettier **ignorar por padrão** qualquer arquivo
TypeScript que não tenha o comentário mágico `/** @format */` no topo. Como nenhum `.ts`
do projeto vai ganhar esse pragma, `.ts` fica protegido mesmo que alguém rode
`prettier --write .` no repositório inteiro sem pensar. Para reforço, o `.prettierignore`
também lista `**/*.ts` e `**/*.tsx` explicitamente (defesa em profundidade — não depender
só do pragma).

### Config proposta (`frontend/.prettierrc.json`)

```json
{
  "printWidth": 100,
  "tabWidth": 4,
  "useTabs": false,
  "singleQuote": true,
  "htmlWhitespaceSensitivity": "css",
  "overrides": [
    { "files": ["*.ts", "*.tsx"], "options": { "requirePragma": true } }
  ]
}
```

`tabWidth: 4` — o autor prefere indentação de 4 espaços a 2 (fora do padrão default do
Prettier); vale conferir visualmente que blocos aninhados de HTML/SCSS (Angular tende a
aninhar bastante: `@if`/`@for`, diálogos, cards dentro de cards) não ficam raso demais de
espaço horizontal com 4 espaços por nível antes de fechar a task — se um arquivo muito
aninhado (ex. `criar.page.html`, vários passos do guia) estourar `printWidth` só por causa
da indentação acumulada, decidir com o autor entre aceitar a quebra de linha resultante ou
revisar `printWidth` para cima.

`printWidth: 100` casa com o padrão de linha do resto do código TypeScript do projeto
(quebra próxima de 100–120 chars nos arquivos bem formatados já existentes) — confirmar
esse número olhando 2–3 arquivos `.ts` bem escritos do projeto antes de fixar, e ajustar se
não bater. `htmlWhitespaceSensitivity: css` evita que o Prettier insira/remova espaço em
branco significativo ao redor de tags inline do Angular (interpolação `{{ }}`, `<span>`
dentro de texto) — checar visualmente que nenhum espaço de template mudou de fato depois de
formatar (ver "Critérios de Aceite").

### `.prettierignore` (`frontend/.prettierignore`)

```
dist/
node_modules/
**/*.ts
**/*.tsx
```

### Script novo (`frontend/package.json`)

```json
"format:html-scss": "prettier --write \"src/**/*.{html,scss}\""
```

Sem hook de pre-commit novo, sem gate de CI novo — a task só formata o que existe hoje;
manter formatado no futuro é decisão separada, fora desta spec (registrar como ideia em
`IDEAS.md` se o autor quiser depois).

## Entregáveis

1. `frontend/.prettierrc.json` e `frontend/.prettierignore` criados conforme acima (ajustar
   `printWidth` se a inspeção de `.ts` existentes sugerir outro número — registrar a
   escolha final e o porquê no fecho da task).
2. Script `format:html-scss` em `frontend/package.json`.
3. **Todo** `.html` e `.scss` de `frontend/src` (o inventário completo reconferido no início
   da task, não só a lista acima) passado pelo Prettier com essa config.
4. Nenhum `.ts`/`.tsx` tocado — confirmar com `git diff --stat` que o diff final só lista
   `.html`/`.scss`/os dois arquivos de config/o script novo.
5. Corte revisável: **um commit por área/módulo** (ex.: `usuario`, `ficha/paginas/criar`,
   `ficha/paginas/criar-criatura`, `ficha/componentes/*`, `campanha/*`, `shared/*`, restante),
   não um único commit gigante — a spec pede explicitamente cortes revisáveis
   (`AGENTS.md` "Gate obrigatório de qualidade e conclusão").

## Critérios de Aceite

- `npm run format:html-scss -w frontend` roda limpo (sem erro de parse do Prettier em
  nenhum arquivo — um SCSS/HTML com sintaxe que o Prettier não entende é sinal de bug
  real a investigar antes de seguir, não a pular).
- Reconferir o inventário do início: **zero** arquivo `.html`/`.scss` de `frontend/src` com
  linha > 150 caracteres depois do corte (fora casos que o próprio Prettier legitimamente
  não quebra — ex.: uma URL longa de atributo — documentar exceção pontual se aparecer).
- `npm run lint -w frontend`, `npm run test -w frontend` e `npm run build -w frontend`
  continuam verdes, nos mesmos números de teste de antes da task (nenhum teste deveria
  quebrar — é reformatação, não mudança de marcação/seletor).
- **Gate visual obrigatório** (skill `verify`, `1920×1080` e `360×800`): abrir a aplicação
  real e navegar pelas telas dos arquivos tocados — no mínimo Gestão de Usuários
  (`gestao.page`), guia de criação de ficha de Agente (`criar.page`), guia de criação de
  Criatura (`criar-criatura.page`), Inventário da ficha (`ficha-inventario`), Perfil
  (`perfil.page`) e as listas de Criatura (`criatura-*-lista`) — confirmar pixel a pixel
  que nada mudou visualmente (a reformatação de SCSS é a mais arriscada: uma vírgula ou
  chave reposicionada errado pelo formatador pode alterar cascata/seletor sem quebrar
  build nem lint). Comparar com captura de referência do estado atual (antes do corte) para
  cada tela, não só "parece certo".
- Cada arquivo tocado, aberto no editor sem nenhum formatador rodando, é compreensível por
  leitura direta: sem linha que exija scroll horizontal para ler, blocos/regras separados
  visualmente, indentação reproduzindo a hierarquia real do DOM/cascata.
- `PROBLEMS.md` `P-020` sai da lista de Ativos (com nota curta em "Resolvidos"); `HISTORY.md`
  ganha o bloco desta task no topo, incluindo a decisão de ferramenta e o
  `printWidth` final escolhido.

## Fora de Escopo

- Qualquer arquivo `.ts`/`.tsx` — nem passar pelo Prettier, nem reformatar manualmente
  nesta task. Ilegibilidade de `.ts`, se existir, é problema separado (não é o que `P-020`
  descreve — o sintoma registrado é HTML/SCSS).
- Mudança de marcação (reordenar elementos, trocar tags), de regra CSS (renomear classe,
  mudar valor de token, mudar seletor semanticamente) ou de qualquer comportamento visual.
  Se ao formatar um arquivo aparecer uma oportunidade óbvia de limpeza estrutural (ex.:
  extrair um bloco repetido), **não fazer** — anotar como ideia separada, não misturar ao
  diff desta task.
- Hook de pre-commit, gate de CI ou qualquer mecanismo que **force** formatação futura —
  esta spec só formata o que existe hoje.
- Arquivos `.html`/`.scss` fora de `frontend/src` (ex.: nenhum backend/shared usa esses
  formatos).
- Backend e shared — `P-020` como registrado é só sobre frontend.

## Dependências

- Nenhuma spec ativa depende deste corte nem é bloqueada por ele. Pode ser feito a
  qualquer momento; recomendado fazer **antes** de outra task grande tocar
  `gestao.page`/`criar.page`/`criar-criatura.page` (os três piores arquivos), para não
  competir por diff na mesma área.

## Riscos e Mitigação

- **Formatador reordena/altera cascata SCSS silenciosamente.** Mitigado pelo gate visual
  pixel a pixel nos dois viewports, tela por tela, comparado contra o estado atual.
- **`printWidth` genérico não combina com o estilo real dos `.ts` do projeto,** mesmo não
  tocando `.ts` — se o número escolhido deixar HTML/SCSS com uma "voz" visualmente
  destoante do resto do código, ajustar antes de fechar a task (é decisão de gosto do
  autor, não perfeição técnica).
- **Corte grande demais para revisar de uma vez.** Mitigado pelos commits por
  área/módulo (entregável 5) — cada commit deve poder ser revisado e revertido
  independentemente dos demais.
