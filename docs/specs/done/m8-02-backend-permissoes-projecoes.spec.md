# m8-02-backend-permissoes-projecoes.spec.md

> Task 2/6 do módulo `m8-espectadores-campanha.spec.md`.

## Objetivo

Implementar no backend a entrada determinada pelo convite, a gestão explícita de papel e os
recortes de leitura que protegem o Painel do espectador e a prévia do jogador.

## Entregáveis

1. `CampanhaService.entrarCampanha` resolve qual dos dois códigos ativos foi informado e cria o
   vínculo com `JOGADOR` ou `ESPECTADOR`. Código inexistente, vínculo já ativo e tentativa de usar
   código para trocar o próprio papel retornam erro de negócio; o cliente não consegue escolher o
   papel por corpo, query ou rota.
2. Só o mestre pode regenerar o convite de espectador e alterar o papel de outro membro entre
   JOGADOR e ESPECTADOR. Não pode alterar a si mesmo, o único mestre ou transferir mestre para um
   espectador; para promover alguém a mestre, primeiro o torna jogador. As ações emitem evento de
   campanha após a mutação para os clientes recarregarem dados de membro.
3. Centralizar predicados de campanha por capacidade (`ehMestre`, `ehJogador`, `ehEspectador`,
   `validarMembro` e capacidades de leitura) na service, sem `if` equivalente em controller ou
   gateway. Os endpoints de ficha, concessão de ficha, caderno, inventário, edição de campanha e
   registro de rolagem rejeitam espectador mesmo quando a rota direta é chamada.
4. O feed `listarPorCampanha` aceita espectador e retorna exclusivamente rolagens `PUBLICA`.
   `CampanhaGateway` permite a ele apenas a sala `campanha:<id>` para receber
   `rolagem:registrada` pública e eventos de presença necessários; entrada em sala de ficha e
   qualquer evento privado continuam negados. O emit existente de rolagem privada permanece
   ausente.
5. Criar uma projeção de leitura do painel de espectador: identidade segura da campanha + feed
   paginado de rolagens públicas. Ela é legível por espectador e por mestre em modo de prévia, mas
   não inclui código, membros, fichas ou qualquer dado privado.
6. Criar uma projeção de prévia de jogador, legível somente pelo mestre da campanha e parametrizada
   pelo `usuarioAlvoId`. A service valida que o alvo é `JOGADOR` ativo e calcula fichas visíveis,
   feed e capacidades exatamente com a identidade do alvo. A projeção é somente leitura e não
   recebe endpoint de mutação.
7. Cobrir com testes de service e integração de gateway: entrada pelos dois códigos, regeneração
   independente, alteração de papel, negações do espectador, ausência de rolagem privada e
   diferenciação entre projeção de mestre e projeção do jogador-alvo.

## Critérios de Aceite

- O mesmo usuário entra como `JOGADOR` com um código e como `ESPECTADOR` com o outro em cenários
  isolados; nenhum corpo forjado muda esse resultado.
- Espectador recebe uma rolagem pública por REST e WebSocket, mas não encontra rolagem privada,
  ficha ou rota de escrita, inclusive chamando a API diretamente.
- Prévia de jogador omite uma ficha que o alvo não pode ver, mesmo quando o mestre pode vê-la.
- Testes de backend e `lint` passam; a migração e os SQLs revisados obedecem o filtro explícito
  `is_deleted = false` e os parâmetros nomeados.

## Fora de Escopo

- Construção das telas, rotas e componentes Angular.
- Iniciativa/Encontro, chat, transmissão ou acesso sem login.

## Dependências

- `m8-01-papel-convite-contratos`.
- `m3-27-historico-rolagem`, `m3-51-permissoes-granulares-acesso` e `tempo-real`.

## Riscos e mitigação

- Não filtrar no frontend para “simular” o alvo: a query recebe `usuarioAlvoId` somente após a
  service comprovar que o requisitante é mestre, e o repository recebe o id do alvo no DTO interno.
