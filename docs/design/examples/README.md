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
| `login.html` | Login / acesso | Painel split marca+form, campos com rótulo mono, entrada por código de convite |
| `cadastro.html` | Cadastro de conta | Formulário em duas colunas, checkbox, nota de contenção de dados |
| `campanhas.html` | Campanhas (adapta ao papel) | Cards de campanha, chips de status (ao vivo/agendada/pausada), painel "entrar por código", grid de mesas do mestre, menu de perfil |
| `lobby-de-campanha.html` | Lobby / detalhe de campanha | Cabeçalho com classificação + código de convite copiável, briefing, lista de esquadrão, seletor de campanha ativa na topbar |
| `topbar.html` | Topbar — 3 direções | Barra de comando (1a), rail lateral (1b), dossiê de duas linhas (1c); seletor de campanha, status ao vivo, dropdown de perfil |

> `topbar.html` é uma **exploração de opções** (1a/1b/1c lado a lado), não uma tela final —
> serve para escolher a direção do chrome de navegação. As telas `campanhas` e
> `lobby-de-campanha` já usam a direção **1a (Barra de Comando)**.

## Relação com o resto do handoff

- `../DESIGN.md` — guia do tema e mapa de tokens
- `../tema/` — tokens SCSS, base, preset PrimeNG, trecho Tailwind

Ao mudar o tema, **regenere estes exemplos** a partir dos protótipos para não divergirem.
