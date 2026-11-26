# Plano — gerador de PDF das Regras, fatia 1 (corte de aprovação)

**Spec:** [`../revisao-formatacao-pdf-regras.spec.md`](../revisao-formatacao-pdf-regras.spec.md) ·
**Desenho:** [`design.md`](design.md). Execução direta pelo agente, na branch `ccr-a17f30c5-wwoqux`. Sem commit
sem pedido do autor.

**Objetivo:** uma amostra em PDF (capa, sumário numerado, Introdução, classe Combatente com arquétipos, Corpo a
Corpo com modificações, crédito) gerada por código a partir da publicação, para o autor aprovar o visual.

**Arquitetura:** o documento vira uma lista de **peças medidas** (altura conhecida antes de desenhar). Um
paginador puro distribui as peças em páginas e colunas. Só depois se desenha: capa, sumário (já com os números),
conteúdo, topo e rodapé, marcadores. Todo desenho passa por um `Pincel`, que nos testes é falso.

## Restrições globais

- A4 em milímetros; TypeScript puro em `frontend/src/app/modules/regras/pdf/`, sem Angular.
- Entrada: `NormalizadoDocumento` de `@contratados-rpg/shared/livro`. Despacho exaustivo por `tipo`.
- `jspdf@4.2.1`, sem `jspdf-autotable`. Fontes IBM Plex TTF em `frontend/public/fonts/pdf/`.
- Cores só em `paleta.ts`, com o nome do token de origem em cada uma.
- Identificadores de domínio em português; aspas duplas; 4 espaços; linha até 100.
- Teste antes do código nas partes puras. Comando:
  `npx ng test --watch=false --include='src/app/modules/regras/pdf/**/*.spec.ts'` (em `frontend/`).

## Foco de revisão

1. Peça mais alta que a coluna inteira (habilidade ou linha de tabela longa): parte em linhas, não some nem trava.
2. Título no pé da coluna: vai junto com o que vem depois.
3. Tabela que continua: cabeçalho repetido.
4. Arquétipos com quantidades diferentes de habilidades: cada coluna continua sozinha.
5. Glifo que a fonte não tem (⬢ ⬡ ⬥ ⬦ ◈ ◻ ■ □ ▢): desenhado como figura, nunca como caixa vazia.

Os itens 1–4 são testes de `paginacao.spec.ts`; o 5 é teste de `texto-rico.spec.ts`.

## Tarefas

### 1. Fontes e pincel
- `frontend/public/fonts/pdf/`: Plex Sans (Regular, Italic, SemiBold, SemiBoldItalic) e Mono (Regular, SemiBold),
  convertidos de WOFF 1 para TTF **sem alterar tabelas** (os pacotes autorizados não trazem TTF) + `LICENCA.md` (OFL).
- `paleta.ts`: `PALETA_PDF` (RGB).
- `pincel.ts`: `interface Pincel { medir(texto, estilo): number; texto(...); retangulo(...); linha(...);
  glifo(...); imagem(...); linkExterno(...); linkPagina(...) }` e `EstiloTexto { familia: "sans"|"mono";
  negrito: boolean; italico: boolean; tamanho: number; cor: Cor }`.
- `pincel-jspdf.ts`: implementação real e registro das fontes.

### 2. Paginação (pura)
- `paginacao.ts`:
  `interface Peca { altura; espacoAntes?; prenderProxima?; cabecalhoContinuacao?: Peca; ancora?; desenhar(p, x, y) }`;
  `type Grupo = { tipo: "fluxo"; colunas: 1|2|3; pecas: Peca[]; novaPagina?; capitulo? }
  | { tipo: "paralelo"; colunas: Peca[][]; novaPagina?; capitulo? }`;
  `paginar(grupos, geometria): Pagina[]`.
- Colunas de um grupo que termina no meio da página ficam equilibradas.
- Testes: sequência em 1 coluna; quebra; `prenderProxima`; repetição de cabeçalho; equilíbrio em 2 colunas;
  paralelo que continua; `novaPagina`; peça maior que a coluna.

### 3. Texto rico
- `texto-rico.ts`: `trechosEmCorridas(trechos, estilo): Corrida[]` (negrito, itálico, tachado, tarja, links, nível de
  ameaça, Vida/Energia em cor, condições sublinhadas via `separarCondicoesTexto`), `quebrarLinhas(pincel, corridas,
  largura): Linha[]`, `pecasDeTexto(...): Peca[]` com controle de viúvas e órfãs.
- Testes: quebra por largura; `\n`; negrito aninhado; tarja ocupa largura; palavra maior que a linha; glifos.

### 4. Tabela
- `tabela.ts`: `pecasDeTabela({ colunas, cabecalho, linhas }, largura): Peca[]` com cabeçalho repetível e zebra.

### 5. Blocos da amostra
- `blocos/`: `secao`, `texto` (parágrafo, exemplo, nota, fórmula, lista), `termos`, `habilidade`, `classe`,
  `arquetipos`, `equipamentos`, `modificacoes`.
- `despacho.ts`: `gruposDe(conteudo, contexto): Grupo[]`; tipo ainda sem desenho lança `BlocoSemDesenho`.
  Habilidades vizinhas formam grupo de 2 colunas.
- Teste de cobertura: todo texto do recorte aparece no pincel falso.

### 6. Livro
- `capa.ts`, `sumario.ts` (reusa `construirSumarioRegras`; 2 colunas, pontilhado, link; entrada sem página mostra "··"),
  `compositor.ts`: `comporLivro(documento, opcoes: { pincel, logo?, sumarioDe? }): ResultadoDaComposicao`
  (nº de páginas, âncora→página), com topo, rodapé, marcadores e crédito de licença no fim.
- Teste: capa em uma página; números do sumário batem com as páginas; crédito presente.

### 7. Amostra e conferência
- `.artifacts/revisao-formatacao-pdf-regras/gerar-amostra.mjs` (esbuild + Node, ignorado pelo Git): gera
  `amostra.pdf` da publicação salva.
- Renderizar com `render.ps1`, olhar **todas** as páginas, corrigir, enviar ao autor.
- Limite declarado: botão, serviço de download e navegadores só na fatia 4; conteúdo da 4.1.4 local.

## Fatias 2 e 3 — executadas em 25/11/2026

Todos os tipos de bloco do `shared/` têm desenhista (`blocos/tabelas`, `fichas`, `ameacas`, `caixas`; subclasse em
`classes`; amplificadores em `equipamentos`). Livros inteiros da publicação local: Sistema 4.1.4 em 60 páginas e Guia
4.2.0 em 26, sem palavra perdida (`palavras-do-livro.ts`) e com todas as entradas do sumário numeradas.

Escolhas para o autor confirmar:
- Ficha de exemplo do Guia: campo que o texto de apoio já diz por inteiro não é repetido (o leitor do site repete).
- Arquétipos que não cabem numa página continuam na seguinte, sem reduzir a letra (duas páginas ficam parciais).

Falta (fatia 4): botão e download, Sistema reativado, impressão antiga removida, avisos de `max-len`, revisão
independente, conferência em Chrome, Edge e Firefox e sobre o conteúdo 4.1.5.
