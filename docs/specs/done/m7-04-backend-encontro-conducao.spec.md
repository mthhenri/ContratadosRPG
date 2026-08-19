# m7-04-backend-encontro-conducao.spec.md

> Task 4/8 do milestone `m7-encontro-combate.spec.md`.

## Objetivo

Conduzir o combate no backend: iniciar, avançar/voltar turno, virar rodada, aplicar dano/cura e
Energia, gerir condições, registrar o log e **emitir os eventos de tempo real**.

## Entregáveis

1. **Iniciar** (`MONTAGEM` → `ATIVO`): exige todos os combatentes com iniciativa; calcula a ordem
   da rodada com `shared/regras/encontro` e grava `rodada_atual = 1`, `turno_indice = 0`.
2. **Avançar / voltar turno**: percorre a sequência intercalada. Ao passar do último slot, a rodada
   **incrementa**, as condições expiram (`expirarCondicoes`) e a ordem é **recalculada** a partir do
   estado atual — entradas/saídas e ajustes de iniciativa valem da próxima rodada em diante. Um
   combatente com marcador `perdeTurno` tem o turno **consumido** automaticamente, com evento no
   log. `Voltar` é simétrico e não pode retroceder além do primeiro turno da rodada 1.
3. **Vida e Energia — fonte única**: para combatente **com ficha**, dano/cura/Energia mutam a
   **ficha** reusando a operação de ficha já existente (`ficha-operacao.dtos.ts` / `FichaService`),
   nunca uma cópia no encontro; as condições derivadas (`morrendo`/`machucado`/`inconsciente`)
   continuam vindo de `vidaAtual`. Para **avulso**, mutam `vida_atual_avulso`. Não duplicar regra de
   vida — chamar o dono da regra.
4. **Condições**: aplicar/remover marcador com `rodadasRestantes` e `perdeTurno`; expiração
   automática na virada, com evento de `CONDICAO_EXPIRADA`.
5. **Encerrar** (`ATIVO` → `ENCERRADO`): read-only depois disso; as fichas ficam com a vida em que
   pararam (sem reversão).
6. **Log**: cada mutação grava uma linha em `encontro_evento` com rodada/turno e texto legível, no
   espírito do mockup ("sofreu 11 de dano de V. Corvalho", "Rodada 3 iniciada", "ficou Morrendo").
7. **Tempo real** (§9, broadcast-only): novos emissores no `CampanhaGateway`
   (`emitirEncontroAlterado`, `emitirEncontroIniciativaPedido`), chamados pela service **após**
   salvar, na sala `campanha:<id>`. **Nenhum** handler de escrita novo no gateway. Mudança de vida
   de combatente com ficha continua propagando via `ficha:alterada`.
8. **Pedido de iniciativa**: endpoint do mestre que dispara o broadcast pedindo aos jogadores que
   rolem; a rolagem do jogador chega pelo fluxo REST de rolagem e é atribuída ao combatente.
9. **Testes** de service: virada de rodada com expiração, `perdeTurno` consumindo turno, dano em
   ficha chamando o dono da regra, dano em avulso, encerrado é imutável, emissão após salvar.

## Critérios de Aceite

- Avançar percorre a sequência intercalada e vira a rodada corretamente (teste com Cadência Dupla)
- Dano em combatente com ficha altera a **ficha** (nenhum `vidaAtual` duplicado no encontro)
- Toda mutação emite **depois** de persistir; nada entra por WebSocket
- `npm run test -w backend` verde; `npm run lint -w backend` limpo

## Dependências

- `m7-03` (persistência e API de montagem)
