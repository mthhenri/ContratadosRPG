# topbar-renomear-painel-icone-fichas.spec.md

> **Task avulsa (observação do autor usando a topbar, 2026-08-12), não é feature de milestone.**
> O número/slot definitivo (`mN-NN`) fica a critério do autor na revisão de backlog. Nasce de
> `docs/context/IDEAS.md` `I-019`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff da topbar ("Barra de Comando",
> `m2-09`) em `docs/design/tema/`. O sistema de ícones do projeto é **todo SVG inline desenhado à
> mão** (`frontend/src/app/shared/icone/icone.component.ts`/`.html`, comentário de topo do
> componente) — sem lib externa, sem emoji cru (proibição #29). Um ícone novo é um traço novo no
> mesmo estilo monocromático `stroke: currentColor` dos demais, não uma importação.

## Objetivo

Três ajustes pontuais na topbar (`shared/layout/layout.component.html`), todos de baixo custo:

1. Renomear o item de nav `/painel` de **"Painel"** para **"Campanhas"**.
2. Dar a **Fichas** (`/fichas`) um ícone próprio, diferente do usado por **Perfil**.
3. Remover o link duplicado **"Campanhas"** de dentro do menu de perfil.

## Estado atual (o que existe)

`frontend/src/app/shared/layout/layout.component.html`:

- Linha 20-23: item de nav para `/painel`, ícone `nome="campanhas"`, rótulo **"Painel"**.
- Linha 24-27: item de nav para `/fichas`, ícone `nome="agente"`, rótulo **"Fichas"**.
- Linha 81-83 (dentro do dropdown de perfil, `topbar__perfil-menu`): item **Perfil**
  (`routerLink="/perfil"`), também com ícone `nome="agente"` — **o mesmo** glifo do item de nav
  Fichas, acima.
- Linha 84-92 (mesmo dropdown): item **Campanhas** (`routerLink="/painel"`, ícone
  `nome="campanhas"`) — link duplicado para a mesma rota que o item de nav "Painel"/"Campanhas" já
  cobre fora do dropdown.
- `IconeNome` (`shared/icone/icone.component.ts:25`) é uma união de literais de string; cada valor
  tem seu `<svg>` correspondente no template do componente (`icone.component.html`). Não existe
  hoje nenhum glifo pronto de "ficha"/"documento de personagem" para reaproveitar.

## Entregáveis

1. **Renomear nav.** Trocar o texto do item de `/painel` (linha 22) de `Painel` para `Campanhas`.
   O ícone `campanhas` já usado nesse item continua fazendo sentido para o rótulo novo — não
   precisa trocar.
2. **Ícone próprio de Fichas.** Desenhar um novo valor de `IconeNome` (ex.: `ficha`) — um traço no
   mesmo estilo monocromático dos demais ícones (`stroke: currentColor`, sem preenchimento sólido
   nem cor hardcoded), sugestão temática "cartão/ficha de personagem" (ex.: retângulo vertical com
   uma ou duas linhas internas, evocando um cartão de identificação). Trocar `nome="agente"` por
   `nome="ficha"` só no item de nav `/fichas` (linha 25) — o ícone `agente` continua usado no item
   **Perfil** do dropdown (linha 82) e em qualquer outro lugar do app que já o usa, sem mudança ali.
3. **Remover duplicata do menu de perfil.** Apagar o `<a>` "Campanhas" do dropdown de perfil
   (linhas 84-92) — a navegação para `/painel` já está coberta pelo item de nav principal (agora
   renomeado "Campanhas", entregável 1). O dropdown de perfil passa a ter só Perfil, o seletor de
   tema e Encerrar sessão.
4. Atualizar o comentário de topo de `Layout` (`layout.component.ts:19`, "nav (Painel/
   Calculadora)...") se o texto citar o rótulo antigo "Painel".

## Critérios de Aceite

- O item de nav antes rotulado "Painel" aparece como **"Campanhas"**, mesma rota (`/painel`), mesmo
  destaque `routerLinkActive`.
- O item de nav **Fichas** usa um ícone **diferente** do item **Perfil** do dropdown — os dois não
  são mais visualmente idênticos.
- O ícone novo segue a identidade "Terminal de Contenção": só `stroke: currentColor`, sem hex
  solto, coerente em tamanho/traço com os demais ícones da topbar (comparação lado a lado).
- O dropdown de perfil não tem mais nenhum link para `/painel` — só Perfil, Tema e Encerrar sessão.
- Nenhuma rota, permissão ou comportamento de navegação muda — só rótulo, ícone e remoção de link
  redundante.
- `frontend`: suíte verde (specs de `layout.component` e `icone.component`, se existirem/cobrirem
  esses textos/ícones, atualizadas), lint limpo.
- Gate visual (skill `verify`, `1920×1080` e `360×800`): nav com o rótulo novo e o ícone novo sem
  overflow/quebra; dropdown de perfil sem o link removido, nos dois viewports.

## Fora de Escopo

- Qualquer redesenho maior da topbar ou do dropdown de perfil além dos três pontos acima.
- Trocar o ícone do item Perfil — ele mantém `agente` (representa o usuário logado).
- Novos ícones para qualquer outro item da nav (Calculadora, Documentos, Admin) — fora do pedido.

## Dependências

- `frontend/src/app/shared/layout/layout.component.html`/`.ts`.
- `frontend/src/app/shared/icone/icone.component.ts`/`.html` (novo valor de `IconeNome` + SVG).
- `docs/design/DESIGN.md`/`docs/design/tema/` para a identidade visual do ícone novo.
