# m8-03-frontend-painel-visualizador.spec.md

> Task 3/6 do módulo `m8-espectadores-campanha.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`. O análogo aprovado é a composição
> “Sessão” e o histórico de rolagens da `CampanhaDetalhe`: mesma densidade de resultado, estados
> de carregamento/vazio, comportamento de tempo real e hierarquia de uma sessão, sem copiar a
> visão administrativa do mestre.

## Objetivo

Entregar o fluxo visual do espectador: entrar com um código sem escolher papel, o mestre gerir os
dois convites e os membros, e a pessoa espectadora acompanhar as rolagens públicas no painel
dedicado ao vivo.

## Entregáveis

1. A tela existente de entrada em campanha preserva um único campo “Código de convite”; após a
   resposta, confirma claramente se a entrada foi como Jogador ou Espectador e redireciona para o
   destino correspondente. Não oferecer seletor de papel nem vazar o código usado.
2. A área de mestre mostra os dois códigos como controles distintos — “Convite de jogador” e
   “Convite de espectador” — cada um com copiar/regenerar próprios e confirmação adequada para
   regeneração. A lista de membros distingue os três papéis e oferece a troca jogador/espectador
   só para membros não-mestres.
3. Nova rota guardada `/campanhas/:id/espectador`, aceita apenas o espectador real ou o mestre em
   prévia. Ela tem cabeçalho compacto de campanha, selo “Modo espectador” e um card dominante de
   rolagens públicas, com resultado, rótulo, autor/ficha já presentes no contrato, tempo relativo e
   paginação/“carregar mais”. Não há cards de ficha, Equipe, convites, menus de gestão nem controles
   para rolar.
4. O painel conecta/reconecta à sala de campanha, incorpora `rolagem:registrada` pública sem
   duplicar o item que chega também pelo REST e mostra os estados canônicos de esqueleto, vazio e
   desconexão. Mestre abrindo o mesmo endereço vê uma barra inequívoca de prévia e “Sair da
   visualização”, mas recebe exatamente o recorte público.
5. O layout usa `app-cartao`, `app-chip`, `app-esqueleto`, `app-estado-vazio`, a renderização
   canônica de resultado de rolagem e tokens do tema. Em mobile, feed e ações ocupam uma coluna,
   sem rolagem horizontal e com alvos de toque de ao menos 44px.
6. Testes de serviço/página cobrem a bifurcação pós-entrada, visibilidade por papel, entrada no
   painel, prepend em tempo real, deduplicação, estados vazio/carregando e bloqueio do template de
   qualquer ação de escrita.

## Critérios de Aceite

- O código de espectador leva uma conta ao painel dedicado e o código de jogador preserva o painel
  atual de jogador; nenhum dos dois permite ao usuário escolher outro papel na interface.
- Mestre consegue copiar e regenerar cada convite independentemente e alterar um jogador em
  espectador (e vice-versa) com a lista atualizada.
- Rolagem pública feita em outra sessão aparece no topo do painel do espectador sem recarregar;
  privada nunca aparece.
- Em execução real, os estados preenchido, vazio, carregando e reconexão são conferidos em
  `1920×1080` e `360×800` contra o análogo definido, sem overflow ou controles acionáveis de
  mestre/jogador.

## Fora de Escopo

- Prévia de jogador fiel; ela é `m8-04`.
- Visão de Iniciativa/Encontro; ela é `m8-05`, entregue como gatilho/seção à parte do
  feed de rolagens, não dentro dele. Fichas ou documentos seguem fora do painel.
- Alterações nos componentes canônicos de resultado de rolagem, salvo correção estritamente
  necessária e especificada em task própria.

## Dependências

- `m8-02-backend-permissoes-projecoes`.
- `m2-19-painel-campanha-detalhe-mestre-esquadrao` e `m3-27-historico-rolagem`.
- `docs/design/DESIGN.md` e skill `verify`.

## Riscos e mitigação

- “Modo espectador” não pode ser apenas um `@if` na visão do jogador: ele tem rota, payload e
  composição próprios, reduzindo a chance de uma ação ou dado de ficha sobreviver por engano.
