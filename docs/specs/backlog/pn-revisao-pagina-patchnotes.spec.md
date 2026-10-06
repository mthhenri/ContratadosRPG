# pn-revisao-pagina-patchnotes.spec.md

> Guarda-chuva da revisão da página pública `/patchnotes` (continuação de
> `patchnotes-versao-sistema.spec.md`; `pn-06` concluída). Pedido do autor em 2026-10-05: a página
> está "muito central" e sobra espaço lateral vazio; distribuir melhor a informação e ter
> **capítulos dinâmicos** dentro da nota. **Dividir em tasks antes de implementar**: `pn-07`…`pn-09`
> abaixo, cada uma vira um arquivo próprio em `backlog/` ao ser aberta.

## Diagnóstico (estado atual, `1920×1080`)

- `.patchnotes` tem `max-width: 1120px` centralizado: em FullHD sobram cerca de **400px vazios de
  cada lado**, e o cabeçalho, a lista de versões e a nota se espremem no meio.
- A lista de versões (coluna de ~220px) mostra só número e data, não o título da versão. Ela rola
  junto com a página e some logo depois da primeira dobra.
- A nota é um texto longo (a `1.4.0` tem 2 grupos e 10 blocos `##`) sem nenhum mapa. Para chegar a
  "Para o mestre" é preciso rolar tudo, e não há link direto para um bloco.
- A coluna da nota ocupa ~810px, mas o texto do Markdown já para em ~550px (medida de leitura). A
  sobra está **dentro** do cartão também.

## Objetivo

Ocupar a largura disponível **distribuindo informação em trilhos laterais**, sem esticar o texto. A
medida de leitura do Markdown (~65–75ch) continua sendo a regra. Cada nota ganha um sumário de
capítulos gerado do próprio Markdown, sem mudar o formato publicado.

## Decisões de desenho

1. **Três zonas em telas largas**:
   - à esquerda, um trilho de versões fixo (`sticky`) com número, data **e título**;
   - no centro, a nota com medida de leitura;
   - à direita, um trilho "Nesta versão" fixo (`sticky`) com os capítulos.

   O contêiner sai do `max-width: 1120px` para uma largura maior (alvo ~1600px, a confirmar na
   verificação). Nenhum parágrafo fica mais largo que hoje.
2. **Capítulos são derivados, não autorados.** Eles saem da estrutura que `estruturarPatchnote` já
   produz: os grupos `# PARA OS PLAYERS` / `# PARA O MESTRE` são capítulos e os blocos `## <emoji> …`
   são subcapítulos. O resumo final `# RESUMO…` vira o último capítulo. Os blocos de balanço
   Novidades/Melhorias/Correções também entram. Nenhuma mudança em `docs/patchnotes/*.md`, no R2,
   no backend nem na skill `publicar-versao`.
3. **Âncoras estáveis e compartilháveis**: cada capítulo tem um `id` derivado do título (slug sem
   emoji/acento, com desambiguação de repetidos). `/patchnotes/1.4.0#biblioteca-de-documentos`
   abre já posicionado. O sumário destaca o capítulo visível (*scroll-spy*).
4. **Breakpoints**:
   - `1920×1080`: três zonas.
   - `1366×768` e `960×1080`: duas zonas, com as versões no trilho esquerdo e o sumário recolhido
     no topo da nota.
   - `360×800`: versões em faixa horizontal (como hoje) e sumário como seção recolhível "Nesta
     versão" acima da nota.

   Os pontos exatos de quebra são decididos no corte visual de `pn-08`.
5. **Cabeçalho mais compacto**: eyebrow + título + apresentação deixam de ocupar uma faixa própria
   acima de tudo. Eles podem morar no topo do trilho esquerdo ou numa linha mais baixa. O botão do
   ADMIN (`pn-06`) continua no canto superior direito da página.
6. **Análogos aprovados** (registrar o escolhido em cada task, via `design-fidelity`):
   - trilho fixo lateral: `.criar__resumo` da criação de ficha
     (`frontend/src/app/modules/ficha/paginas/criar/criar.page.scss`);
   - leitura longa: a Biblioteca de documentos (`modules/documento/paginas/biblioteca*`);
   - item de lista ativo: o próprio `.patchnotes__item--ativo` atual.

   Só tokens e primitivos de `shared/ui/`. Se faltar um primitivo (por exemplo, um sumário/TOC
   reutilizável), **parar e perguntar ao autor** antes de criar receita local (regra da biblioteca
   de componentes do `CLAUDE.md`).

## Tasks

### pn-07 — Capítulos derivados e âncoras

1. Função pura em `frontend/src/app/modules/patchnotes/patchnote-formato.ts` que devolve a árvore
   de capítulos (`titulo`, `id`, `filhos`) a partir da estrutura de `estruturarPatchnote`. Inclui
   o slug sem emoji e acento e a desambiguação de títulos repetidos.
2. `id` nos títulos de grupo e bloco renderizados. Ao abrir uma URL com fragmento, a página rola até
   o capítulo depois que a nota carrega, inclusive na troca de versão.
3. Testes: slug com emoji/acento/pontuação, títulos repetidos, nota sem grupos (só balanço),
   introdução sem título, fragmento inexistente (ignorado sem erro).

### pn-08 — Layout amplo em trilhos (desktop e intermediários)

1. Grid de três zonas em `1920×1080`, com trilhos `sticky` sob a topbar e rolagem interna quando o
   trilho passa da altura (atenção ao `1366×768`; precedente no commit `69725c87`, lista que rola por dentro no Notebook).
2. Trilho de versões com título da versão (texto truncado com `appTooltip` no completo) e o selo
   "Atual".
3. Trilho "Nesta versão" com os capítulos de `pn-07` e *scroll-spy* via `IntersectionObserver`
   (destacar o capítulo ativo e manter `aria-current`). Clique navega pela âncora, com rolagem suave
   que respeita `prefers-reduced-motion`.
4. Cabeçalho compacto (decisão 5); o botão do ADMIN preservado.

### pn-09 — Telas estreitas e fechamento

1. `960×1080`, `1366×768` e `360×800`: sumário recolhível "Nesta versão" acima da nota. Versões
   continuam acessíveis (faixa horizontal no mobile). Alvos de toque de 44px.
2. Estados preservados em todos os viewports: carregando, índice vazio, 404 e 503 (documento de
   contenção, que continua centralizado) e visitante vs. ADMIN.
3. `docs/design/DESIGN.md`: registrar o padrão de trilho de capítulos (se virar primitivo, o
   registro vai no primitivo).

## Critérios de Aceite

1. Testes unitários de `pn-07` (função pura) e da página: sumário renderizado a partir da nota,
   fragmento posiciona, troca de versão refaz o sumário.
2. Suítes e lint de `frontend` verdes; `shared`/`backend` intocados.
3. Gate visual (`verify` + `design-fidelity`) em `1920×1080`, `1366×768`, `960×1080` e `360×800`,
   com rolagem real da nota (*scroll-spy* trocando de capítulo), link com fragmento, troca de versão
   e os estados de erro. Medir a largura útil antes/depois e confirmar que nenhum parágrafo passou
   da medida de leitura atual.
4. Nenhum overflow horizontal; foco visível no sumário e na lista de versões; contraste conforme os
   tokens.

## Fora de Escopo

- Mudar o formato dos patchnotes, o índice, o R2, a API ou a skill `publicar-versao`.
- Busca dentro das notas, filtro por público (players/mestre) e comparação entre versões. Se o
  autor quiser, vão para `IDEAS.md`.
- Editor de patchnotes na interface (descartado desde `patchnotes-versao-sistema`).

## Dependências

`pn-04` e `pn-06` concluídas. Fontes: `docs/design/DESIGN.md`, `docs/design/tema/`,
`patchnote-formato.ts` (estrutura atual dos grupos/blocos).

## Riscos e Mitigação

- **"Mais amplo" virar texto esticado.** É o atalho óbvio e piora a leitura. A regra é ocupar
  largura com trilhos, nunca com a medida do parágrafo; o critério 3 mede isso.
- **Trilho fixo cortado em `1366×768`.** Trilhos `sticky` mais altos que a viewport precisam de
  rolagem interna própria.
- **Slug instável quebra links compartilhados.** O algoritmo de `id` fica numa função pura testada;
  mudar o título de um bloco numa nota publicada muda a âncora, o que é aceitável e deve ser
  documentado.

## Questões em aberto para o autor

1. Milestone próprio (`m10-*`) ou guarda-chuva `pn-*`? Recomendação: guarda-chuva `pn-*`, porque é
   uma página só, sem backend, e os `M10`–`M12` sugeridos em `IDEAS.md` são temas de produto
   maiores.
2. O resumo final (`# RESUMO…`) também aparece destacado no trilho direito, além de ser o último
   capítulo?
3. O trilho de versões deve agrupar por mês quando a lista crescer, ou a lista simples basta por
   ora?
