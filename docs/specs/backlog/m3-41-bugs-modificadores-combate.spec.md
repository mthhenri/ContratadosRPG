# m3-41-bugs-modificadores-combate.spec.md

> Task 38 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-38`…`m3-54`).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` (Proteções / Resistências / Esquiva /
> Armazenamento / Amplificadores). **O documento vence** (proibição #27). Task de **motor** —
> rodar `npm run test --workspace=shared` antes e depois.

## Objetivo

Corrigir três modificadores que **não estão sendo aplicados** nos cálculos: (16) mods de armadura
na **Esquiva/Defesa**, (28) mods de armazenamento que dão **resistência**, e (15) o **amplificador
de inventário**.

## Entregáveis

1. **Mods de armadura → Esquiva/Defesa (item 16).** `calcularStatItem`
   (`shared/src/regras/compras/compras.ts`, ~linhas 481-486) aplica resistências de armadura por
   nome (`Blindada`/`Reforçada`/`Camuflada`/`Hazmat`/`Antibombas`), mas o efeito em Esquiva/Defesa
   **não chega** em `calcularDefesa` (`shared/src/regras/agente/defesa.ts`). Ligar a cadeia
   "item equipado → derivados de defesa" conforme o documento (quais mods afetam Esquiva/Defesa e
   como). Confirmar o caminho até `calcularDerivados` (`shared/src/regras/agente/derivados.ts`).
2. **Armazenamento com resistência (item 28).** Hoje `interpretarBonusArmazenamento`
   (`compras.ts` ~linha 70) só interpreta `+N inv.`; armazenamentos que concedem **resistência a
   dano** não entram em `montarResistencias` (`shared/src/regras/agente/resistencia.ts`).
   Interpretar e somar essas resistências (incluindo os armazenamentos com resistência que hoje
   são ignorados).
3. **Amplificador de inventário (item 15).** Hoje só os amplificadores `Resistente`/`Defesa` têm
   efeito mecânico (`resistencia.ts`); o amplificador que altera o **limite/uso de inventário**
   não é consumido em lugar nenhum. Ligar seu efeito ao resumo de compras/inventário
   (`calcularResumoCompras`/`calcularStatItem` + `bonusInventario`).
4. Testes unitários em `shared` cobrindo os três casos (antes falhando/ausentes, agora verdes).

## Critérios de Aceite

- Equipar uma armadura com mod relevante altera a Esquiva/Defesa exibida no Combate.
- Um armazenamento que concede resistência entra na soma de resistências do Combate.
- O amplificador de inventário altera o limite/uso efetivo de inventário.
- Suíte `shared` verde, com testes novos para cada bug.

## Fora de Escopo

- UI nova — é correção de motor + fiação até os derivados/resumo (a exibição já existe da `m3-36`).
- Rebalancear valores; só ligar o que o documento já define.

## Dependências

- `m3-36` (resistências de combate + `interpretarNotacaoResistencia`), `m3-14` (inventário).
