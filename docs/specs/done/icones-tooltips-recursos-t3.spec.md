# Tooltips de recursos — recorte misto T3

> Task própria de `icones-recursos-glifos-e-pendencias`. Recorte aprovado pelo autor
> em 2026-10-18; execução autorizada pelo autor após a rodada de propostas.

## Objetivo

Aplicar o contrato T3 aprovado: nome do recurso em barras, fichas, cards e resumos;
valor por extenso somente nos custos avulsos de Energia do inventário e das
habilidades de NPC.

## Entregáveis

1. Conferir o mapa de consumidores do inventário da task de origem e registrar
   impacto/análogo antes de editar, incluindo Stat, BarraRecurso e propagação
   para fichas, Acervo, equipe, criaturas e espectadores.
2. Preservar nesses consumidores os tooltips “Vida”, “Energia” e “Defesa”, com
   valores visíveis independentes. Não concatenar valores no primitivo Stat,
   pois aceita conteúdo projetado e valores ausentes ou textuais. Registrar
   o recorte como revisão explícita do contrato original por extenso.
3. Usar “N de Energia” somente nos custos avulsos de
   `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html`
   e `frontend/src/app/modules/ficha/componentes/npc-visualizacao/npc-habilidades-lista.component.html`,
   usando o custo correspondente já apresentado. Preservar cálculos, rótulos,
   controles e mensagens; não inferir gasto a partir de outro valor.
4. Registrar verificação e limites junto desta spec; capturas e saídas brutas
   em `.artifacts/icones-tooltips-recursos-t3/`.

## Critérios de Aceite

- Matriz explícita dos consumidores do inventário: nome preservado, custo por
  extenso ou fora do recorte. Sem troca global baseada só no nome do ícone.
- Testes focados verificam custo correto em cada variante afetada e preservação
  dos tooltips de nome em barras/resumos. Não alterar custos ou regras.
- `design-fidelity` e `verify` na aplicação real: 1920×1080, 1366×768, 960×1080
  e 360×800, bases clara/escura, hover, foco/teclado e toque emulado. Observar
  custo positivo/zero nos consumidores pertinentes, estado desabilitado e
  ausência de overflow. Declarar separadamente se não houve aparelho físico.
- Lint, build, testes proporcionais e `npm run repo:verificar`; sem fecho antes
  do gate visual. Prancha estática não comprova tooltip real.

## Fora de Escopo

Ícones do leitor de regras; novos glifos; alteração de recursos, custos ou
fórmulas; mudar API de primitivos sem decisão do autor; demais tooltips de
explicação; modificar specs históricas em `done/`.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`,
[inventário de consumidores](../active/icones-recursos-glifos-e-pendencias/inventario.md)
e [decisão T3](../active/icones-recursos-glifos-e-pendencias/decisoes.md).
Não exige encerrar a rodada de propostas inteira para executar o recorte aprovado.

## Fecho

Concluída em 18/10/2026. [Verificação e limites](icones-tooltips-recursos-t3/verificacao.md).
