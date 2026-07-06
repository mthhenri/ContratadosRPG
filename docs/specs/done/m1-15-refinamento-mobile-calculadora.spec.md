# m1-15-refinamento-mobile-calculadora.spec.md

> Task 15/14+ do milestone `m1-calculadora-paridade.spec.md` — **refinamento**, adicionada
> após o fechamento da paridade (m1-14). A calculadora está funcional em desktop; esta task
> otimiza a experiência **mobile** das 6 abas, do shell e dos painéis (ajuda/config/carrinho).

## Objetivo

Otimizar ao máximo a **UI/UX mobile** da calculadora — hoje construída para desktop, sem
nenhuma regra responsiva (`@media`) no `frontend/src` — para que fique confortável e legível
em telas pequenas (~360–430px de largura), preservando integralmente a identidade "Terminal
de Contenção" e sem tocar em nenhuma regra de jogo.

**Antes de qualquer UI, ler `docs/design/DESIGN.md` e consumir o handoff de tema em
`docs/design/tema/`.** Toda medida/breakpoint/alvo de toque deve sair de tokens; **nenhum
hex/fonte/raio solto** (proibição #29). Os protótipos em `docs/design/examples/*.html` são
alvos de fidelidade **desktop** — no mobile, adaptar o layout mantendo a estética (cards,
mono/UPPERCASE, grid de fundo, bordas hairline), não introduzir um visual novo.

## Contexto (estado atual)

- `frontend/src` **não tem nenhuma media query** — grids são fixos e não refluem: atributos
  em `repeat(5,1fr)` (agente) / hero em `repeat(4,1fr)`, steppers com botões de 30px
  (abaixo do alvo de toque recomendado), catálogo/carrinho de compras densos, navegação de
  abas do shell em linha, e modais (ajuda, exportar/importar, config de tema + color picker)
  dimensionados para desktop.
- A meta `viewport` já existe no `index.html`; falta o trabalho de layout responsivo.

## Entregáveis

1. **Estratégia responsiva mínima e reutilizável** — definir breakpoint(s) como token(s) do
   tema (ex.: `--bp-mobile`) e um padrão consistente aplicado em todas as páginas (sem
   duplicar valores mágicos de largura por arquivo). Garantir **zero scroll horizontal** do
   body em qualquer largura (conteúdo largo — catálogo, tabelas, código de exportar — rola
   dentro do próprio container).
2. **Reflow das 6 abas** (`agente`, `dt`, `novo-agente`, `patente`, `descanso`, `compras`):
   grids de config/atributos/stats colapsam para 1–2 colunas no mobile; escala tipográfica e
   paddings ajustados para densidade confortável em tela pequena (sem quebrar a hierarquia
   mono/UPPERCASE). Atenção especial à **aba `compras`** (a mais pesada: config, resumo,
   catálogo com busca/categorias, carrinho).
3. **Alvos de toque** — steppers (`StepInput`), botões de − / +, chips de categoria, botões
   de ajuda/exportar/importar e a navegação de abas do shell com área de toque adequada ao
   mobile (sem sacrificar a densidade no desktop).
4. **Navegação de abas do shell** utilizável no mobile (rolagem horizontal com deep-link
   preservado, ou colapso equivalente) — sem estourar a largura da tela.
5. **Modais/painéis mobile-first**: ajuda (`AjudaCalculadora`), exportar/importar do carrinho
   e **painel de configurações de tema** (`ConfiguracoesTema`, incluindo o **color picker com
   trava de contraste**) usáveis com o polegar em tela pequena — largura/altura, rolagem
   interna e fechamento adequados.
6. **Verificação** em larguras de referência (ex.: 360, 390, 430px) das 6 abas + shell +
   painéis, registrada na descrição da task ao concluir (ou em `docs/PARIDADE-M1.md`).

## Critérios de Aceite

- Nenhuma das 6 abas provoca scroll horizontal do body em ~360px; conteúdo largo rola no
  próprio container.
- Grids de atributos/stats/config refluem para o mobile; nada fica cortado ou espremido de
  forma ilegível.
- Steppers e controles principais têm alvo de toque confortável no mobile.
- Ajuda, exportar/importar e config de tema (com color picker) são operáveis em tela pequena.
- Identidade preservada (dark base + IBM Plex + grid + cards) e **tudo via tokens** — sem
  hex/fonte/raio solto, sem `style=""`, sem `.css` avulso.
- **Zero alteração de regra de jogo** — `shared/regras` intocado; suíte `shared` e `frontend`
  continua verde; build dentro do budget.

## Fora de Escopo

- Qualquer mudança em fórmula/regra (`shared/regras`) ou no conteúdo/paridade das abas.
- Redefinição da identidade visual (já fixada em `docs/design/`).
- App nativo/PWA, gestos avançados ou offline além do que já existe.
- Refino mobile das telas de M2–M5 (cobertos nos próprios milestones).

## Dependências

- `m1-14-paridade-deploy-arquivamento.spec.md` (paridade fechada) e as 6 páginas
  (`m1-07`…`m1-10`), o shell (`m1-06`), a ajuda (`m1-12`) e o painel de tema (`m1-13`).
