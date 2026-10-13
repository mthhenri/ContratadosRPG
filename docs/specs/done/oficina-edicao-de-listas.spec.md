# oficina-edicao-de-listas.spec.md

> Task avulsa, aberta pelo autor em 2026-10-13 ao não conseguir corrigir o item "Interrupção
> externa" (Sistema, Cena de Perseguição › Encerramento). Preenche a lacuna deixada pela
> [`m11-08`](m11-08-oficina-blocos-ricos.spec.md), que não cobriu a peça `LISTA`. Princípio do
> autor: **nada do conteúdo do livro pode ficar fora do alcance da Oficina.** O levantamento do que
> ainda não é editável está em [`auditoria-ineditaveis.md`](oficina-edicao-de-listas/auditoria-ineditaveis.md).

## Objetivo

Tornar a lista (com marcadores ou numerada, inclusive sublistas) editável no próprio lugar na
Oficina — texto de cada item, adicionar e remover itens — e entregar o mapa do que mais no livro
continua sem edição.

## Entregáveis

1. **Projeção**: o bloco `lista` do leitor leva o `identificador` da peça (`peca`), como os demais
   blocos editáveis (`shared/src/livro/projetar-pecas-em-regras.ts`, `regras-formato.ts`,
   `regras.model.ts`). Sem isso a lista nem é selecionável como peça.
2. **Componente `RegrasLista`** recursivo: cada parágrafo de item é um `app-regras-inline` com
   `peca` + `caminho` (`["itens", i, j, "trechos"]`; sublista: `[..., "itens", k, l, "trechos"]`).
   Com a lista selecionada aparecem "Remover item" (por item) e "+ Item" (por nível), no padrão do
   `RegrasRoteiro`. Fora da Oficina o desenho é o mesmo de hoje.
3. **Inserção**: "Lista" entra no menu "+" / "/" (`oficina-estrutura.ts`), usando o esqueleto que já
   existe em `shared/src/livro/esqueletos.ts`.
4. **Validador**: pendência de conteúdo para lista sem itens e para item sem texto
   (`validar-arvore-livro.ts`), no padrão das etapas de roteiro.
5. **Auditoria**: `auditoria-ineditaveis.md` — o que do livro não é editável na Oficina, por tipo de
   peça e campo, com o método usado e os limites.
6. Corrigir `I**nterrupção externa**` na fixture de importação (feito junto) e registrar que o banco
   é corrigido pela Oficina.

## Critérios de Aceite

- Testes: projeção (a lista leva `peca`; sublista não), validador (lista vazia, item vazio, item só
  com sublista com texto = ok), catálogo de inserção (inclui Lista só onde `LISTA` é filho permitido),
  componente (editar texto grava no caminho certo, adicionar/remover item, sublista).
- Ao vivo, com `verify`, `1920×1080` e `360×800`: editar o item "Interrupção externa" e ver o negrito
  corrigido persistir após recarregar; adicionar e remover item; inserir lista nova pelo "+"; item
  de sublista. Análogo aprovado: `RegrasRoteiro` (etapas) e o próprio leitor da lista.
- Cada controle usa o primitivo de `shared/ui/` (`app-botao`, `app-botao-icone`) com a API completa.
- `npm run repo:verificar`, lint e testes de `shared` e `frontend` verdes (backend só se tocado).

## Fora de Escopo

- Criar sublista a partir de um item, alternar `ordenada` e mudar `inicio` (estrutura/apresentação,
  não conteúdo de texto) — registrados na auditoria como lacuna.
- Enter criando item novo e Backspace removendo item vazio (atalhos): o Enter segue pulando ao
  próximo campo, como nos demais campos que não são parágrafo.
- Corrigir as demais lacunas da auditoria (cada uma vira spec própria, na ordem que o autor escolher).

## Dependências

`m11-06`, `m11-07`, `m11-08` em `done/`.
