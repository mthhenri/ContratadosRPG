---
name: tempo-real
description: >
  Alterar ou investigar tempo real, WebSocket, socket, broadcast, gateway, evento, sala ou
  sincronizar; use quando o outro usuário não vê uma mudança, algo não atualiza sozinho ou o
  painel do mestre está desatualizado. Mapeia quem emite, quem escuta, permissões e consumidores
  derivados antes de tocar em uma mutação.
---

# Tempo Real — Propagação, Permissão e Consumidores

> A regra canônica está em `docs/SYSTEM.SPEC.md` §9 (tempo real) e §14 (permissões de sala), e o
> resumo arquitetural em `docs/CONVENTIONS.md` (“Camadas — Regras Rápidas”, Gateway). O mapa de
> localização persiste em `docs/context/MEMORY.md` §2. Esta skill conduz a investigação; não
> reescreve o contrato nem autoriza escrita por socket.

## 1. Regras invioláveis

- Escrita entra somente por REST: controller fino → service dona → repository. O gateway é
  **broadcast-only** e nunca recebe mutação.
- A service emite somente **depois** da mutação bem-sucedida; nenhum evento compensa falha de
  persistência.
- Handshake usa JWT e entrada em sala consulta a service dona: `FichaService.recuperarFicha` para
  `ficha:<id>` e `CampanhaService.recuperarCampanha` para `campanha:<id>`. Não replique autorização
  em gateway, controller ou frontend.
- Preserve o recorte de cada evento: sala de campanha pode ter membros que não leem a ficha;
  broadcast não é licença para carregar dados privados.

## 2. Descobrir antes de mudar

1. Comece em `backend/src/core/gateway/campanha.gateway.ts`; procure `emitir` e o nome da sala.
2. Procure cada chamada `campanhaGateway.emitir...` nas services. Confirme que fica depois do save.
3. Ache o Observable correspondente em
   `frontend/src/app/core/services/tempo-real.service.ts` e os assinantes em `frontend/src/app/`.
4. Quando a mutação for de ficha, faça também a lista de consumidores derivados da seção 4.
5. Se o mapa divergir de `MEMORY.md` §2, trate o código como estado atual e registre a divergência
   no fecho/contexto; não ajuste o código “para coincidir” com a memória.

## 3. Mapa de propagação atual (conferido no código)

| Emissor pós-mutação | Evento e sala | Consumidor frontend |
|---|---|---|
| `FichaService.criarFicha`/atribuir | `ficha:criada` → `campanha:<id>` (resumo) | `campanha/detalhe` atualiza lista |
| `FichaService.alterarFicha` e ajustes | `ficha:alterada` → `ficha:<id>` (sem campos privados) | `ficha/paginas/visualizar` e `visualizar-criatura` refazem a ficha; `campanha/detalhe` refaz o resumo correspondente |
| Alteração de visibilidade | `ficha:visibilidade-alterada` → `campanha:<id>` | `campanha/detalhe` refaz o recorte autorizado |
| `FichaService.revogarAcesso` | `ficha:acesso-revogado` → `ficha:<id>` | páginas de visualização redirecionam o revogado |
| `CampanhaService.entrarCampanha` | `membro:entrou` → `campanha:<id>` | `campanha/detalhe` refaz membros/fichas |
| Estado ou inventário de campanha | `campanha:estado-alterado` / `campanha:inventario-alterado` → `campanha:<id>` | `campanha/detalhe` atualiza estado ou refaz inventário |
| `RolagemService.registrarRolagem` pública | `rolagem:registrada` → `campanha:<id>`; ficha solta → `ficha:<id>` | detalhe, ficha, criatura e painel de encontro acrescentam ao feed |
| `EncontroService` | `encontro:alterado` / `encontro:iniciativa-pedido` → `campanha:<id>` | `painel-encontro` e `campanha/detalhe` atualizam o estado/chamado |

`CampanhaGateway.emitirFichaAlterada` tem uma ponte deliberada: após transmitir, chama
`EncontroService.sincronizarFichaAlterada(ficha.id, ficha.campanhaId)`. A service retorna sem ação
para ficha avulsa, sem encontro aberto ou sem combatente; caso contrário remonta o encontro e
emite `encontro:alterado`. Ela é o caminho que mantém a Iniciativa consistente quando a alteração
veio de fora do `EncontroService` (ficha flutuante ou ficha aberta).

## 4. Checklist: quem mais precisa saber?

Para qualquer campo de ficha que mudar, confirme explicitamente os itens aplicáveis:

- [ ] A própria ficha: payload de `ficha:alterada`,
  `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.ts` e, quando aplicável,
  `visualizar-criatura.page.ts`.
- [ ] Resumo público/mini-card: `FichaService.paraResumoPublico` e
  `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`.
- [ ] Combatente da Iniciativa: `backend/src/modules/encontro/encontro-combatente.mapper.ts`.
- [ ] Painel de Iniciativa: `EncontroService.sincronizarFichaAlterada` →
  `CampanhaGateway.emitirEncontroAlterado` → `painel-encontro.page.ts`.
- [ ] Ficha flutuante: a escrita continua em `FichaService`; não crie um caminho paralelo no
  Encontro.
- [ ] Revelação/ocultação: `backend/src/modules/encontro/encontro-revelacao.ts` continua sendo o
  recorte posterior ao mapper, nunca uma decisão do gateway.

Se o campo for um cálculo de jogo stored versus efetivo, aplique também `regras-do-jogo`: esta
skill acompanha o caminho até cada consumidor; aquela decide a fonte e o cálculo. `P-030` é o
exemplo: o checklist revela `paraResumoPublico` e `encontro-combatente.mapper.ts` como os dois
consumidores esquecidos, sem corrigir o problema nesta investigação.

## 5. Reconexão e verificação

Evento perdido não tem replay. `TempoRealService` reingressa em suas salas a cada reconexão e
incrementa `reconexao`; cada tela precisa então refazer seu GET autorizado. Ao desenhar consumidor
novo, assine tanto o evento quanto essa ressincronização, quando a tela mantiver estado carregado.

Para a execução real, siga a seção “Tempo real (WebSocket)” da skill
[`verify`](../verify/SKILL.md): dois usuários (mestre e jogador), JWT em `auth.token`, confirmação
do join pelo POST de polling antes do upgrade, e teste de reconexão derrubando o backend, alterando
o Postgres diretamente e observando o refetch. O roteiro pertence a `verify`; não o copie aqui.

## 6. Fecho

- [ ] Emissor, evento, sala e assinantes foram conferidos com `rg` no código atual.
- [ ] A service dona continua única para permissão e mutação; emissão é pós-save.
- [ ] Checklist de consumidores derivados foi percorrido para cada campo alterado.
- [ ] Reconexão/refetch foi considerado; teste ao vivo com dois usuários foi feito se a mudança
  afetar tempo real.
- [ ] `P-030` foi usado como exercício negativo, sem ser corrigido fora da sua spec.
- [ ] O exercício positivo foi registrado com o cenário real, os dois usuários e o resultado.
