# organizacao-documentacao-e-artefatos.spec.md

> Task de organização solicitada pelo autor antes de continuar a M10, em 2026-10-08.

## Objetivo

Centralizar todo material de execução em `docs/specs/`, vinculado à tarefa e ao seu
estado, e impedir o versionamento de capturas e saídas temporárias de verificação.

## Entregáveis

1. Inventário do conteúdo versionado, distinguindo fontes canônicas, material de
   execução e artefatos locais; registro dos destinos e das pendências reais.
2. Planos, designs de tarefa, propostas e relatórios de `docs/superpowers/`,
   `docs/reviews/`, `docs/auditorias/` e auditorias pontuais de `docs/design/`
   realocados como anexos da spec proprietária no mesmo estado. Contratos sem spec
   ganham uma spec de registro retrospectivo, sem inventar requisitos ou fecho.
3. Capturas e saídas brutas preservadas em `.artifacts/`, ignorada pelo Git.
   Fontes dos livros, assets do produto e fixtures reproduzíveis permanecem versionados.
4. Ponteiros corrigidos mecanicamente, sem reescrever decisões, requisitos ou
   resultados históricos. Relatórios indicam que capturas locais não vêm no clone.
5. Política na constituição e nos dois arquivos de agentes; skill `task-flow`
   espelhada e exercitada neste recorte; verificador local e gate no CI.

## Critérios de Aceite

- Inventário antes/depois e destinos auditáveis; nenhuma perda dos arquivos
  realocados, conferidos por hash antes da atualização mecânica dos ponteiros.
- Nenhum arquivo versionável nas pastas paralelas removidas; todo anexo em
  `docs/specs/<estado>/<tarefa>/` tem `<tarefa>.spec.md` ao lado.
- Guard verifica árvore local e índice de commit; testes incluem regressões de
  pastas paralelas, captura forçada, anexo órfão e diferenças nos espelhos.
- Nenhum novo link quebrado entre os documentos migrados; capturas locais
  explicitamente distinguidas de evidência versionada.
- `AGENTS.md` e `CLAUDE.md` idênticos; `.agents/skills/` e `.claude/skills/`
  idênticos; sintaxe dos scripts e `git diff --check` aprovados.

## Fora de Escopo

Implementar M10, modificar controles/estilos ou regras do jogo, encerrar avaliações
parciais, apagar assets legítimos, reescrever o histórico Git ou fazer commit/push.

## Dependências

`docs/SYSTEM.SPEC.md` §3; `docs/CONVENTIONS.md`; `AGENTS.md`; skill `task-flow`;
specs e documentos originais para identificar o vínculo e o estado de cada anexo.
