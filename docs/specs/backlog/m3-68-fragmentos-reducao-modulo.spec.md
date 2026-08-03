# m3-68-fragmentos-reducao-modulo.spec.md

> Task do milestone `m3-ficha-jogador.spec.md`. Continuação do lote de Fragmentos (`m3-35`, `m3-42`).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "⬥ Reduzindo Módulos" (~1982-1988).
> **O documento vence** (proibição #27).

## Objetivo

Implementar as duas formas de reduzir o módulo de um fragmento que o doc descreve: via uso em item
consumível (ex.: granada) e via redução sintética/controlada no LDA (patente Força Tarefa+, custo em
dinheiro + espera de uma missão). Hoje nenhuma das duas existe.

## Entregáveis

1. **Redução via item consumível.** Função pura em `fragmento.ts`: dado um módulo, devolve o módulo
   reduzido em 1 nível **e** o custo de Energia do módulo **acima** (doc: "um fragmento de Módulo V
   teria o custo em energia de um Módulo IV"). Módulo I não reduz mais (não há módulo acima de I na
   escala; e Módulo ∅ não participa desta tabela — ver item 3). UI: ao criar/usar um fragmento como
   item consumível (categoria já suporta isso via `categoriaEmprestada`?), aplicar a troca de módulo
   e o novo custo automaticamente.
2. **Redução sintética (LDA).** Função pura para o custo (50% do valor de venda do fragmento — reusa
   `obterValorFragmento` de `shared/src/regras/compras/venda.ts`) e o resultado (2 fragmentos de
   módulo inferior ao entregue: módulo II → 2× módulo III). Gate de patente Força Tarefa+ (conferir
   `PatenteEnum`/`obterPatente` já usados em `compras.ts`). **Sem sistema de missão no app hoje** —
   modelar a espera como um estado manual "Em processo no LDA" que o Mestre libera manualmente (sem
   contador de tempo automatizado), documentando essa simplificação explicitamente no código —
   não inventar um relógio de missão que não existe em nenhum outro lugar do sistema.
3. **Módulo ∅ não participa.** Ambas as funções devem recusar/ignorar Módulo ∅ (doc: "Não é possível
   reduzir o módulo de um fragmento de Módulo ∅"). Como `FragmentoModuloEnum` hoje só tem I-V (sem
   ∅ — o Módulo ∅ é "negociado com o Mestre e fica fora da tabela", conforme o comentário do próprio
   enum), confirmar que a ausência de ∅ no enum já cobre essa regra por construção; se ∅ vier a
   existir como valor futuro, este código precisa recusá-lo explicitamente.
4. UI no inventário: ação "Reduzir Módulo" no card do fragmento (paralela a "Aplicar em..."/
   "Consumir"), com os dois caminhos (consumível vs. LDA) como opções distintas, cada uma mostrando
   seu custo antes de confirmar.
5. Testes em `shared` para as duas funções de redução (incluindo o caso Módulo I sem módulo acima,
   e a tabela de custo do LDA).

## Critérios de Aceite

- Reduzir um fragmento via item consumível troca seu módulo e ajusta o custo de Energia para o
  módulo acima, conforme a tabela do doc.
- Reduzir via LDA (só disponível para patente Força Tarefa+) cobra 50% do valor de venda e, ao ser
  liberado pelo Mestre, gera 2 fragmentos do módulo inferior.
- Nenhum dos dois caminhos aceita Módulo ∅.

## Fora de Escopo

- Forja de Fragmentos (combinar fragmentos para módulo **superior**) e Fragmento Módulo ∅ — fora de
  escopo por pedido explícito, registrado em `IDEAS.md`.
- Sistema de missões/tempo automatizado — a espera do LDA é liberação manual do Mestre.

## Dependências

- `m3-42` (fragmento no inventário), `venda.ts`/`venda.dados.ts` (valor de venda por módulo/tipo),
  `shared/regras/patente` (`obterPatente`, gate de Força Tarefa+).
