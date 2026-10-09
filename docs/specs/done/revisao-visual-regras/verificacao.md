# Verificação — revisao-visual-regras

> Spec: [revisao-visual-regras.spec.md](../revisao-visual-regras.spec.md). Capturas brutas em
> `.artifacts/revisao-visual-regras/` (local, ignorada); este relatório se sustenta sem elas.

## Auditoria inicial (08/10/2026)

A página real (`/regras/sistema` e `/regras/guia`, 1920 e 360, tema escuro) foi percorrida
inteira em fatias de coluna e comparada com o exemplão M10 (`docs/specs/done/m10-regras/
m10-regras-exemplao.html`). Defeitos de conteúdo encontrados no Sistema:

| Defeito | Causa |
|---|---|
| Três subclasses de Experimento como parágrafo corrido de várias telas | tabela de layout sem reconhecedor → `generico` achatado |
| ~4 telas de base64 no fim do livro | definições `[imageN]: <data:…>` emitidas como `generico` |
| Atributos, Maestrias e Penalidades de Energia achatadas; Penalidades na ordem 1, 5, 9, 2… | tabelas de layout → `generico` linha a linha |
| "na média" virando chip de NA | `marcarNiveis` com `/i` aceitava "na" como sigla |
| Sequelas Paranoia e Letargia na mesma linha | quebra dura descartada na renderização |
| Linha "Irrelevante" da tabela da Morte como cabeçalho | exportação do Docs promoveu a 1ª linha |
| Abertura em bloco itálico corrido | quebras duras descartadas; sem bloco próprio |

Divergências do exemplão: custo de habilidade cinza (exemplão: chip azul), Reação vermelha
(exemplão: roxa), Vida/Energia inicial sem faixa/ícone em quadro, arquétipo em coluna única,
barra mobile cobrindo títulos ao navegar. O Guia já estava próximo do exemplão.
O fundo claro de NA 5/6 é decisão M10-04, não defeito.

## Análogos registrados

Exemplão M10 (aba Protótipo, Página 1920 e Celular 360): `.capa`, `.t12`, `.st`, `.e`, `.r`,
`.tp`/`.ini`, `.chd`. Componentes já aprovados do próprio leitor: `regras-nota` (família dos
quadros de destaque), `regras-classe`/`regras-arquetipos` (cartão, abas, habilidades),
`app-chip`/`app-stat` com os inputs completos.

## Resultado

- Normalizador: blocos `abertura` (2 livros), `termos` (Atributos 10, Maestrias 10,
  Penalidades 12, Sequelas 8), `subclasse` (3, cada uma com 3 custos e 10 habilidades),
  `grade` (11 tabelas de layout restantes) e tabela da Morte sem cabeçalho e sem a linha vazia
  final. Zero `generico` e zero `data:image` no Sistema. Avisos do Sistema: 32 → 18 (só as
  11 grades e as 7 âncoras repetidas, ambas preservando conteúdo).
- Frontend: componentes `regras-abertura`, `regras-termos`, `regras-grade`,
  `regras-subclasse`, `regras-saude`, `regras-destaque`; `app-chip` com severidades
  `energia`/`ajuda`; `app-stat [faixa]` + `[statIcone]`; Vida/Energia coloridas no texto
  corrido em `regras-inline`; topbar com `documentos`; âncoras abaixo da barra mobile.

## Gates

| Gate | Resultado |
|---|---|
| `npm run test:regras` (frontend) | 66/66, inclusive cobertura integral de texto e pontuação dos dois livros |
| `npm run test --workspace=frontend` | 231 arquivos, 3126 testes, todos passaram |
| `npm run lint --workspace=frontend` | 0 erros; avisos de estilo preexistentes; arquivos novos sem aviso |
| `CI=true NG_BUILD_MAX_WORKERS=2 npm run build` (frontend, contorno P-104) | passou; publicação fiel ao Markdown nos dois livros |
| Prettier nos `.html`/`.scss` tocados | sem mudança pendente |

Ajustes de oráculo justificados: o texto esperado ignora tokens `def` (metadado de imagem) e
a pontuação normaliza `▢`, que virou dado do verbete, como os glifos de seção.

## Verificação ao vivo

App real (`ng serve` do autor em 4300), Playwright Chromium.

- `1920×1080` escuro: abertura, Atributos, Maestrias, Penalidades, Sequelas, Morte, Combatente
  (cartões com faixa, chips azuis, Reação roxa), arquétipo Lutador em 2 colunas, Experimento
  Bestial, Civil (grade), "Contido ou Exterminado" sem chip de NA, Amplificadores e fim do
  livro sem base64. Sem overflow (`scrollWidth` 1920), sem erros de console.
- `1920×1080` claro: abertura, Atributos, Penalidades, Combatente, Experimento Bestial.
- `1366×768`: Atributos, Experimento Bestial. `960×1080`: arquétipo (1 coluna por container
  query), Experimento Bestial, Penalidades. Sem overflow.
- `360×800`: abertura, Atributos, Penalidades (1 coluna), Sequelas, Combatente, arquétipo,
  Experimento Bestial, Deslocamento; sumário pela gaveta até "Níveis e Melhorias de Agente":
  título em y=130 com a barra terminando em y=114 (antes ficava cortado). `scrollWidth` 360.
- Pesquisa "Energia inicial": 6 resultados, destaque correto sobre o texto colorido.
- Painel flutuante aberto pela topbar (1920 e 360): Experimento Bestial com custo, cartões de
  recurso e painel recolhido a 1 coluna pela container query; sem corte.
- Exportação do Guia (impressão emulada): abertura em cartão no papel, `print()` chamado.

Comparação com o exemplão: mesma voz visual (mono/sans, filetes, densidade); termos na grade
`.t12`; subclasse com cabeçalho, quadro roxo, cartões de recurso, chips de bônus e quadro
dourado; arquétipo em 2 colunas mantendo as abas canônicas por decisão do autor.
Correções feitas durante a inspeção: marcadores da lista de custos (o reset global removia),
linha vazia no fim da tabela da Morte.

## Limites

- Firefox/Edge não exercitados (a mudança não depende de scrollbar nem de `@supports`).
- PDF do Sistema continua suspenso (P-108); só o Guia foi exportado.
- Conteúdo da fonte não alterado: nota "VERSÃO 4.1.1" (P-109) e asterisco literal na
  abertura (P-110) registrados.
