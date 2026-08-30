# UI-11 — Normalizar tokens de acabamento

> Filha de UI-06. Origem adicional: P-042, margem inline no guia de criatura.

## Objetivo

Remover acabamento fora da fonte de verdade: margem inline, raios literais 2/3/4px e comentário
residual de PrimeNG. Decidir centralmente tokens compactos e exceções geométricas.

## Entregáveis

1. Trocar style="margin-top: 16px" em criar-criatura por classe BEM/SCSS local e encerrar P-042.
2. Auditar cada raio literal da matriz: promover recorrentes a token documentado ou trocar pelo
   token atual; 50% só permanece para forma circular de avatar/launcher.
3. Corrigir o comentário em frontend/tailwind.config.ts e atualizar DESIGN.md se criar token.

## Critérios de Aceite

- Buscas da UI-06 não deixam style= nem raio 2/3/4px não justificado nos arquivos tocados;
  nenhuma cor/fonte/raio novo é hardcoded.
- Lint, testes/build proporcionais e gate visual de todos os módulos afetados nos dois viewports.

## Fora de Escopo

Redesenhar a identidade, trocar raios por preferência ou migrar botão icon-only.

## Dependências

DESIGN.md, tema/_tokens.scss, UI-06 e P-042.
