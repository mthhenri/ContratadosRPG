# m3-77-tempo-real-rolagem-ficha-aberta.spec.md

> Ajuste pós-milestone do M3 — Ficha de Jogador/Criatura. Pedido direto do autor: "websocket na
> visualização da ficha de agente/criatura para emitir que a ficha rolou, então, se eu tiver de
> dentro da ficha visualizando ela, ele aparecer pra mim que ele rolou, atualizando o histórico e
> aparecendo a bandeja pra mim".

## Objetivo

Quem está com a **tela de visualização de uma ficha** aberta (`/painel/:campanhaId/ficha/:id`,
`/fichas/:id` ou a visualização de criatura equivalente) deve ver em tempo real quando aquela ficha
rola um dado por qualquer caminho — inclusive um caminho fora daquela tela (outro cliente logado
como o mesmo dono, o mestre rolando por ela, ou a mesma ficha usada no Encontro). Isso inclui: o
histórico de rolagens da ficha atualizar sozinho, e a **bandeja de dados** (`BandejaDados`) aparecer
mostrando o resultado — sem precisar de F5 nem de sair e voltar à tela.

## Estado atual (gap confirmado)

Hoje isso **não acontece em lugar nenhum** — nem na ficha de agente, nem na de criatura:

1. **A página não entra na sala certa.** `visualizar.page.ts:271-273` e
   `visualizar-criatura.page.ts:180-182` só chamam `entrarSalaFicha(this.fichaId)`. O backend, porém,
   emite rolagem só na sala da **campanha**:
   `backend/src/core/gateway/campanha.gateway.ts:264-269` —
   `emitirRolagemRegistrada` faz
   `this.servidor.to(this.salaCampanha(rolagem.campanhaId)).emit('rolagem:registrada', rolagem)`
   (no-op quando `campanhaId === null`, ficha solta). A sala de ficha
   (`ficha:<id>`) nunca recebe esse evento.
2. **Mesmo entrando na sala certa, ninguém assina o evento.** `TempoRealService` expõe
   `rolagemRegistrada$` (`frontend/src/app/core/services/tempo-real.service.ts:105-106`, alimentado
   por `.on('rolagem:registrada', ...)` na linha 178-180). Os únicos assinantes hoje são
   `campanha/detalhe/detalhe.page.ts:862-864` (tira "Rolagens Recentes") e
   `encontro/paginas/painel/painel-encontro.page.ts:562` (log do Encontro). As páginas de ficha não
   assinam.
3. **`BandejaDados` só é acionada por quem executa a rolagem localmente.** `BandejaDadosService.
   mostrar()` (`frontend/src/app/shared/bandeja-dados/bandeja-dados.service.ts:71-87`) é chamado
   hoje só no momento em que o próprio componente dispara a rolagem (`ficha-visualizacao.component.ts:
   1478/1499/1537`, `criatura-visualizacao.component.ts:638/651/666`, `ficha-rolagens.component.ts:
   435/468`, `painel-encontro.page.ts:1047`). Nenhum assinante de `rolagemRegistrada$` chama
   `bandeja.mostrar()` hoje — nem o de `detalhe.page.ts`, que só atualiza o feed textual.

## Entregáveis

1. `visualizar.page.ts` e `visualizar-criatura.page.ts` passam a assinar `rolagemRegistrada$`
   (mesmo padrão de `painel-encontro.page.ts:562`), filtrando pelo `fichaId` da própria tela — e, para
   ficha vinculada a campanha, garantindo que a sala correta já está sendo escutada (avaliar se basta
   entrar também em `campanha:<id>` quando a ficha pertence a uma, reaproveitando o que
   `entrarSalaCampanha` já faz em outras telas, ou se o backend deve emitir também na sala
   `ficha:<id>` — decidir pelo caminho que menos duplica lógica de sala/revelação existente).
2. Ao receber uma rolagem pertencente à ficha aberta: (a) inserir a entrada no topo do histórico
   local da tela (mesmo formato usado por `HistoricoRolagensSidebar`/feed já existentes, sem duplicar
   se o próprio cliente já tiver adicionado otimisticamente ao executar a rolagem); (b) chamar
   `BandejaDadosService.mostrar()` com o resultado recebido, para quem está olhando a ficha ver o
   resultado aparecer, igual a quem acabou de rolar.
3. Respeitar a mesma regra de visibilidade `PUBLICA`/`PRIVADA` já aplicada no backend — uma rolagem
   `PRIVADA` de outro usuário nunca deve chegar a quem não tem acesso (o backend já filtra isso antes
   de emitir; esta task não abre exceção nova, só consome o que já chega autorizado).
4. Evitar duplicidade quando o próprio usuário é quem rolou (ex.: rolando pela própria ficha aberta):
   a rolagem local já mostra a bandeja e atualiza o histórico pelo caminho síncrono existente — o
   evento de socket que volta pra esse mesmo cliente não deve inserir a entrada duas vezes nem abrir
   a bandeja duas vezes (usar algum identificador de rolagem para deduplicar, mesmo padrão que
   `HistoricoRolagensSidebar`/feeds existentes já resolvem para esse problema, se resolvem — verificar
   e reaproveitar).

## Critérios de Aceite

- Com a ficha de um agente aberta em um cliente, rolar um dado daquela ficha por outro cliente
  (mesmo dono logado em outra aba, ou o mestre rolando por ela onde permitido) faz o histórico da
  tela aberta atualizar e a bandeja de dados aparecer, sem F5.
- O mesmo vale para a ficha de criatura.
- Uma rolagem `PRIVADA` de outra pessoa não aparece para quem não tem acesso, mesmo com a ficha
  aberta.
- Rolar pela própria tela aberta não duplica a entrada no histórico nem abre a bandeja duas vezes.
- `npm run test -w frontend` verde, com teste de regressão para o fluxo de recebimento remoto.
- Verificação pela skill `verify` com **dois usuários simultâneos** (exigência padrão de tempo real
  do projeto): um com a ficha aberta, outro rolando por ela via outro caminho.

## Fora de Escopo

- Mudar o comportamento de `campanha/detalhe` (feed "Rolagens Recentes") ou do Encontro — já
  funcionam, não são tocados.
- Notificar rolagem de fichas que não estão abertas em nenhuma tela (isso seria um sistema de
  notificação global, fora do pedido).
- Mudar a regra de revelação/visibilidade §14 — só consumir o que o backend já autoriza a emitir.

## Dependências

`m3-05` (gateway de tempo real), `m3-27` (histórico de rolagem), `m2-21`/`m7-10`
(`rolagemRegistrada$`/`HistoricoRolagensSidebar` como padrão de consumo já existente).
