# m3-55-ficha-refino-visual-desktop.spec.md

> Task 52 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Polimento visual desktop da ficha: (3) **alinhar os ícones em cada tab** (ajuste manual); (17)
**hover no atributo mostra a DT** dele; (22) **dobrar a largura da caixa de dados** (bandeja) e
**suavizar a animação de remoção** (hoje faz um "bounce" estranho ao sair um item).

## Entregáveis

1. **Alinhar ícones das tabs (item 3).** Acerto manual do alinhamento dos ícones na barra de abas
   (`ficha-visualizacao.component.html` ~linhas 10-28 + `.scss`), consistente entre as tabs
   (baseline/centralização, gap ícone-rótulo). Só tokens do tema.
2. **Hover no atributo mostra a DT (item 17).** Ao passar o mouse num atributo (Visão Geral),
   exibir a DT correspondente (tooltip/legenda). A DT vem de `shared/src/regras/dt` (mesma fonte
   da página de DT, `m1-08`); o atributo já tem a chave usada por `rolarTesteAtributo`
   (`ficha-visualizacao.component.ts` ~linha 503). Acessível (não só hover — foco/teclado).
3. **Bandeja de dados: largura + animação (item 22).** Em
   `frontend/src/app/shared/bandeja-dados/bandeja-dados.component.ts/.scss`: **dobrar a largura**
   da caixa e **ajustar a animação de saída** de um item — hoje faz um bounce estranho ao remover;
   trocar por uma transição mais fluida (fade/slide suave, sem overshoot). Respeitar
   `prefers-reduced-motion`.

## Critérios de Aceite

- Ícones das tabs visualmente alinhados e consistentes entre si.
- Hover/foco num atributo revela a DT correta (batendo com a página de DT).
- A bandeja é ~2× mais larga e a remoção de item é fluida, sem bounce.

## Fora de Escopo

- Passe mobile (é a `m3-56`).
- Mudar o conteúdo/comportamento da rolagem em si (só apresentação da bandeja).

## Dependências

- `m3-11` (abas), `m3-22` (bandeja de dados), `m1-08`/`shared/regras/dt` (DT do atributo).
