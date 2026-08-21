# m7-09-turno-atual-jogador.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate.

## Objetivo

Deixar explícito, na visão do jogador, **quem está jogando agora** e para quem o turno acabou de
passar. O jogador continua espectador: esta task não cria controle de condução nem muda a mecânica
de rodada.

## Entregáveis

1. Na visão de jogador de `PainelEncontro`, o combatente indicado por `turnoIndice` recebe o mesmo
   destaque semântico de turno atual já usado no painel do mestre, com texto claro de que é a vez
   dele quando o combatente corresponde à ficha do usuário ativo.
2. A mudança chega pelo estado já emitido em `encontro:alterado`; não criar polling, evento paralelo
   ou cálculo de turno no frontend.
3. A indicação deve permanecer correta ao avançar turno, voltar turno, virar rodada e ao receber a
   primeira carga da página.
4. Registrar como análogo o estado `Age agora` do cartão de combatente do painel do mestre. Reusar
   tokens e BEM existentes; nenhum controle de mestre aparece para o jogador.

## Critérios de Aceite

- Em dois usuários simultâneos, avançar no mestre atualiza imediatamente o destaque e a mensagem
  na tela do jogador certo.
- O jogador não recebe botão, endpoint ou outra capacidade de avançar a rodada.
- Verificação visual pela skill `verify` em `1920×1080` e `360×800`, com pelo menos uma virada de
  rodada; sem overflow, contraste ou foco regressivos.
- `npm run test -w frontend` verde e `npm run lint -w frontend` limpo.

## Fora de Escopo

- Alterar a ordem, a Cadência ou a persistência de turnos.
- Notificações push, som ou animação de alerta.

## Dependências

- `m7-06` e `m7-08` (visão do jogador e seu comportamento responsivo).
