# m2-09-revisao-estilizacao-geral.spec.md

> Task 9/9 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Revisar a estilização de **todo o site** (calculadora do M1 + telas de autenticação/campanhas
do M2) contra uma atualização do handoff de design em `docs/design/` — novos arquivos que ainda
serão adicionados pelo autor do design (tokens/componentes/exemplos revisados da identidade
"Terminal de Contenção"). Alinhar cada tela já existente ao handoff atualizado. Sem tocar em
regra de jogo nem em regra de negócio — só apresentação.

## Pré-condição (bloqueante)

Esta task depende de arquivos de design **ainda não entregues**. Não iniciar a implementação
até que os novos arquivos estejam disponíveis em `docs/design/`. Quando chegarem, ler
`docs/design/DESIGN.md` e todo o conteúdo de `docs/design/tema/` (e `docs/design/examples/`, se
atualizados) por completo antes de tocar em qualquer `.scss` — não assumir que o resumo em
`CLAUDE.md`/`DESIGN.md` já reflete a atualização.

## Entregáveis

1. **Levantamento de divergências:** comparar cada tela em produção (shell/topbar, calculadora
   — 6 abas, `login`/`registro`, campanhas `listar`/`criar`/`entrar`/`detalhe`) contra os
   tokens/componentes atualizados — token de cor/fonte/raio/espaçamento divergente, padrão BEM
   desatualizado, componente que deveria ter sido copiado de `_componentes.scss` e não foi (ou
   foi copiado e depois o handoff mudou).
2. **Correção das divergências encontradas**, reusando os tokens/BEM do handoff atualizado
   (proibição #29 — nunca hex/fonte/raio soltos; sempre `var(--token)`).
3. **Conferência do preset PrimeNG** (`src/styles/tema/contencao.preset.ts`) e do
   `tailwind.config.ts` do frontend contra o handoff atualizado, ajustando o que tiver mudado.
4. Nenhuma mudança de DOM/TS que altere comportamento, regra de negócio ou regra de jogo —
   apenas SCSS/tokens/preset, mantendo os testes verdes.

## Critérios de Aceite

- Todas as telas existentes (calculadora + auth + campanhas) visualmente alinhadas ao handoff
  de design atualizado em `docs/design/`.
- Nenhum hex/fonte/raio hardcoded fora dos tokens (proibição #29).
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada
  (dark base + IBM Plex; só o que o novo handoff explicitamente mudar é alterado).

## Fora de Escopo

- Novas features, telas ou regras de negócio.
- Alteração de regra de jogo (`shared/regras` intocado).
- Refino de responsividade mobile (já coberto por `m2-08`).

## Dependências

- Novos arquivos de design em `docs/design/` (ainda não entregues — bloqueante).
- `m2-08` (recomendado concluir o refino mobile antes, para não haver retrabalho de estilo).
