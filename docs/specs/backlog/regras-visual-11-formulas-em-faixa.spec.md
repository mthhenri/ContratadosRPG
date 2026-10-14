# regras-visual-11-formulas-em-faixa.spec.md

> Continuação da série `regras-visual-*`. Pedido do autor em 2026-10-14: no leitor de Regras, a regra
> de Descanso mostra "ATRIBUTO dados de descanso + (NÍVEL × 2)" como texto corrido, sem a faixa de
> fórmula que "Inventário Máximo = Força × 5" tem; revisar os outros pontos dos livros.

## Objetivo

Toda fórmula geral dos dois livros aparece como peça **Fórmula** (a faixa de `RegrasFormula`), e não
como parágrafo em itálico, de modo que o leitor apresente cálculos de forma consistente.

## Situação atual (levantada em 2026-10-14)

- A faixa é a peça `Tipo.FORMULA` do livro (`shared/src/livro/projetar-pecas-em-regras.ts` →
  `RegrasFormula`, `frontend/src/app/modules/regras/blocos/regras-formula.component.ts`). A Oficina já
  insere peças "Fórmula" (`oficina-estrutura.ts`).
- Fonte da verdade é o **banco**: `docs/core/*.md` são cópias exportadas e **não** se editam à mão. A
  correção é editorial, pela Oficina, seguida de publicar e `npm run regras:exportar`.
- Exemplo confirmado: `sistema-v4.1.4.md` linha ~2517, `***ATRIBUTO** dados de descanso + ( **NÍVEL** × 2 )*`,
  parágrafo em itálico depois de "Fórmula:".
- Candidatos para triagem (grep nos exportados, lista **não exaustiva**): no Guia,
  "Cálculo da Vida Máxima: Base + (Nível + VIG) × Multiplicador de Categoria", "10 + Nível + (Atributo × 2)…",
  "Esquivar = Defesa Base + DES", "Vida Máxima (VD × Multiplicador)", "Limite (2 × VD)". Contas resolvidas
  com números (ex.: "Defesa Base = 15 + VD ÷ 2 = 30", "Sucessor Experimento: 30 - (30 ÷ 3) = 20") são
  **exemplos**, não fórmulas gerais.

## Entregáveis

1. Inventário completo (anexo `inventario.md` na pasta da task) dos dois livros: cada cálculo, com
   seção/âncora, texto atual, peça atual (parágrafo/exemplo/fórmula) e proposta — **Fórmula** para regra
   geral, **Exemplo** para conta resolvida, ou "manter" com justificativa.
2. Revisão do inventário pelo autor; só o aprovado segue.
3. Conversão aprovada aplicada pela Oficina (inserir peça Fórmula com o mesmo texto e negritos, remover o
   parágrafo), publicação e `npm run regras:exportar`. Nenhuma mudança no texto da regra além do
   tipo da peça; um "Fórmula:" que fique redundante antes da faixa vai na proposta do inventário.
4. Se a Oficina não permitir alguma conversão sem perda (ex.: fórmula no meio de um parágrafo maior),
   registrar no inventário e levar ao autor — não contornar com HTML/estilo local.

## Critérios de Aceite

- Inventário fechado, com decisão do autor por item.
- Livros republicados e exportados; `repo:verificar` sem acusar cabeçalho/corpo dos `docs/core/`.
- Gate visual (`verify`) no leitor de Regras em `1920×1080` e `360×800`: Descanso e cada ponto convertido
  com a mesma faixa de Inventário Máximo; fórmula longa sem overflow no celular; busca de Regras ainda
  encontra os trechos.

## Fora de Escopo

Mudar regras/valores, redesenhar a faixa, estilizar exemplos (série `regras-visual-*` própria se surgir).

## Dependências

`regras-visual-06`…`10` (backlog) — não há sobreposição de escopo, mas conferir conflito de edição na
Oficina se rodarem juntas.
