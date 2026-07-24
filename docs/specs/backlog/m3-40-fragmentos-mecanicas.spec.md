# m3-40-fragmentos-mecanicas.spec.md

> Task 37 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-38`…`m3-54`).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` (seção Fragmentos) — o header de
> `shared/src/regras/compras/fragmento.dados.ts` lista estas mecânicas como **deferidas**;
> confirmar os números exatos no documento. **O documento vence** (proibição #27).

## Objetivo

Implementar as mecânicas de fragmento hoje **deferidas**: o **Preço de Sanidade** (o "debuff na
sanidade" que se esperava existir mas **ainda não existe**), a **Afinidade** de fragmentos, e
formalizar fragmentos **como "Modificações"** de itens modificáveis.

## Entregáveis

1. **Preço de Sanidade.** Novas funções puras em `shared/src/regras/compras/fragmento.ts` +
   tabela em `fragmento.dados.ts` para o custo de sanidade de consumir/acoplar fragmentos. A
   sanidade materializa-se como sequelas/traumas (`shared/src/regras/agente/sanidade.ts` —
   `calcularSanidade` ganha entrada de fragmento; **o documento define** se o preço vira sequela,
   redução de limite de trauma, etc.). Debitar no fluxo de aplicação do Inventário.
2. **Afinidade.** Modelar a afinidade de fragmento (por tipo/módulo) conforme o documento e
   expô-la como função pura para consumo (custo/bônus). A **exibição** da afinidade no card
   "Informações Extras" é da `m3-47`; aqui entra só a **mecânica**.
3. **Fragmentos como "Modificações".** Formalizar que um fragmento aplicado a um item modificável
   é uma **Modificação** do item, reusando o fluxo `origemFragmento`/`ModificacaoAplicadaDto`
   criado na `m3-35` (`ficha-inventario.component.ts` ~linhas 771-836) — chips de modificação,
   `descreverEfeitosModificacao`, e o gate de item "modificável". Deixar explícito, no formulário
   de item, quando o fragmento **é** a peça (Construtor via `categoriaEmprestada`) vs. quando
   **modifica** outro item (Potencializador).
4. Testes em `shared` para custo de sanidade e afinidade.

## Critérios de Aceite

- Consumir/acoplar um fragmento debita o Preço de Sanidade descrito no documento (reflete em
  sequela/limite conforme a regra) além do custo de Energia já existente (`m3-35`).
- A afinidade é calculada por função pura e disponível para a UI.
- Um fragmento Potencializador aplicado aparece como Modificação do item alvo (chip + stat
  recalculada), coerente com a `m3-35`.

## Fora de Escopo

- Exibição da afinidade e dos dados de fragmento no card Extras (fica na `m3-47`).
- Venda de fragmentos na calculadora M1 (`shared/src/regras/compras/venda.ts`) — intocada.
- Demais mecânicas ainda deferidas no header de `fragmento.dados.ts` que o documento não exigir
  agora (Anomalia Biológica, Colapso, Redução de Módulo, Forja) — só as três acima.

## Dependências

- `m3-35` (fragmentos no inventário + `origemFragmento`), `m3-36` (resistências), `m3-12`
  (sequelas/traumas — onde a sanidade materializa).
