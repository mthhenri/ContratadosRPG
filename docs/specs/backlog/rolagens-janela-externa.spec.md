# rolagens-janela-externa.spec.md

> Task avulsa. Origem: `IDEAS.md` `I-027` — janela externa para histórico de rolagens, anotações
> da ficha e Caderno da campanha. Esta é a 1ª das 3 fatias decididas com o autor (2026-09-22):
> Histórico → Anotações → Caderno, do menos pro mais acoplado à feature. Estabelece o padrão de
> rota isolada e o header mínimo que as duas fatias seguintes vão reusar.

## Objetivo

Permitir abrir o histórico de rolagens de uma ficha numa janela separada do navegador
(`window.open`), sincronizada em tempo real (WebSocket) com a aba principal, sem depender dela
continuar aberta.

## Entregáveis

1. **Rota isolada nova**, fora do shell da aplicação (sem topbar completa): `/janela/ficha/:fichaId/historico-rolagens`,
   guardada só por `autenticacaoGuard` (a permissão de ver esta ficha específica continua arbitrada
   pelo backend, igual a `/fichas/:id` hoje — sem guard extra no frontend).
2. **Generalização de `Layout.rotaIsolada()`** (`shared/layout/layout.component.ts:83`): hoje só
   reconhece `/acesso-negado`; passa a reconhecer qualquer rota sob `/janela/` também
   (`startsWith('/acesso-negado') || startsWith('/janela/')`). É o mecanismo que já existe pra pular
   a topbar completa — reusado, não reescrito. As duas fatias seguintes (Anotações, Caderno) vão
   cair sob o mesmo prefixo `/janela/` sem precisar tocar `Layout` de novo.
3. **Header mínimo compartilhado**, novo componente `shared/ui/` (ex.: `JanelaExternaCabecalho`,
   API a definir na implementação: um `input()` de texto de contexto — "Ficha de <nome>" nesta
   fatia — e um link/botão de volta): faixa fina no topo da janela com `app-marca` + o texto de
   contexto (fonte mono, mesma identidade da topbar) + link para fechar a janela ou voltar à ficha
   na aba principal (decisão de implementação: usar `window.close()` quando a janela foi aberta por
   `window.open`, com fallback de link se não for possível fechar via script). Desenhado pra ser
   reusado pelas fatias de Anotações/Caderno sem mudança de API — só o texto de contexto muda.
4. **Página nova** `HistoricoRolagensJanela` (`modules/ficha/paginas/`, nome a definir): lê `fichaId`
   do parâmetro de rota, replica o mesmo fluxo já usado por `visualizar.page.ts` para o histórico —
   `RolagemService.listarPorFicha` (1ª página síncrona no `constructor`), `TempoRealService.conectar()`
   + `entrarSalaFicha(fichaId)` + `destroyRef.onDestroy(() => sairSalaFicha(fichaId))`, e assina
   `rolagemRegistrada$`/`rolagemExcluida$` pra manter a lista viva (mesmo dedupe pelo topo do array
   que `onRolagemRegistrada` já faz). Nenhuma lógica nova de rolagem — só a mesma extraída pra uma
   página que serve sozinha.
5. Renderiza `HistoricoRolagensSidebar` em modo **`[fixo]="true"`** (já existe, usado hoje por
   Iniciativa do mestre) — preenche a janela inteira, sem gatilho, sem fundo, sem botão de fechar
   próprio (o fechar é da janela, via header do item 3).
6. **Botão "Abrir em janela"** no histórico de rolagens já existente (`HistoricoRolagensSidebar`, no
   painel sobreposto que a ficha usa hoje — não no modo `fixo`): `window.open('/janela/ficha/:id/historico-rolagens', '_blank', 'width=420,height=720,noopener')`.
   Aparece só onde faz sentido (painel sobreposto da ficha do jogador e da criatura — não no modo
   `fixo` da Iniciativa, que já é uma coluna fixa própria).

## Critérios de Aceite

1. Rolar um teste na aba principal (ficha aberta) e ver a rolagem aparecer no topo da janela
   externa sem reload — verificado ao vivo com dois contextos de navegador (duas abas reais, não
   só duas rotas), plantando `window.__sentinela` na janela externa e confirmando que ela sobrevive
   (nenhum reload).
2. Fechar a aba principal **não** derruba a janela externa (cada uma com sua própria conexão
   WebSocket, join de sala independente).
3. Abrir a janela sem permissão de ver a ficha (usuário sem acesso) recebe o mesmo tratamento que
   `/fichas/:id` recebe hoje (o backend nega o REST/join de sala; nenhum dado vaza).
4. Gate visual (`CLAUDE.md`): análogo aprovado é a topbar (`shared/layout/layout.component.html`,
   uso de `app-marca` + fonte mono) para o header mínimo, e o próprio `HistoricoRolagensSidebar`
   modo `fixo` (já em produção via Iniciativa do mestre) para o corpo. Rodar `verify` em `1920×1080`
   e `360×800` — mesmo sendo um recurso majoritariamente desktop, a janela pode ser redimensionada
   ou aberta num navegador mobile, então não pode quebrar lá. Conferir: sem overflow, header não
   compete por espaço com a lista, scroll só na lista (nunca na janela inteira), botão "Abrir em
   janela" com alvo de toque OK no mobile.
5. `npm run test --workspace=frontend` (suíte do que for tocado) e `npm run lint --workspace=frontend`
   verdes.

## Fora de Escopo

- Anotações da ficha e Caderno em janela externa — fatias 2 e 3 desta mesma ideia, cada uma sua
  própria spec depois desta fechar.
- Fechar a janela automaticamente se o usuário perder acesso à ficha enquanto ela está aberta (a
  ideia registra isso como possível melhoria futura, não critério desta fatia).
- Qualquer mudança de comportamento do histórico de rolagens **dentro** da aba principal — o painel
  sobreposto continua exatamente como está, só ganha o botão novo do item 6.
- Sincronizar estado de UI (ex.: filtro aplicado) entre a aba principal e a janela externa — cada
  uma tem seu próprio estado local; só o dado do servidor (rolagens) é compartilhado, via WebSocket.
- Extrair `historico-rolagens-sidebar` pra dentro de `shared/ui/` formalmente (cogitado na
  investigação de `I-027`, mas já está em `shared/` e funciona bem onde está — não é bloqueio desta
  fatia).

## Dependências

Nenhuma spec precisa estar em `done/` antes. Consulta `docs/design/DESIGN.md` (identidade visual,
tokens) e o componente análogo `shared/layout/layout.component.html` antes de desenhar o header.

## Riscos e Mitigação

- **Duas conexões WebSocket por usuário** (aba principal + janela) — aceito conscientemente na
  decisão da ideia (opção A escolhida sobre B, que evitava isso); sem mitigação nesta fatia.
- **`window.open` bloqueado por pop-up blocker** se não for chamado num handler de clique direto —
  o botão "Abrir em janela" precisa chamar `window.open` síncrono dentro do próprio `(click)`, sem
  `await`/`setTimeout` no meio, para não ser bloqueado pelo navegador.
