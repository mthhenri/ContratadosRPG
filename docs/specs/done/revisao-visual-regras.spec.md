# revisao-visual-regras.spec.md

> Task solta, pedida pelo autor em 08/10/2026 depois de uma revisão visual da página de Regras
> contra o exemplão da M10 (`docs/specs/done/m10-regras/m10-regras-exemplao.html`). Auditoria e
> verificação em `revisao-visual-regras/`.

## Objetivo

Corrigir os blocos do Sistema que a página de Regras publica ilegíveis ou errados e aproximar os
blocos ricos do exemplão aprovado. Energia passa a ser lida em azul e Vida em vermelho em toda a
página, inclusive no texto corrido. O botão Regras da topbar volta ao ícone de livro aberto.

## Decisões do autor (08/10/2026)

- Ícone da topbar: `documentos` (livro aberto, o do antigo botão Documentos). A decisão M10-04
  sobre o logo SCP oficial continua valendo.
- Cor de recurso: Energia `--energy` e Vida `--vida` nos blocos de dado **e** no texto corrido.
- `app-chip` ganha as severidades `energia` (`--energy`) e `ajuda` (`--help`), com a mesma
  receita das outras. Custo de habilidade usa `energia` e Reação usa `ajuda`.
- `app-stat` ganha uma variante opcional com faixa lateral, rótulo na cor da variante e ícone em
  quadro tingido (`.st` do exemplão). As telas que não usam o input continuam iguais.
- As abas de arquétipo continuam no `app-abas` canônico; só o painel passa para 2 colunas.
- O fundo claro de NA Extrema/Catastrófica é decisão da M10-04 e não é tratado como defeito.

## Entregáveis

1. **Topbar:** o botão Regras usa `app-icone nome="documentos"` em todos os viewports.
2. **Referências de imagem:** as definições `[imageN]: <data:...>` do fim do Sistema não viram
   blocos publicados. Os cartões de NA continuam com a marca própria.
3. **NA falso:** `marcarNiveis` só reconhece o prefixo `NA` em maiúsculas. "na média" no texto
   corrido volta a ser texto.
4. **Quebra de linha:** a quebra dura do Markdown (`br`) vira quebra visível no parágrafo e a
   quebra mole volta a ser espaço, como no Markdown.
5. **Abertura:** os parágrafos iniciais em itálico, a partir de ">>>> Registro de documentação
   oficial", viram um bloco `abertura` com o cartão centralizado do exemplão (`.capa`), nos dois
   livros.
6. **Termos:** um bloco `termos` (nome, rótulo opcional, descrição, número opcional) substitui o
   texto achatado de:
   - Atributos: 10 termos, cada um com rótulo "Atributo Físico/Mental";
   - Maestrias: 10 termos com o nome sempre destacado, inclusive Luta e Social;
   - Penalidades de Energia: 12 termos numerados na ordem 1–12, na grade `.t12` do exemplão;
   - Sequelas: cada `▢ Nome` com a descrição seguinte vira um termo, inclusive Paranoia e Letargia,
     que a fonte junta num parágrafo só.
7. **Subclasses:** um bloco `subclasse` para os três Experimentos, com cabeçalho (ícone, nome,
   "Subclasse · <classe>"), citação, quadro roxo "Custo do experimento" com as três penalidades,
   Vida/Energia inicial com progressão, atributos bônus, habilidade inicial no quadro dourado e as
   habilidades de subclasse. A heurística `iconeSubclasse` de `regras-inline` sai.
8. **Tabelas de layout restantes:** as tabelas que hoje caem em `generico` (Deslocamento, saúde do
   Civil, DTs, alcances, patentes e outras) passam a sair como `grade`, uma célula por caixa na
   ordem da fonte, em vez de texto corrido.
9. **Tabela sem cabeçalho:** "Lidando com a Morte" sai sem a linha "Irrelevante" promovida a
   cabeçalho.
10. **Habilidades:** o chip de custo usa `app-chip severidade="energia"` e Reação usa
    `severidade="ajuda"`.
11. **Classe:** os cartões Vida/Energia inicial usam a variante nova do `app-stat`. O painel do
    arquétipo fica em 2 colunas: à esquerda nome, citação, atributos bônus e o quadro dourado da
    habilidade inicial; à direita as habilidades de arquétipo e as gerais melhoradas. No celular,
    uma coluna.
12. **Cor no texto:** as palavras "Vida" e "Energia" (com maiúscula, palavra inteira) no texto
    corrido ficam em `--vida`/`--energy`, sem mudar peso nem tamanho. A pesquisa e a exportação
    continuam funcionando.
13. **Celular:** a barra "Sumário + Sistema/Guia" ganha fundo e não cobre o título da seção ao
    navegar.

## Critérios de Aceite

- Testes do normalizador cobrem os itens 2–9, contados por bloco e pela ausência de `generico`
  nas tabelas listadas. Testes de componente cobrem `termos`, `subclasse`, `abertura`, `grade`,
  a cor de recurso e as severidades novas do chip.
- `npm run regras:preparar` (ou o script equivalente do frontend) republica os JSONs. A contagem
  de avisos do Sistema cai e as que sobram estão justificadas na verificação.
- `npm run test --workspace=frontend`, `npm run lint --workspace=frontend` e o build do frontend
  passam.
- Gate visual (`verify` + `design-fidelity`) em `1920×1080`, `960×1080`, `1366×768` e `360×800`,
  claro e escuro, cobrindo abertura, Atributos, Maestrias, Penalidades, Sequelas, as três
  subclasses, uma classe com arquétipo, as habilidades, a tabela da Morte, uma `grade`, o fim do
  Sistema sem base64 e a barra mobile. Comparação registrada com o exemplão.
- `npm run repo:verificar` passa.

## Fora de Escopo

- Mudar regras, texto ou números dos livros. A nota "VERSÃO 4.1.1" desatualizada no Sistema é
  conteúdo e vai para `PROBLEMS.md`.
- A revisão dos PDFs (`revisao-formatacao-pdf-regras`, P-108). A exportação só precisa continuar
  funcionando.
- Mudar o estilo das abas, o trilho/sumário ou o painel flutuante.
- Os `▢` dentro da nota "Amaldiçoado pelo Passado" e o tamanho dos chips de NA no meio do texto
  vão para `IDEAS.md` se continuarem incomodando.

## Dependências

M10 (`docs/specs/done/m10-*`), `docs/design/DESIGN.md`, `docs/design/tema/_tokens.scss` e o
exemplão M10 como fonte visual. Os livros em `docs/core/` são a fonte do conteúdo.

## Riscos e Mitigação

- **Reconhecedor frágil:** cada caso explícito valida a forma inteira da tabela e, se não bater,
  cai para `grade`. Nunca descarta conteúdo.
- **Cor no texto corrido:** a marcação é feita na renderização (`regras-inline`), não no JSON.
  A pesquisa, que opera sobre o DOM, precisa ser exercitada ao vivo com "Energia".
