# m1-calculadora-paridade.spec.md

> **Milestone M1 — Calculadora com paridade.** Quebrar em tasks numeradas
> (`m1-01-*.spec.md`, …) antes da implementação. Sugestão de quebra: uma task por domínio
> de regras (agente, dt, novo-agente, patente, descanso, compras) + uma por página + temas.

## Objetivo

Aposentar o site antigo (`contratados-calculadora`): paridade funcional completa das 6
abas, com toda a lógica de jogo extraída para `shared/regras` e coberta por testes.

## Fonte de Migração

Repo antigo: `contratados-calculadora/src/script.js` (~2.200 linhas) — tabelas de dados e
funções `calc*()`. A fonte da verdade das regras é `docs/core/sistema-v4.1.0.md`; em conflito
com o código antigo, **o documento vence** (registrar divergências encontradas).

## Entregáveis

1. **`shared/regras`** — extração completa, com testes unitários Vitest validados contra as
   tabelas do `docs/core/sistema-v4.1.0.md` **antes de qualquer UI**:
   - `dados/`: `dadosAgente`, `dadosCivil`, `PATENTES`, tabelas de descanso, catálogo de
     itens, modificações e amplificadores — como dados tipados
   - `agente/`: vida, energia, limite de energia, defesa, proficiência, deslocamento,
     dano corpo a corpo, inventário, traumas/sequelas, área de percepção, dano furtivo,
     limite de habilidades/turno, benefícios por nível, progressão acumulada
   - `dt/`: DT de atributo
   - `novo-agente/`: nível inicial, prestígio inicial, bônus monetário, motivos de entrada
   - `patente/`: lookup por prestígio
   - `descanso/`: tipos de descanso, modificadores, escada de dados, rolagem
   - `compras/`: limites por patente, custos de modificação, conflitos, amplificadores,
     peso de inventário, totais
2. **Enums de jogo** no shared: `ClasseEnum`, `PatenteEnum`, categorias de item, etc.
3. **Frontend — 6 páginas standalone lazy** em `modules/calculadora/`: `agente`, `dt`,
   `novo-agente`, `patente`, `descanso`, `compras`. Públicas (sem login), 100%
   client-side (não dependem do backend/Render).
4. **Paridade funcional completa**, incluindo:
   - Persistência do carrinho de compras em localStorage
   - Exportar/importar carrinho por código compartilhável (compatível com códigos do site
     antigo, se viável — senão, documentar a quebra)
   - Conteúdo de ajuda (modais de ajuda por aba)
   - **Sistema de temas completo**: presets de cor, tema claro/escuro, color picker
     custom com trava de contraste — reconstruído sobre o sistema de presets/CSS vars do
     PrimeNG
5. **Rolagem de descanso** com animação (paridade com o site antigo).

## Critérios de Aceite

- Mesmas saídas do site antigo para os mesmos inputs em todas as abas (verificação manual
  lado a lado + testes de `shared/regras` contra o documento do sistema)
- `shared/regras` com 100% das fórmulas testadas; nenhuma regra de jogo duplicada no
  frontend ou backend
- Páginas funcionam offline do backend (Render dormindo não afeta a calculadora)
- Deploy em produção na Cloudflare; repo antigo arquivado ao final

## Fora de Escopo

- Login, campanhas, fichas, tempo real
- Redesign visual da identidade (a identidade já está **definida** — tema "Terminal de
  Contenção" em `docs/design/`; aqui a paridade com o site antigo é **funcional**, aplicando
  os tokens do tema. A troca de tema em runtime é o entregável 4)
- Novas features que não existem no site antigo

## Dependências

- M0 concluído (workspaces, CI, deploy do front)
