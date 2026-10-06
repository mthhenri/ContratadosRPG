# p-098-ponteiros-auditoria-ficha-oculta.spec.md

> Task documental de PROBLEMS P-098. **Preparada em 2026-10-06, sem execução agora.**

## Objetivo

Alinhar os ponteiros e o estado documental da auditoria de ficha oculta à spec já em
`done/`, preservando decisões e pendências reais do relatório de fecho.

## Entregáveis

1. Conferir a spec em `done/` e `docs/auditorias/ficha-oculta-todos-consumidores.md`;
   distinguir investigação encerrada de decisões/hipóteses que continuam pendentes.
2. Corrigir o link “spec investigativa ativa” em `docs/context/MEMORY.md` e os
   trechos afetados de CONTEXT que ainda dizem `active/`. MEMORY contém somente ponteiros.
3. Conferir referências relativas, registrar fecho em HISTORY e remover P-098 após validar.

## Critérios de Aceite

- Links afetados apontam arquivos existentes e não descrevem a spec concluída como ativa.
- D-01/D-02/H-02 mantêm o estado comprovado no relatório; nenhum item vira concluído por
  inferência. Nenhuma reescrita da spec histórica ou mudança no comportamento de ficha oculta.
- Conferência de diff e links; builds/testes de aplicação não necessários para este recorte.

## Fora de Escopo

- Executar agora; implementar pendências de ficha oculta ou alterar fontes do jogo.

## Dependências

- `docs/specs/done/auditoria-ficha-oculta-todos-consumidores.spec.md` e seu relatório.
