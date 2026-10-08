# p-098-ponteiros-auditoria-ficha-oculta.spec.md

> Task documental de PROBLEMS P-098. Preparada e autorizada para execução em 2026-10-06.

## Objetivo

Alinhar os ponteiros e o estado documental da auditoria de ficha oculta à localização
da spec em `done/`, preservando decisões e pendências comprovadas no relatório.

Conferência de execução: a spec histórica está arquivada em `done/`, mas o relatório
permanece parcial e não comprova fecho integral. A localização não encerra a cobertura
pendente. Corrigir a descrição de estado com esse limite explícito.

## Entregáveis

1. Conferir a spec em `done/` e `docs/specs/done/auditoria-ficha-oculta-todos-consumidores/ficha-oculta-todos-consumidores.md`;
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

- Implementar pendências de ficha oculta, reescrever a spec histórica ou alterar fontes do jogo.

## Dependências

- `docs/specs/done/auditoria-ficha-oculta-todos-consumidores.spec.md` e seu relatório.

## Fecho — 2026-10-06

- MEMORY e CONTEXT apontam a spec histórica arquivada em `done/`, sem descrevê-la como ativa.
- Relatório recebeu nota de conferência da localização; estado inicial ficou datado.
  Não há evidência de fecho integral: investigação parcial e cobertura restante de H-01,
  D-01 (rolagens públicas), D-02 (médias) e H-02 (avatar conhecido) permanecem pendentes.
- Spec histórica preservada integralmente; nenhuma mudança de aplicação, regra ou teste
  de ficha oculta. P-098 remove só a inconsistência documental, sem executar a auditoria.
- Links operacionais e diff conferidos; registro em HISTORY, contexto/fila alinhados,
  P-098 retirado de Ativos. Gates de aplicação/visual não se aplicam ao recorte documental.
- Sem pendências da P-098; a cobertura restante pertence à auditoria. Sem novo commit.
