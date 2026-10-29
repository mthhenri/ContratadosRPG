# Formatação do SQL dos repositórios

## Objetivo

Melhorar a legibilidade e a consistência das queries dos repositórios identificadas na auditoria.

## Entregáveis

1. Separar cláusulas, listas e subconsultas extensas de SQL dos repositórios.
2. Adequar os INSERTs identificados à convenção de RETURNING.

## Critérios de Aceite

- Revisar todos os repositórios e preservar os resultados das consultas.
- Executar build, testes, lint e `npm run repo:verificar`; registrar resultados e limites.

## Fora de Escopo

Migrations históricas, mudanças de regras de negócio e schema.

## Dependências

`docs/SYSTEM.SPEC.md` e `docs/CONVENTIONS.md`.
