# auditoria-ficha-oculta-retomada-cobertura.spec.md

> Registro da cobertura restante em 2026-10-08; nenhuma retomada executada nesta organização.

## Objetivo

Retomar somente a cobertura ainda pendente da auditoria de ficha oculta, sem
reabrir as correções FO-01/02/03 já entregues. A rodada investigativa histórica
permanece arquivada em `done/` conforme decisão registrada na P-098.

## Entregáveis

1. Conferir a cobertura restante de H-01 e a hipótese H-02 (URL de avatar conhecida)
   conforme a matriz original, com limites explícitos por consumidor.
2. Registrar decisões do autor para D-01 (rolagens públicas) e D-02 (médias), sem
   inferir uma regra nem executar correções automaticamente.
3. Registrar relatório textual e, se confirmadas divergências adicionais, specs
   próprias de correção. Capturas/saídas brutas locais em `.artifacts/`.

## Critérios de Aceite

Cobertura e decisões pendentes tratadas ou delimitadas explicitamente; aplicação
real nos papéis/cenários da matriz e viewports 1920×1080/360×800. Hipótese sem
verificação permanece aberta. Produzir relatório não equivale a cobertura completa.

## Fora de Escopo

Reexecutar correções concluídas, reescrever a rodada histórica ou implementar
achados sem tarefa autorizada. A organização atual apenas registra a pendência.

## Dependências

- [Rodada original](../done/auditoria-ficha-oculta-todos-consumidores.spec.md).
- [Matriz e roteiro](../done/auditoria-ficha-oculta-todos-consumidores/ficha-oculta-todos-consumidores.md).
- [Conferência documental P-098](../done/p-098-ponteiros-auditoria-ficha-oculta.spec.md).
