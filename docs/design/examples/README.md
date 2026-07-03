# examples/ — Referência visual (NÃO é código de produção)

Telas do tema **"Terminal de Contenção"**, exportadas como HTML único e offline
(fontes embutidas). Servem **exclusivamente de referência VISUAL** — a linguagem de design
(cor, tipografia, espaçamento, forma, padrões de componente) é o que será construído em
Angular 21 + PrimeNG 21 + Tailwind + SCSS/BEM.

> ⚠️ **Referência visual, não de features.** As funcionalidades, campos, dados, regras e
> comportamento destas telas **vão mudar** na implementação real — não os trate como
> especificação de produto. O que vale aqui é **como as coisas se parecem**, não o que
> elas fazem. A verdade de features está nas specs (`docs/specs/`) e nas regras
> (`docs/core/`).

> ⚠️ **Não é fonte.** Não importe, não sirva em produção e não copie o HTML: foram gerados
> por uma ferramenta de prototipagem e usam estilo inline. O código real vive em
> `apps/web/` e consome os tokens de `../tema/`.

## Como usar

Abra qualquer arquivo direto no navegador (duplo clique). Ao construir a tela equivalente
em Angular, use-a como **alvo de fidelidade visual** — replique o visual e puxe os valores
de `../tema/_tokens.scss`. Deixe os dados e o comportamento seguirem as specs, não estas
telas.

Foque nos **padrões visuais** listados — não nos campos/dados específicos, que são ilustrativos.

| Arquivo | Tela | Padrões visuais a reaproveitar |
|---|---|---|
| `calculadora-de-atributos.html` | Calculadora de agente | Steppers, stat grid, cabeçalho de seção com índice + régua |
| `ficha-de-jogador.html` | Ficha de Jogador | Barras Vida/Energia, chips de habilidade, tabela de inventário |
| `ficha-de-criatura.html` | Ficha de Ameaça (SCP) | Layout denso, atributos + modificadores, resistências/fraquezas |

## Relação com o resto do handoff

- `../DESIGN.md` — guia do tema e mapa de tokens
- `../tema/` — tokens SCSS, base, preset PrimeNG, trecho Tailwind

Ao mudar o tema, **regenere estes exemplos** a partir dos protótipos para não divergirem.
