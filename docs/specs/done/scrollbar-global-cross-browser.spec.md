# scrollbar-global-cross-browser.spec.md

> Spec avulsa (correção). Pedido do autor ao usar a tela: "essa scrollbar não está com o nosso
> estilo — nenhuma scrollbar customizada, mais fininha, está sendo aplicada". Testar em Google
> Chrome, Microsoft Edge e Mozilla Firefox.

## Problema (causa raiz medida)

`frontend/src/styles/tema/_base.scss` (m1-18) declarava o padrão do tema duas vezes: as
propriedades padrão (`scrollbar-width: thin` + `scrollbar-color`, em `html`) **e** os
pseudo-elementos `::-webkit-scrollbar-*` (em `*`). No Chromium moderno (Chrome/Edge ≥ 121) as duas
formas **não se somam**: qualquer elemento com `scrollbar-color`/`scrollbar-width` diferente de
`auto` desliga por completo o `::-webkit-scrollbar` daquele elemento. Como `scrollbar-color` é
**herdado**, todo container herdava o valor de `html` e perdia o desenho do tema; e
`scrollbar-width` **não é herdado**, então os containers ficavam em `auto` (15px, com setas), só com
as cores trocadas. Medido na app real, num container com `overflow: auto` injetado:

| Navegador | Antes | Depois |
|---|---|---|
| Chromium 148 (motor do Chrome) | 15px, setas ▲▼, `scrollbar-color` herdado | 10px, polegar do tema, sem setas |
| Microsoft Edge 153 | idem (reproduz o print do autor) | 10px, polegar do tema, sem setas |
| Firefox 150 | `scrollbar-width: auto` nos containers (só `html` era `thin`) | `thin` + cores do tema em todo container |

## Análogo aprovado

O próprio padrão canônico de `docs/design/DESIGN.md` ("Scrollbar (padrão global)"): thumb
`--surface-2` com contorno `--border-strong`, raio `--radius-control`, 10px, hover `--accent-border`.
O desenho **não muda** — só passa a valer.

## Entregas

1. `frontend/src/styles/tema/_base.scss` e o espelho `docs/design/tema/_base.scss`: as propriedades
   padrão passam para `*` (Firefox e qualquer navegador sem `::-webkit-scrollbar`) e, dentro de
   `@supports selector(::-webkit-scrollbar)`, voltam a `auto` para o `::-webkit-scrollbar` valer
   (Chrome, Edge, Safari). Sem hex, sem `!important`; componentes que já escolhem
   `scrollbar-width: none` (abas, editor Markdown) continuam vencendo pela especificidade.
2. `docs/design/DESIGN.md`: a seção "Scrollbar" registra a armadilha (propriedades padrão
   desligam o `::-webkit-scrollbar`) e a regra resultante.

## Fora de escopo

- Os HTMLs de `docs/design/examples/` (capturas do app, snapshots históricos) mantêm o CSS antigo.
- Safari não foi testado (o autor pediu Chrome, Edge e Firefox).

## Verificação

`ng test` da suíte que já cobre o tema (se houver), build do frontend (o `@supports selector()`
precisa passar pelo Sass), e sonda no navegador real nos três navegadores: espessura da barra,
`scrollbar-width`/`scrollbar-color` calculados e captura do container.
