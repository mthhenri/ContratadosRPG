# ui-33-esquadrao-aba-detalhe-jogador.spec.md

> Reorganiza o painel lateral da ficha do jogador (`detalhe-jogador`): funde Rolar+Histórico
> numa aba "Rolagens", remove a aba "Sessão" dedicada, renomeia "Invent." para "Inv. Esquadrão"
> e traz a Equipe para dentro do painel como uma aba "Esquadrão" com avatares bem maiores.
> Validado antes num mockup solto (`poc-jogador.html`, fora do repositório) ao longo de várias
> rodadas de ajuste com o autor; esta spec porta o resultado para o código real.

## Objetivo

Hoje a lateral do jogador tem dois blocos: o cartão `Equipe` (sempre visível, avatares de 28px)
e o painel segmentado de 4 abas (Rolar/Sessão/Histórico/Invent.). São muitos blocos competindo
por espaço vertical e os avatares da Equipe são pequenos demais para reconhecer o colega numa
mesa em andamento. O ajuste consolida tudo num único painel de 3 abas — Rolagens, Esquadrão,
Inv. Esquadrão — e aumenta bastante o avatar de cada ficha na aba Esquadrão, sem perder nenhuma
regra hoje coberta pelo cartão Equipe (múltiplas fichas por colega, ficha sem acesso, colega sem
ficha, preview de avatar no hover).

**Análogo aprovado**: a própria estrutura atual da página, reaproveitada e realocada — não um
componente novo. `&__equipe-*` (`detalhe-jogador.page.scss:404-603`) fornece toda a lógica visual
da lista de colegas; `&__painel-lateral` + `app-segmentado`/`app-segmentado-item`
(`detalhe-jogador.page.html:489-519`) fornecem o shell de abas, no mesmo padrão já usado por
`detalhe-mestre__painel-lateral`. O nome "Esquadrão" para a aba também já é convenção do produto:
a visão do mestre já tem uma seção chamada exatamente `Esquadrão`
(`detalhe-mestre.page.html:112`) — a aba nova do jogador adota o mesmo nome em vez de inventar
um segundo termo para o mesmo conceito.

## Entregáveis

1. **Painel de 3 abas.** `app-segmentado` da lateral do jogador passa de 4 itens para 3, nesta
   ordem: `Rolagens` (ícone `dado`), `Esquadrão` (ícone `agente`), `Inv. Esquadrão` (ícone
   `inventario`). `painelLateralAtivo()` passa a aceitar `'rolar' | 'esquadrao' | 'inventario'`.

2. **Aba "Rolagens" = Rolar + Histórico fundidos.** Dentro do mesmo container rolável
   (`appOverflowFade`), nesta ordem: toggle "Rolagem oculta", `app-ficha-rolagens-painel` (igual
   ao `&__painel-rolar` de hoje), um rótulo de seção "Histórico", e a lista completa de
   `dados.rolagensFeed()` com seu skeleton e estado vazio (conteúdo idêntico ao `&__painel-historico`
   de hoje, sem mudança de regra). Rolar continua no topo — ver uma rolagem que acabou de sair não
   pode exigir trocar de aba.

3. **Aba "Sessão" deixa de existir como aba.** O link "Iniciativa" (hoje rodapé da aba Sessão) sobe
   para o topo do painel, ao lado do `app-segmentado`, sempre visível independente da aba ativa —
   mesmo tratamento do botão de Iniciativa que já existe na visão do mestre. O feed de
   `rolagensRecentes()` (rolagens da última hora) é removido: fica coberto pelo feed completo de
   Histórico, agora sempre a uma aba de distância.

4. **Aba "Inv. Esquadrão" sem mudança de comportamento.** Mesmo `app-inventario-esquadrao` de
   hoje; só o rótulo do item do segmentado muda de "Invent." para "Inv. Esquadrão".

5. **Cartão `Equipe` vira aba "Esquadrão".** O cartão `.detalhe__equipe` sempre-visível é removido;
   seu `<ul appOverflowFade>` de colegas passa a viver dentro do novo `&__painel-esquadrao`, sem
   o `<h2>Equipe</h2>` de cabeçalho próprio (o rótulo já está na aba). Preserva **sem alteração de
   regra** tudo que a lista já cobre hoje: cabeçalho do mestre, colega sem ficha ("Sem ficha nesta
   campanha"), múltiplas fichas por colega, ficha `tipo: 'completa'` (botão clicável que troca
   `fichaExibidaId`) vs. ficha sem acesso (carteirinha não interativa com `classeTexto`), e o
   preview ampliado de avatar no hover sustentado (`agendarPreviewAvatar`/`cancelarPreviewAvatar`/
   `.detalhe__avatar-preview`).

6. **Avatar da ficha muito maior.** `&__equipe-ficha-avatar` sai de 28px para um tamanho grande o
   bastante para reconhecer o colega à distância da mesa — referência validada no mockup: 80px,
   com o raio do cartão (`var(--radius-card)`) em vez do raio de controle atual. Mantém: moldura
   **quadrada** (nunca circular), borda tingida por `--cor-ficha`, textura listrada quando sem
   imagem, e a `<img>` com `object-fit: cover` para quando há imagem. O tamanho final é o que
   couber confortavelmente no critério de altura do item 7 ao vivo — 80px é ponto de partida, não
   valor final travado.

7. **Altura da aba Esquadrão acompanha a ficha ao lado, só no desktop.** Em telas onde a lateral
   fica ao lado da ficha (acima de `bp.tablet`, 1080px — ou seja, só no viewport `1920×1080`; em
   `960×1080` e `360×800` a lateral já empilha abaixo da ficha por `bp.tablet`/`bp.mobile`), o
   `max-height` da lista de colegas é ajustado para que a altura do painel fique próxima da altura
   do cartão da ficha ao lado — com folga visível abaixo do último colega, não ajustado no limite
   exato. Em `960×1080` e `360×800` a lista usa um teto de altura independente, dimensionado para
   o próprio conteúdo empilhado (não replica o cálculo do desktop).

## Critérios de Aceite

1. Testes focados cobrem a troca de abas (3 itens, não 4), a fusão Rolar+Histórico e a ausência de
   `rolagensRecentes()`/aba Sessão; a suíte do frontend passa.
2. Em execução real, a lateral do jogador é observada em `1920×1080`, `960×1080` e `360×800`,
   percorrendo as 3 abas e, dentro de Esquadrão, os estados: colega com ficha ativa (destacada),
   colega sem ficha, ficha sem acesso (carteirinha), e hover no avatar (preview ampliado aparece e
   não é cortado pela `mask-image` da lista — mesma armadilha já documentada no Esquadrão do
   mestre).
3. Nenhum dos três viewports tem rolagem horizontal ou corte de conteúdo; no mobile os alvos de
   toque da ficha do colega mantêm `bp.$alvo-toque` (44px).
4. Em `1920×1080`, a altura do painel segmentado (aba Esquadrão ativa) fica visivelmente próxima
   da altura do cartão `.detalhe__ficha-embutida` ao lado, com folga perceptível abaixo do último
   colega — não uma coincidência exata de pixel.
5. A comparação visual usa a estrutura atual de `&__equipe-*` e `detalhe-mestre__painel-lateral`
   como análogo (shell, densidade, iconografia, tokens); nenhuma classe nova reinventa o que essas
   duas já resolvem.

## Fora de Escopo

- Mudar regra, permissão ou dado de vitalidade, ficha ou inventário do esquadrão.
- Adotar `enquadramento-imagem`/`foco-imagem` no avatar da lista (a imagem já usa `object-fit:
  cover` simples hoje; trocar o enquadramento é tarefa própria, não incluída aqui).
- Redesenhar a visão do mestre ou o grid "Esquadrão" que já existe lá.
- Mudar o cabeçalho do mestre na lista (`chip-papel` "Mestre" + nome) — mantém o padrão visual
  atual; o mockup testou uma linha única "Nome (Mestre)" só como atalho de protótipo, não como
  decisão aprovada.

## Dependências

- `docs/design/DESIGN.md` e `docs/design/tema/` para tokens e convenções de shell.
- `frontend/src/app/shared/ui/segmentado/` (`app-segmentado`, `app-segmentado-item`) — primitivo
  já em uso, sem mudança de contrato.
- `detalhe-jogador.page.scss:404-603` (`&__equipe-*`) e `:605-704` aprox. (`&__painel-lateral` e
  abas atuais) como base a realocar, não a reescrever do zero.

## Riscos e Mitigação

- Remover a aba "Sessão" descarta o feed de rolagens da última hora; se algum fluxo depender dele
  além do link de Iniciativa (que é preservado), reavaliar antes de remover — verificar com
  `git log`/`HISTORY.md` se há uma decisão de produto específica por trás desse feed além da
  redundância com o Histórico completo.
- Aumentar o avatar de 28px para ~80px reduz a largura disponível para nome/vida/energia; testar
  com nomes longos (o mockup encontrou truncamento nesse ajuste) e preferir quebra de linha a
  `text-overflow: ellipsis` se o texto não couber.
- O cálculo de altura por breakpoint (item 7) é fácil de acertar só no viewport testado por
  último; conferir os três viewports do gate visual nesta ordem — 360×800, 960×1080, 1920×1080 —
  depois de qualquer ajuste de `max-height`, não só o desktop.
