# Campanha do jogador — abas móveis isoladas

> Task avulsa originada do relato do autor: na visão de jogador de `/campanhas/:id`, Rolagens aparecia junto das demais abas e a última aba interna aberta podia permanecer visível ao selecionar Rolagens.

## Objetivo

Organizar a navegação móvel da ficha compacta dentro da campanha para que cada destino apresente somente o conteúdo a que se refere. A composição em desktop e a ficha completa permanecem inalteradas.

## Entregáveis

1. A ficha compacta distingue o destino móvel externo `rolagens` das abas internas: nesse destino, o card de Status não exibe a última aba selecionada; os destinos Agente, Informações, Inventário e Habilidades preservam o comportamento atual.
2. A visão de jogador controla visualmente o painel externo de Rolagens no mobile: ele só aparece quando o destino móvel Rolagens está ativo e não vaza para as outras abas. Em desktop, o painel continua na composição atual entre Equipe e Sessão.
3. Testes de regressão cobrem a seleção de Rolagens no compacto e a sincronização do destino na campanha, evitando o reaparecimento de conteúdo espelhado.

## Critérios de Aceite

- Em `360×800`, percorrer Agente, Informações, Inventário, Habilidades e Rolagens mostra uma única superfície de conteúdo por destino; Rolagens não mantém Inventário/Habilidades por baixo e não aparece nas demais abas.
- Em `1920×1080`, a visão de jogador mantém o card de Rolagens visível na coluna existente, sem mudança de densidade ou ordem.
- Os testes focados da ficha e da página de campanha, a suíte, lint e build do frontend passam.
- A aplicação real é observada em `1920×1080` e `360×800`, comparada ao análogo `ficha-de-jogador.html`: mesma barra inferior, densidade, hierarquia, foco e ausência de overflow horizontal.

## Fora de Escopo

- Alterar o conteúdo, permissões, presets ou registro de rolagens.
- Redesenhar a ficha compacta, a ficha completa ou os painéis laterais de Histórico/Inventário.
- Alterar a navegação móvel do painel de Iniciativa, que hospeda Rolagens dentro do próprio compacto.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`, `docs/design/examples/ficha-de-jogador.html`, `FichaVisualizacao` e `CampanhaDetalhe`.

## Riscos e Mitigação

Rolagens tem duas composições legítimas: externa na campanha e interna no painel de Iniciativa. O recorte é condicionado ao compacto que não liga `mostrarRolagensCompacto`, preservando a variação da Iniciativa.
