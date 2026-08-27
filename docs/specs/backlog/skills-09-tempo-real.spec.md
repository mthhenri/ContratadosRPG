# skills-09-tempo-real.spec.md

> Task 9/9 do guarda-chuva `skills-agentes.spec.md`. Skill nova: `tempo-real`.

## Objetivo

Criar a skill `tempo-real`, que responde a pergunta que o projeto erra com frequência: **quando um
dado muda, quem precisa saber?** Cobre a arquitetura de broadcast (gateway, salas, permissão) e a
lista de consumidores derivados que precisam ser atualizados junto.

## Motivação

O modelo é simples de descrever e fácil de furar:

- Escrita só por REST; o gateway é **broadcast-only** e nunca recebe mutação
  (`CONVENTIONS.md`, "Gateway"; `SYSTEM.SPEC.md` — v1 sem escrita por WebSocket).
- A permissão de sala é arbitrada pela **service dona** do recurso; o gateway nunca duplica regra
  de permissão.
- A emissão acontece **depois** da mutação bem-sucedida, na service.

E há uma dependência real, registrada em `MEMORY.md` §2, que ninguém adivinha lendo o gateway:
`CampanhaGateway.emitirFichaAlterada` chama `EncontroService.sincronizarFichaAlterada` para
ressincronizar a Iniciativa quando a ficha muda fora do `EncontroService` (ficha flutuante etc.).

O sintoma de errar isso é `P-030`: a ficha mostra um valor e o painel do mestre/Iniciativa mostra
outro, porque os consumidores derivados (`FichaService.paraResumoPublico`,
`encontro-combatente.mapper.ts`) não acompanharam a mudança. `P-026` (resolvido) foi da mesma
família — fallback do mestre na Iniciativa ignorando um amplificador.

## Entregáveis

1. **`tempo-real/SKILL.md`** nas duas pastas, cobrindo:
   - **Regras invioláveis:** escrita só por REST; gateway broadcast-only; permissão de sala pela
     service dona; emissão só após mutação bem-sucedida; nenhuma regra de permissão duplicada em
     gateway ou controller.
   - **Mapa de propagação** — o que existe hoje: quem emite, qual evento, qual sala, quem escuta
     no frontend (`frontend/src/app/shared/tempo-real/`), e a ponte
     `emitirFichaAlterada → EncontroService.sincronizarFichaAlterada`. Montar conferindo o código
     real de `backend/src/core/gateway/` e dos services que emitem, não pela memória do
     `MEMORY.md`.
   - **Checklist "quem mais precisa saber?"** ao alterar um dado de ficha: a própria ficha, o
     resumo público (`FichaService.paraResumoPublico`), o mapper do Encontro
     (`encontro-combatente.mapper.ts`), o mini-card do painel do mestre, a Iniciativa, a ficha
     flutuante, e a revelação/ocultação (`encontro-revelacao.ts`). É a lista que `P-030` mostra
     que não estava sendo percorrida.
   - **Reconexão:** o cliente refaz a busca ao reconectar — evento perdido durante a queda não é
     recuperado por replay; consequência para quem projeta uma mudança nova.
   - **Como verificar:** ponteiro para a skill `verify` (dois usuários simultâneos, mestre e
     jogador; handshake com JWT em `auth.token`; join por polling antes do upgrade; derrubar o
     backend e alterar direto no Postgres para provar que a atualização veio do refetch). Se
     `skills-03` mover esse conteúdo para `verify/references/tempo-real.md`, apontar para lá —
     **nunca** duplicar.
2. **Ponteiros** para `CONVENTIONS.md` ("Camadas — Regras Rápidas", Gateway), `MEMORY.md` §2 e
   `SYSTEM.SPEC.md` (§14 de permissão de sala, §9 de reconexão — conferir a numeração antes de
   citar).
3. **`description` como gatilho**: tempo real, WebSocket, socket, broadcast, gateway, evento,
   sala, sincronizar, "o outro usuário não vê", "não atualiza sozinho", painel do mestre
   desatualizado.
4. **Corte de tamanho**: se passar de ~150 linhas, mover o mapa de propagação para
   `tempo-real/references/mapa-de-propagacao.md` nas duas pastas.

## Critérios de Aceite

- O mapa de propagação foi montado a partir do código atual, e cada emissor, evento, sala e
  consumidor citado existe (conferir com `grep`). Divergência encontrada entre o código e o
  `MEMORY.md` §2 vira nota no fecho.
- Nenhum trecho de `verify` duplicado — só ponteiro.
- O checklist "quem mais precisa saber?" nomeia arquivos e símbolos reais, não categorias vagas.
- **Validação por uso:** percorrer a skill sobre `P-030` (sem corrigir) e confirmar que o
  checklist teria apontado `paraResumoPublico` e `encontro-combatente.mapper.ts` como
  consumidores esquecidos. Depois percorrer sobre uma mudança de ficha que **funciona** hoje em
  tempo real, exercitada ao vivo com dois usuários pela `verify`, e confirmar que o mapa descreve
  o que de fato acontece. Registrar os dois exercícios no fecho.
- `diff -r .claude/skills .agents/skills` vazio.
- Fecho completo conforme `AGENTS.md`.

## Fora de Escopo

- **Corrigir `P-030`** — é `ficha-resumo-stats-efetivos.spec.md`, que centraliza o cálculo
  efetivo numa função pura compartilhada. Continua aberto depois desta task.
- Alterar gateway, service, mapper ou qualquer código de propagação.
- Propor escrita por WebSocket — decisão adiada e registrada em `SYSTEM.SPEC.md` ("Fora de
  escopo / decisões adiadas").
- Cobrir a mecânica de teste de socket em detalhe (cliente cru, `pingInterval`/`pingTimeout`,
  `io server disconnect`) — isso é conteúdo de `verify`.

## Dependências

- `skills-03` (`verify` alinhada), porque esta skill aponta para ela e pode depender do
  `references/tempo-real.md` criado lá.
- `skills-07` (`regras-do-jogo`) tem sobreposição na armadilha stored vs efetivo: `regras-do-jogo`
  trata do **cálculo**, `tempo-real` do **caminho até cada consumidor**. Se as duas forem feitas,
  uma referencia a outra em vez de repetir a explicação; a que for implementada primeiro é a dona
  do texto.

## Riscos e Mitigação

- **Mapa desatualizado no dia seguinte.** Mitigado por descrever o mecanismo e nomear os arquivos,
  em vez de listar cada evento existente com sua carga — e por incluir o comando/caminho para
  redescobrir o mapa (`backend/src/core/gateway/`, `grep` por `emitir`).
- **Sobreposição com `regras-do-jogo` e `verify`.** Mitigada pela divisão declarada em
  "Dependências" e no "Fora de Escopo"; três skills repetindo a mesma armadilha é o mesmo defeito
  que esta fila inteira existe para corrigir.
