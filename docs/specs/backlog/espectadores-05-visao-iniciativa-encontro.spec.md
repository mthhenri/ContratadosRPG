# espectadores-05-visao-iniciativa-encontro.spec.md

> Task 5/6 do módulo `espectadores-campanha.spec.md` (M8).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`. O análogo aprovado é a própria **visão
> espectador do jogador** no Encontro (`m7-06-frontend-visao-jogador`, `frontend/src/app/modules/
> encontro`) e o **log da rodada** (`m7-07-frontend-log-encontro`): mesma tela, mesma densidade,
> mesmos cartões de combatente e mesma regra de revelação de NPC — não inventar uma segunda leitura
> do encontro.

## Objetivo

Quando a campanha tem um encontro ativo, dar ao espectador a mesma visão read-only que o jogador já
tem do Encontro — ordem, turno, rodada, cartões de combatente e log da rodada — sem nenhum controle
de condução e sem o pedido de "rolar minha iniciativa" (a conta espectadora não tem ficha vinculada
ao encontro).

## Entregáveis

1. Backend: estender a resolução de capacidades de `espectadores-02` para que a projeção de leitura
   do painel de espectador também aceite consultar o encontro ativo da campanha, reaproveitando o
   mesmo serviço/mapper que já monta a visão do jogador (`m7-04`/`m7-06`) — incluindo a regra de
   revelação de criatura/NPC já existente. Nenhuma query nova filtra combatente no frontend.
2. `CampanhaGateway` mantém o espectador na mesma sala `campanha:<id>` (já concedida em
   `espectadores-02`) e confirma que ele recebe `encontro:alterado` só com o recorte permitido —
   sem eventos de condução que só o mestre deveria receber, se algum existir.
3. Frontend: dentro do Painel do espectador (`espectadores-03`), um gatilho "Ver Iniciativa"
   aparece somente quando há encontro ativo na campanha e abre a mesma composição de tela usada
   pela visão do jogador, em modo espectador — sem `Voltar`/`Avançar`/`Rolar tudo`/`Encerrar`, sem
   steppers de vida, sem edição de combatente e sem o fluxo de "rolar minha iniciativa" (que não se
   aplica: a conta não tem ficha no encontro).
4. A prévia de jogador (`espectadores-04`) herda o mesmo comportamento sem trabalho extra: como ela
   já reutiliza a composição real da visão de jogador, o encontro ativo aparece para o mestre em
   prévia exatamente como o jogador-alvo o veria, log incluído.
5. Testes de service/gateway e de página cobrem: espectador com encontro ativo vê ordem/turno/
   rodada/combatentes/log; NPC não revelado continua oculto para ele; ausência de qualquer controle
   de condução no template e por chamada direta de rota/REST/WebSocket; nenhum pedido de iniciativa
   é disparado para uma conta espectadora.

## Critérios de Aceite

- Com um encontro ativo e um NPC não revelado, a conta espectadora vê ordem, turno, rodada e
  cartões de combatente exatamente como o jogador veria no mesmo momento — NPC oculto continua
  oculto — e o log do encontro chega ao vivo, na mesma forma que chega ao jogador.
- Nenhum controle de condução (avançar turno, aplicar dano, encerrar) existe na tela do espectador
  nem responde a uma chamada direta de rota/REST/WebSocket.
- Sem encontro ativo, o gatilho "Ver Iniciativa" não aparece no Painel do espectador.
- Em execução real, a visão é conferida em `1920×1080` e `360×800` com o mestre avançando o turno em
  paralelo e o espectador recebendo a atualização sem recarregar.
- `npm run test -w backend`, `npm run test -w frontend` e `npm run lint` passam.

## Fora de Escopo

- Revelar ao espectador qualquer dado de combate que o jogador também não veria hoje — este módulo
  não amplia a regra de revelação de `m7-04`/`m7-06`, só estende quem pode ler o resultado dela.
- Qualquer forma de condução por espectador (avançar turno, pedir iniciativa, aplicar dano) — segue
  exclusiva do mestre.
- Alterar a tela do mestre ou a do jogador; a composição é reaproveitada, não modificada.

## Dependências

- `espectadores-02-backend-permissoes-projecoes` e `espectadores-03-frontend-painel-visualizador`.
- `m7-04-backend-encontro-conducao`, `m7-06-frontend-visao-jogador`, `m7-07-frontend-log-encontro`
  e `m7-13-acesso-iniciativa-campanha-jogador`.
- `docs/design/DESIGN.md` e skill `verify`.

## Riscos e mitigação

- **Vazar controle de condução ao reaproveitar a tela do jogador:** a composição usada pelo
  espectador nunca recebe os handlers de rolagem/condução do mestre nem o pedido de "rolar minha
  iniciativa" — a conta não tem ficha vinculada ao encontro, então esse fluxo simplesmente não tem
  alvo, mas o teste precisa provar isso, não só supor.
- **Duas leituras do mesmo encontro divergindo com o tempo:** por reaproveitar o mesmo serviço/
  mapper do jogador em vez de duplicar a projeção, uma mudança futura na regra de revelação vale
  para os dois automaticamente.
