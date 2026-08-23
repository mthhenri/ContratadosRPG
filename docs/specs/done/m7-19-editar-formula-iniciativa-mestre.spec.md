# m7-19-editar-formula-iniciativa-mestre.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate. Pedido direto do autor: "permitir alterar a
> expressão da iniciativa (apenas mestre)".

## Objetivo

Dar ao mestre um jeito de sobrescrever, por combatente e por encontro, a **expressão de dados**
usada para rolar a Iniciativa daquele combatente — cobrindo casos que a fórmula padrão do sistema
não prevê (efeito temporário de cena, condição homebrew, ajuste pontual pedido pela mesa) sem
precisar de uma sequela ou Formação permanente na ficha.

## Estado atual

- A gramática de dados (`shared/src/regras/rolagem/rolagem.ts`, `interpretarFormula`/`rolarFormula`)
  já aceita expressões como `2D6+3`, atributo como fonte (`DES d6`), atributo escalado, faixas
  `(ATR±n)dM` e modificadores (`kh/kl/cm/!/?`) — é a mesma gramática usada em `FichaRolagemDto` para
  presets de rolagem.
- `EncontroCombatenteResumoDto` (`shared/src/dtos/encontro/encontro.dtos.ts:85-162`) hoje só guarda
  o **valor final** já rolado: `iniciativa: number | null`. Não existe campo de expressão/fórmula
  persistido por combatente, nem no DTO nem no mapper
  (`backend/src/modules/encontro/encontro-combatente.mapper.ts:46-89`).
- A única edição de iniciativa que já existe é
  `EncontroCombatenteIniciativaAtribuirDto` (`encontro.dtos.ts:212-215`, `{ id, iniciativa }`) — o
  mestre digita o **resultado numérico** diretamente, sem passar pelo motor de rolagem
  (comentário na linha 208-210: "o cálculo é do motor de rolagem/ficha, não deste módulo").
- Modelos de DTO de edição pontual de combatente já existentes, mestre-only, que servem de padrão:
  `EncontroCombatenteIdentidadeAlterarDto` (`encontro.dtos.ts:181-184`, `{ id, cor }`, endpoint
  `POST encontro/:id/combatente` via `alterarIdentidadeAvulso`,
  `backend/src/modules/encontro/encontro.controller.ts:74-79`) e
  `EncontroCombatenteImagemAlterarDto` (multipart, `POST encontro/combatente/:id/imagem`,
  `controller.ts:82`).

## Entregáveis

1. Novo campo persistido em `encontro_combatente` (migration nova, seguinte a `0024`) para a
   expressão customizada de iniciativa daquele combatente naquele encontro — nula por padrão (usa a
   fórmula padrão do sistema/origem quando ausente).
2. Novo DTO `EncontroCombatenteIniciativaFormulaAlterarDto { id, formula: string | null }` (padrão
   `shared/src/dtos/ficha/ficha-rolagem*.dtos.ts` para validar sintaxe de fórmula, se já existir um
   validador reaproveitável — não duplicar a gramática) e endpoint dedicado, mestre-only da campanha
   (mesmo guard/verificação de permissão dos demais endpoints de edição pontual do Encontro —
   `alterarIdentidadeAvulso` como referência). `formula: null` remove a customização e volta ao
   cálculo padrão.
3. Validação server-side da expressão via `interpretarFormula` antes de persistir — uma expressão
   sintaticamente inválida é rejeitada com erro claro, sem gravar nada.
4. Ponto de entrada no painel do mestre (`painel-encontro.page.ts`/`.html`, no cartão do combatente
   ou no menu de edição já usado para cor/imagem do avulso) para editar essa expressão — visível só
   ao mestre, em qualquer combatente (agente, criatura ou avulso).
5. Quando o combatente tem expressão customizada, o cálculo/rolagem de iniciativa (individual e via
   "Rolar tudo") usa essa expressão em vez da fórmula padrão (Destreza em D6 + bônus). A expressão
   customizada tem prioridade sobre o dado extra de Formação (`m7-18`) — o mestre está sobrescrevendo
   a fórmula inteira, não somando a ela.
6. `encontro:alterado` propaga a expressão customizada (ou sua ausência) para todos os clientes
   conectados, seguindo o mesmo cuidado de revelação (§14) dos demais campos do combatente.

## Critérios de Aceite

- O mestre define uma expressão customizada (ex.: `3D6+2`) para um combatente; a próxima rolagem de
  iniciativa daquele combatente (individual ou "Rolar tudo") usa exatamente essa expressão, não a
  fórmula padrão.
- Remover a expressão customizada (voltar a `null`) faz a próxima rolagem usar a fórmula padrão de
  novo.
- Uma expressão sintaticamente inválida é recusada pelo backend, sem persistir e com mensagem clara
  no frontend.
- O jogador não tem acesso a essa edição em nenhum lugar da UI; tentar chamar o endpoint sem ser
  mestre da campanha é recusado pelo backend (403), não só escondido na UI.
- A expressão customizada é específica do combatente **naquele encontro** — encerrar o encontro e
  montar um novo não a carrega automaticamente (a menos que o design decida o contrário; se decidir
  persistir entre encontros, documentar a decisão aqui antes de implementar — não silenciosamente).
- `npm run test -w shared`, `npm run test -w backend` e `npm run test -w frontend` verdes.
- Verificação pela skill `verify` em `1920×1080` e `360×800`: mestre define, usa e remove uma
  expressão customizada; jogador confirma que não tem o controle.

## Fora de Escopo

- Aplicar automaticamente o dado extra de Formação (`m7-18`) dentro da expressão customizada — o
  mestre que quiser esse bônus escreve a expressão completa.
- Editar expressões de outras rolagens do combatente (dano, testes) — só iniciativa.
- Persistir a expressão customizada entre encontros diferentes da mesma campanha, salvo decisão
  explícita durante a implementação (ver critério acima).

## Dependências

`m7-03`/`m7-04` (contrato e condução do Encontro), `m3-46` (gramática de dados v4),
`m7-18` (dado extra de Formação, cálculo padrão que esta task sobrescreve quando presente).
