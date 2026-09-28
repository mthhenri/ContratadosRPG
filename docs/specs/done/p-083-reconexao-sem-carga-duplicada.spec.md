# p-083-reconexao-sem-carga-duplicada.spec.md

> Task 2/6 de requests-correcoes. Origem: P-083.

## Objetivo

Refazer leituras quando a conexão retorna durante a vida de um consumidor, sem interpretar
uma reconexão antiga como um novo evento ao abrir uma tela.

## Entregáveis

1. Definir mecanismo comum em `frontend/src/app/core/services/tempo-real.service.ts` para
   observar reconexões posteriores à assinatura/montagem. A primeira conexão não é reconexão;
   montar consumidor depois de uma reconexão não dispara recuperação adicional.
2. Migrar todos os usos atuais de `reconexao()`: detalhe de campanha, prévia de jogador,
   fichas jogador/criatura, painel de Encontro e janelas de histórico/anotações. Buscar também
   novos consumidores na implementação. Assinaturas encerram com o consumidor.
3. Tratar corrida entre assinatura, carga inicial e reconexão: não perder a reconexão real,
   nem aceitar resposta de leitura anterior à queda como estado final. No máximo uma
   recuperação vigente por recurso para a mesma reconexão, coordenada com a carga em andamento.
4. Preservar reingresso nas salas e isolamento entre sessões/logout. Não resolver apenas
   zerando contador no logout; navegar na mesma sessão também precisa funcionar.

## Critérios de Aceite

- Testes: primeira conexão, montar antes/depois de reconnect, dois reconnects sucessivos,
  destruir/remontar consumidor, logout/login e reconnect durante GET inicial lento.
- Reproduzir queda efetiva do socket, voltar, sair e reabrir campanha: membros e fichas
  são buscados uma vez cada na carga da nova tela; baseline de 8 cai para 6 GETs antes da task 6.
- Nova reconexão com tela aberta ainda provoca recuperação. Abrir ficha completa após
  reconexão anterior não duplica seu GET inicial. Repetir jogador/criatura e testar prévia/janelas.
- Cobrir cada consumidor migrado com teste focado; gate comum e navegador conforme guarda-chuva.

## Fora de Escopo

Escolher recursos adicionais a recuperar (P-084), reduzir invalidações de mutação,
replay no servidor, cache global e alterar o protocolo Socket.IO.

## Dependências

Nenhuma obrigatória. Fontes e gates do guarda-chuva; relatório P-083.
