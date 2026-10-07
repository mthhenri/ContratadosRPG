# m10-09-pesquisa-regras.spec.md

> Task do milestone `m10-regras.spec.md`, depois de `m10-06` e `m10-08`. Fonte visual: exemplão,
> aba *Protótipo*, pesquisa na página, no painel e no celular.

> **Antes de qualquer UI:** `docs/design/DESIGN.md` e `docs/design/tema/`; skills
> `design-fidelity` e `verify`. Análogos: busca da Biblioteca (`app-campo` de busca) e o
> `trecho-destacado` de `modules/documento`.

## Objetivo

Pesquisar no documento aberto, no navegador, sobre o formato canônico já carregado.

## Entregáveis

1. Campo de busca no topo do trilho (página) ou da gaveta (painel/celular).
2. **Resultados no lugar do sumário:** caminho (⬡ › ⬥ › ⬦) + trecho com o termo destacado; clique
   rola até a ocorrência.
3. No texto: ocorrências destacadas, "1 de N" com ↑↓ (e Enter/Shift+Enter); **Esc** limpa e volta ao
   sumário.
4. **Outro documento:** "N resultados no outro documento →" abre o outro documento com a mesma
   busca.
5. Busca sem acento e sem caixa (normalização igual nos dois lados); trechos de tarja não casam.
6. Teste da função de busca (pura) com termos reais dos dois documentos.

## Verificação

`verify` em 1920×1080 e 360×800: buscar, navegar ↑↓, Esc, atalho para o outro documento, busca
sem resultado (`app-estado-vazio`).

## Fora de escopo

Busca no backend; glossário.
