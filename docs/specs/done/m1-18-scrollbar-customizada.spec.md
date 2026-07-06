# m1-18-scrollbar-customizada.spec.md

> Task de refinamento do M1 (mesmo padrão de m1-15/m1-16 — melhoria de acabamento após o
> fechamento da paridade em m1-14), a pedido do autor. Cria um **padrão visual próprio de
> scrollbar**, alinhado ao tema "Terminal de Contenção", para substituir a barra de rolagem
> padrão (nativa) do navegador.

## Objetivo

Hoje toda rolagem do app — `body`/`.conteudo` (scroll geral), modais com `overflow-y: auto`
(ajuda, config de tema, exportar/importar do carrinho), tabelas largas e o textarea de código
(`overflow-x: auto`) — usa a **scrollbar padrão do navegador/SO**: larga, cinza/prata,
destoando totalmente da estética "técnica, sóbria, fria" do tema (nenhum outro elemento da UI
usa o visual nativo do navegador — inputs, selects e agora sliders já têm padrão próprio).

Esta task define e aplica uma **scrollbar customizada**, fina e discreta, usando os tokens do
tema (`--surface-2`/`--border-strong` no thumb, `--bg`/transparente na track), consistente
entre navegadores (`::-webkit-scrollbar-*` para Chrome/Safari/Edge + `scrollbar-color`/
`scrollbar-width` para Firefox), aplicada **globalmente** (não só num componente).

**Antes de qualquer UI, ler `docs/design/DESIGN.md` e consumir o handoff de tema em
`docs/design/tema/`.** Não existe hoje um padrão de scrollbar em `_componentes.scss` nem nos
protótipos de `docs/design/examples/` — esta task **introduz** o padrão e deve devolvê-lo
documentado, do mesmo jeito que `.stepper`/`.card`/`.stat` já vivem lá.

## Contexto (estado atual)

- Nenhuma regra de scrollbar existe hoje no frontend (`grep -ri scrollbar` não retorna nada em
  `frontend/src`) — é 100% comportamento nativo do navegador em todo lugar que rola.
- Pontos de rolagem conhecidos no app: `html`/`.conteudo` (scroll vertical geral, com
  `overflow-x: clip` já aplicado na m1-15 para travar scroll horizontal do body); os 3 modais
  (`AjudaCalculadora`, `ConfiguracoesTema`, exportar/importar do carrinho) com `max-height` +
  `overflow-y: auto` (m1-15); tabelas de referência (DT/Patente) e o textarea de código de
  exportar/importar com `overflow-x: auto` em telas estreitas.
- `--breakpoints`/tokens de tema já resolvidos via `stylePreprocessorOptions.includePaths`
  (m1-15) — a customização de scrollbar deve entrar no mesmo lugar central que resolve
  identidade global (`styles.scss` ou um parcial de tema), não repetida por componente.

## Entregáveis

1. **Padrão canônico de scrollbar em `docs/design/tema/_componentes.scss`** (ou um parcial de
   tema equivalente, ex. `_base.scss`), cobrindo:
   - `::-webkit-scrollbar` (largura/altura fina, ex. 8–10px), `::-webkit-scrollbar-track`
     (transparente ou `--bg`/`--surface`), `::-webkit-scrollbar-thumb` (`--surface-2` ou
     `--border-strong`, raio arredondado, sem borda pesada) e `:hover` do thumb (leve destaque,
     ex. tom mais claro ou borda `--accent` sutil — sem virar `--accent` sólido, que é reservado
     para ação/estado ativo);
   - equivalente Firefox via `scrollbar-width: thin` + `scrollbar-color: <thumb> <track>` (as
     mesmas cores do webkit, calculadas a partir dos mesmos tokens);
   - aplicado **globalmente** (`html`/`*` ou seletor equivalente no parcial de tema) para cobrir
     `body`, modais e qualquer container com overflow, sem precisar repetir a regra por
     componente.
2. **Aplicação/limpeza dos pontos de rolagem existentes.** Confirmar que os 3 modais, o scroll
   geral e as tabelas/textarea com `overflow-x: auto` (que hoje têm rolagem horizontal em
   mobile) herdam o novo padrão sem overrides locais divergentes.
3. **Documentação em `docs/design/DESIGN.md`** referenciando o novo padrão de scrollbar, para
   que telas futuras (ficha de jogador/criatura, guia de missão) não reintroduzam a barra
   nativa.

## Critérios de Aceite

- Nenhum container com rolagem do app (scroll geral, os 3 modais, tabelas/textarea com overflow)
  usa a scrollbar **nativa** do navegador — thumb fino e discreto no padrão do tema em
  Chrome/Edge/Safari (`::-webkit-scrollbar-*`) e Firefox (`scrollbar-color`/`scrollbar-width`).
- Cores do thumb/track vêm só de tokens do tema (`--surface-2`/`--border-strong`/`--bg`) —
  **nenhum hex solto** no SCSS (proibição #29 do CLAUDE.md).
- O padrão é definido **uma vez**, em um parcial de tema global, e vale para toda a app sem
  precisar ser repetido por componente/página.
- Identidade preservada em ambas as bases (clara/escura) do sistema de tema em runtime (m1-13)
  — o thumb continua legível/discreto em qualquer base ativa.
- **Zero alteração de regra de jogo** — `shared`/`shared/regras` intocados; suíte
  `test --workspace=frontend` segue verde (mudança é só de CSS global, sem tocar template/TS de
  nenhuma página); `test --workspace=shared` inalterado; build dentro do budget de estilo
  vigente.

## Fora de Escopo

- Scrollbar customizada via JS/biblioteca de terceiros (ex. simplebar, overlay scrollbar
  emulado) — a solução é CSS puro (`::-webkit-scrollbar` + `scrollbar-color`), sem dependência
  nova.
- Qualquer mudança em fórmula/regra (`shared/regras`) ou no comportamento funcional de
  qualquer página.
- Esconder a scrollbar por completo (`scrollbar-width: none`/`display: none`) — o objetivo é
  **restilizar**, não remover a affordance de rolagem.

## Dependências

- `m1-15-refinamento-mobile-calculadora.spec.md` (pontos de overflow/scroll já mapeados: body,
  modais, tabelas/textarea).
- `docs/design/DESIGN.md` / `docs/design/tema/_componentes.scss` (onde o novo padrão de
  scrollbar é registrado).
