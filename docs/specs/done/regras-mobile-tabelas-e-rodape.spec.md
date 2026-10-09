# regras-mobile-tabelas-e-rodape.spec.md

> Task avulsa solicitada pelo autor em 09/10/2026, com cinco capturas do Edge.

## Objetivo

Corrigir a leitura das tabelas de Regras no mobile, a densidade do Sumário,
a cor do ícone na navegação e a marca no rodapé do leitor.

## Entregáveis

1. Nomes e empilhamentos dos amplificadores sem quebra artificial de linha.
2. Sumário e seletor de documento com altura coerente e controles canônicos.
3. Ícone de Regras com a mesma cor de repouso dos demais destinos da topbar.
4. Tabelas e grades dos dois livros legíveis, mantendo associação entre títulos e dados,
   com rolagem horizontal local onde necessária.
5. Rodapé com marca do sistema e “Você é nossa prioridade — 2026”, ação de voltar ao topo
   e atribuição da marca preservada.
6. Relatório em `regras-mobile-tabelas-e-rodape/verificacao.md`; saídas locais em
   `.artifacts/regras-mobile-tabelas-e-rodape/`.

## Critérios de Aceite

Navegar na página e no painel, abrir/fechar sumário, trocar livros, pesquisar,
ler tabelas e alcançar o rodapé em 360×800, 960×1080, 1366×768 e 1920×1080.
Comparar com o leitor aprovado, a topbar e os controles de `shared/ui`:
densidade mono, filetes e superfícies do tema, alvo de toque de 44px, foco visível,
sem overflow da página ou dados separados dos títulos. Rodar testes do leitor/
normalizador, build, lint e `npm run repo:verificar`.

## Fora de Escopo

Alteração de regras ou da fonte Markdown, exportação PDF e redesign de outras telas.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`,
`docs/design/tema/` e leitor entregue nas revisões visuais anteriores.
