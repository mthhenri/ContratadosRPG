# P-104 — Build Angular com cache local

> Correção solicitada pelo autor em 08/10/2026; origem: `docs/context/PROBLEMS.md`, P-104.

## Objetivo

Investigar e resolver a falha nativa do build Angular no Windows com cache local,
sem depender de `CI=true`. Distinguir defeito do cache, runtime e restrição do ambiente.

## Entregáveis

1. Reprodução controlada e diagnóstico com versões, comandos e resultados.
2. Correção proporcional à causa demonstrada, preservando caches de processos concorrentes.
3. Relatório em `p-104-build-cache/verificacao.md` e contexto atualizado conforme o resultado.
   Logs locais em `.artifacts/p-104-build-cache/`.

## Critérios de Aceite

- Build de produção pelo comando habitual, sem `CI=true`, aprovado com cache habilitado.
- Segunda execução aprovada reutilizando o cache; comparação controlada quando necessária.
- Revisão do diff e `npm run repo:verificar` aprovados. Se houver código alterado,
  lint e testes proporcionais à mudança; falhas preexistentes registradas separadamente.
- Causa e limites explícitos; ausência de reprodução sozinha não comprova correção.

## Fora de Escopo

UI, regras do jogo, budgets, P-106, atualizações amplas de dependências e limpeza
de cache de servidor/testes concorrentes. Não mascarar o erro definindo `CI=true`.

## Dependências

`docs/SYSTEM.SPEC.md` §3.1, `docs/CONVENTIONS.md` e registro P-104.
