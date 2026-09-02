# m8-06-validacao-integrada.spec.md

> Task 6/6 e gate obrigatório do módulo `m8-espectadores-campanha.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e usar a skill `verify` na aplicação real.

## Objetivo

Fechar o módulo com evidência integrada de que os convites, as permissões, o feed em tempo real e
as duas formas de prévia se comportam corretamente entre contas e em desktop/mobile.

## Entregáveis

1. Cenário e2e reproduzível com mestre, jogador, espectador e uma ficha não compartilhada; usar os
   dois convites reais e registrar uma rolagem pública e outra privada.
2. Teste de regressão de autorização pelas superfícies REST e Socket.IO: espectador só entra na
   sala de campanha permitida, recebe apenas o evento público e não consegue atingir dados/ações
   de ficha, caderno, inventário, campanha ou rolagem.
3. Teste integrado da prévia de jogador comparando a projeção recebida pelo alvo real e pela
   prévia do mestre, com exceção explícita da faixa de contexto e do bloqueio de mutações.
4. Cenário de encontro ativo: mestre inicia um combate com um NPC não revelado; confirmar que o
   espectador vê ordem/turno/rodada/cartões de combatente e log igual ao jogador, o NPC oculto
   continua oculto para ele, e nenhum controle de condução nem "rolar minha iniciativa" aparece ou
   funciona por rota direta (`m8-05`).
5. Inspeção visual pessoal do fluxo completo: gestão de convites/papel pelo mestre, entrada e
   feed do espectador, visão de Iniciativa do espectador, prévia do espectador pelo mestre, e
   prévia de jogador para alvo com/sem ficha. Registrar análogo, estados, viewports, achados e
   correções em `HISTORY.md`.
6. Rodar builds, lint e suítes completas proporcionais de `shared`, `backend` e `frontend`; revisar
   o diff contra todas as seis specs, `SCHEMA.md`, `SYSTEM.SPEC.md` e convenções de DTO/SQL.

## Critérios de Aceite

- O cenário de quatro identidades passa sem dependência de filtro somente no DOM.
- A conta espectadora vê a pública ao vivo e continua sem a privada após recarregar; tentativas
  diretas de exceder a capacidade retornam a negação esperada.
- A prévia do mestre tem o mesmo conteúdo permitido ao jogador-alvo e nenhuma mutação observável.
- A visão de Iniciativa do espectador reflete exatamente o que o jogador veria no mesmo encontro,
  sem controle de condução acessível por nenhuma via.
- `npm run test --workspaces --if-present`, `npm run lint` e os builds aplicáveis passam, separando
  qualquer falha preexistente; os dois viewports obrigatórios estão documentados.

## Fora de Escopo

- Novo produto ou regra de negócio. Esta task só corrige divergências indispensáveis para cumprir
  as cinco tasks anteriores e não amplia a superfície do espectador.

## Dependências

- `m8-01-papel-convite-contratos`, `m8-02-backend-permissoes-projecoes`,
  `m8-03-frontend-painel-visualizador`, `m8-04-preview-jogador-fidedigno` e
  `m8-05-visao-iniciativa-encontro`.
- `docs/design/DESIGN.md`, skill `verify` e `task-flow`.

## Riscos e mitigação

- Teste unitário de template não prova isolamento de dados: o cenário precisa de duas sessões
  autenticadas simultâneas e deve observar REST + WebSocket, além da tela renderizada.
