# p-051-adocao-app-esqueleto-quatro-telas.spec.md

> Task solta. Origem: `docs/context/PROBLEMS.md` `P-051`. Análogo aprovado:
> `frontend/src/app/modules/ficha/paginas/acervo/acervo.page.html`/`.scss` (`<app-esqueleto
> class="acervo__esqueleto-titulo" />` com geometria BEM local, sem cor/raio/animação).

## Objetivo

As quatro telas que ainda recriam a identidade de `app-esqueleto` (`.esqueleto-bloco` +
`@keyframes esqueleto-pulso` + `prefers-reduced-motion` locais) passam a consumir o primitivo
`shared/ui/esqueleto`, mantendo local só a geometria de cada silhueta.

## Entregáveis

Para cada um dos quatro arquivos abaixo: trocar todo `<span class="esqueleto-bloco
esqueleto-bloco--<modificador>">` por `<app-esqueleto class="<prefixo>__esqueleto-<modificador>" />`
(um nome BEM próprio da página, não mais o global `esqueleto-bloco--*`); no SCSS, remover o bloco
base `.esqueleto-bloco { ... }`, o `@keyframes esqueleto-pulso` e o `@media
(prefers-reduced-motion: reduce) { .esqueleto-bloco { animation: none; } }` locais, e converter
cada modificador `&--X` em `&__esqueleto-X`, preservando `width`/`height`/`flex`/`margin`/
`max-width`/`min-width`/`border-radius` (quando a silhueta é redonda, ex. `--d20`) exatamente como
estão — só a cor/raio-padrão/animação vêm do primitivo agora. Um elemento que hoje combina dois
modificadores (`esqueleto-bloco--linha esqueleto-bloco--curta`) vira duas classes BEM no mesmo
`<app-esqueleto>`; um elemento que já carrega uma terceira classe de layout alheia ao esqueleto
(`detalhe__nova-ficha`) mantém essa classe.

1. `perfil.page.html`/`.scss` — 3 usos (`--titulo`, `--linha` ×2).
2. `visualizar-criatura.page.html`/`.scss` — 5 usos (`--rotulo`, `--chip`, `--titulo`, `--linha`,
   `--linha`+`--curta`).
3. `visualizar.page.html`/`.scss` — 15 usos, 9 modificadores (`--rotulo`, `--chip`, `--avatar`,
   `--titulo`, `--linha`, `--curta`, `--barra`, `--mini`, `--aba`, `--bloco`).
4. `detalhe.page.html`/`.scss` — 38 usos, 19 modificadores, o maior recorte (inclui `--d20` com
   `border-radius: 50%` e os dois usos que combinam com `detalhe__nova-ficha`).

## Critérios de Aceite

- `rg -n "esqueleto-bloco|esqueleto-pulso" frontend/src/app/modules/usuario/paginas/perfil
  frontend/src/app/modules/campanha/paginas/detalhe frontend/src/app/modules/ficha/paginas/visualizar
  frontend/src/app/modules/ficha/paginas/visualizar-criatura` sem resultado.
- `npm run test --workspace=frontend` sem regressão nos specs das quatro páginas.
- `npm run lint --workspace=frontend` sem erro novo.
- Gate visual ao vivo (`verify` + `design-fidelity`) em `1920×1080` e `360×800`: estado de
  carregamento das quatro telas comparado com o análogo (`acervo.page`) e com o próprio estado
  anterior (mesma geometria, mesmo pulso, sem overflow).

## Fora de Escopo

- `previa-jogador.page.html`/`espectador.page.html`: usam a mesma classe `.esqueleto-bloco
  esqueleto-bloco--titulo` num `<span>`, mas **não** definem `.esqueleto-bloco` localmente — não
  fazem parte da duplicação que `P-051` descreve. Investigar/registrar à parte se for um defeito
  (esqueleto sem estilo aplicado).
- Qualquer mudança na API do primitivo `app-esqueleto` (inputs, variantes) — hoje ele não precisa
  de nenhum para cobrir os quatro consumidores.

## Dependências

Nenhuma.
