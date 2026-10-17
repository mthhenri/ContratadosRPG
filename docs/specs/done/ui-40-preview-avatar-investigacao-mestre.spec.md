# ui-40-preview-avatar-investigacao-mestre.spec.md

> Spec avulsa, fora da fila de milestone. Pedido do autor em 2026-10-14: "na tela de investigação
> ele não tem aquela feature do hover da imagem do agente".

## Objetivo

Dar ao painel de Investigação do mestre (cena sem iniciativa) o mesmo **preview ampliado do avatar
em hover sustentado** que o Esquadrão da campanha, o Acervo, a trilha de turnos e o Esquadrão da
Investigação do jogador já têm. Hoje a coluna "Agentes" de `painel-sem-iniciativa-mestre` usa
`app-espectador-ficha-card` sem ligar `(avatarEntrou)`/`(avatarSaiu)`, então o avatar não amplia.

## Situação atual (levantada em 2026-10-14)

- Diretiva reutilizável `PreviewAvatar` (`frontend/src/app/shared/preview-avatar/preview-avatar.directive.ts`,
  `[appPreviewAvatar]`): 600 ms, quadrado 300 px, portada ao `<body>`, só ponteiro de mouse.
  Já usada em `esquadrao-cena-jogador` e `trilha-turnos`.
- `EspectadorFichaCard` (`modules/campanha/componentes/espectador-ficha-card/`) **não** usa a diretiva:
  emite `avatarEntrou`/`avatarSaiu` e cada página mantém estado e cálculo de posição próprios
  (`detalhe-mestre.page.ts` e `detalhe-jogador.page.ts`, `agendarPreviewAvatar`/`cancelarPreviewAvatar`,
  repassados por `campanha-fichas-abas`).
- Consumidores de `app-espectador-ficha-card`: `campanha-fichas-abas` (com preview),
  `painel-sem-iniciativa-mestre` (**sem**), `espectador.page` (sem) e `painel-espectador.page` (sem).

## Entregáveis

1. O painel de Investigação do mestre amplia o avatar do agente em hover sustentado, com o mesmo
   tempo, tamanho, posicionamento e regras de fechamento do Esquadrão da campanha.
2. Implementação **recomendada**: o próprio `EspectadorFichaCard` passa a aplicar `[appPreviewAvatar]`
   no avatar (quando houver `imagemUrl`), em vez de cada página reimplementar o estado. Se essa via
   for seguida, remover a cópia de estado/cálculo das páginas que só existia para o card
   (`detalhe-mestre`, a parte do card em `detalhe-jogador`, os outputs repassados por
   `campanha-fichas-abas`) — sem mudar o comportamento visível no Esquadrão.
3. Aplicar `gerenciamento-de-impacto` antes de tocar o card: `espectador.page` e
   `painel-espectador.page` passariam a ter o preview "de graça". **Levar ao autor** se essas duas
   telas devem ganhar o preview junto (recomendação: sim, é a mesma foto do mesmo agente) antes de
   aplicar; se não, o card ganha um input para ligar/desligar e só a Investigação liga.
4. Testes do card cobrindo: preview liga com URL, não liga sem URL; testes das páginas que perderem
   o estado próprio ajustados.

## Critérios de Aceite

- Hover sustentado de mouse no avatar de um agente na Investigação do mestre abre o preview 300 px;
  sair, clicar, rolar ou redimensionar fecha. Toque não abre.
- Esquadrão da campanha (mestre e jogador) e Acervo sem regressão visível.
- Testes do frontend dos arquivos tocados verdes, lint limpo, build sem aviso novo.
- Gate visual (`design-fidelity` + `verify`), análogo aprovado: Esquadrão da campanha do mestre.
  `1920×1080` (preview aberto, inclusive num agente perto da borda direita/inferior) e `360×800`
  (sem preview, nada quebrado). `npm run repo:verificar`.

## Fora de Escopo

Preview em criaturas/NPCs, mudar tempo/tamanho do preview, preview por toque.

## Dependências

`docs/design/DESIGN.md`; padrão já entregue em `esquadrao-cena-jogador` e `trilha-turnos`.
