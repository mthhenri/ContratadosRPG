# m7-06-frontend-visao-jogador.spec.md

> Task 6/8 do milestone `m7-encontro-combate.spec.md`.

## Objetivo

Dar ao jogador a **visão espectador** do encontro, ao vivo, e fechar o fluxo em que ele **rola a
própria iniciativa**. O jogador vê; quem conduz é o mestre.

## Entregáveis

1. **Visão espectador**: mesma tela da `m7-05` em modo leitura — ordem, turno atual, rodada, estado
   dos combatentes — **sem** os controles de condução (`Voltar`/`Avançar`/`Rolar tudo`/`Encerrar`),
   sem steppers de vida e sem edição de combatente. O mockup já prevê a bifurcação por
   `visaoJogador`; espelhar essa divisão.
2. **Pedido de iniciativa**: quando o mestre dispara o pedido (evento da `m7-04`), o jogador recebe
   o chamado e rola a iniciativa **pelo fluxo de rolagem já existente** da própria ficha (teste de
   Destreza + bônus de Iniciativa); o resultado é atribuído ao seu combatente. Sem duplicar o motor
   de rolagem nem o cálculo do bônus.
3. **Tempo real**: assinar a sala `campanha:<id>` e reagir a `encontro:alterado`,
   `encontro:iniciativa-pedido` e ao `ficha:alterada` já existente, no mesmo padrão dos consumidores
   de tempo real atuais (rolagens/ficha). Nada é escrito por WebSocket.
4. **Informação privada**: o jogador não vê o que não teria direito de ver fora do encontro — dados
   de criatura/NPC seguem a regra de revelação existente (`usuario_ficha_acesso`); combatente não
   revelado aparece pela identidade mínima necessária para a ordem de turno.
5. Processo obrigatório de UI (AGENTS.md): análogo aprovado registrado, tokens, `appTooltip`.

## Critérios de Aceite

- Dois usuários simultâneos (mestre + jogador) pela skill `verify`: avançar turno no mestre reflete
  no jogador ao vivo; dano aplicado reflete na ficha e na tela do jogador
- Jogador não tem nenhum controle de condução na tela nem por rota/API
- Criatura não revelada não vaza dados na visão do jogador
- `npm run test -w frontend` verde; `npm run lint -w frontend` limpo

## Dependências

- `m7-05` (tela do mestre e componentes de cartão)
