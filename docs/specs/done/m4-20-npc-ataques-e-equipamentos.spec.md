# m4-20-npc-ataques-e-equipamentos.spec.md

> Task do milestone `m4-ficha-criatura-npc.spec.md`, depois de `m4-19`. Spec executável
> decorrente da [investigação concluída](../../reviews/npc-ataques-equipamentos-investigacao.md)
> (spec investigativa em `done/`) e das decisões do autor registradas ali em 2026-10-06.
> **Concluída em 2026-10-06**, após continuação da implementação ativa pelo autor.
> [Gates, revisão e evidências](../../reviews/m4-20-verificacao.md).

## Objetivo

Dar ao NPC acesso real a armas, proteções e modificações do catálogo do agente — teste por
Luta/Pontaria (reusando o motor de atributo/Competência da `m4-19`) e dano resolvido pelo
equipamento, com o limite de acesso definido pela Patente Equivalente que o mestre escolher
para aquele NPC dentro da faixa da sua Categoria.

## Entregáveis

1. **Contrato.** Estender `FichaNpcDadosDto` (`shared/src/dtos/ficha/ficha-npc.dtos.ts`) com:
   - `inventario?: readonly CarrinhoItemDto[]` — reusa o DTO do agente (`shared/src/dtos/ficha/ficha.dtos.ts`)
     tal como está, sem redefinir forma. Ausência/`[]` = sem equipamento; NPC antigo continua
     legível sem migração.
   - `patenteEquivalente?: PatenteEnum` — a patente que o mestre escolheu para este NPC dentro
     da faixa válida da sua `categoria` (tabela abaixo). Ausente = sem modificação permitida
     (nunca assumir piso ou teto silenciosamente). Atualizar `SCHEMA.md` (bloco JSONC de
     `FichaNpcDadosDto`) com os dois campos e a tabela de faixas.
2. **Regra pura em `shared/regras/npc`.**
   - Tabela `PATENTES_EQUIVALENTES_POR_CATEGORIA: Record<CategoriaNpcEnum, readonly PatenteEnum[]>`
     (fonte: Guia `:925–931`): Civil → `[]`; Operativo → `[AGENTE, OPERADOR]`; Veterano →
     `[EXPERIENTE, VETERANO]`; Elite → `[FORCA_TAREFA, FORCA_TAREFA_ESPECIAL, OPERACOES_ESPECIAIS]`;
     Lendário → `[LIDER_OPERACIONAL]`.
   - Validação (`validacao.ts`): `patenteEquivalente`, se presente, precisa estar na lista da
     `categoria` do NPC; Civil nunca recebe o campo (rejeitar, não ignorar silenciosamente).
   - Limite de modificação: ler direto `LIMITES_MODIFICACAO[patenteEquivalente]`
     (`shared/regras/compras/compras.dados.ts`, já indexada por `PatenteEnum`) — **sem** nova
     função de cálculo nem passar por `obterLimiteModificacoes`/Prestígio (o NPC não tem
     Prestígio). Ausência de `patenteEquivalente` = `maxModificacoes: 0`.
   - Categorias vetadas do NPC Civil: nova constante (ex. `CATEGORIAS_VETADAS_NPC_CIVIL = [ItemCategoriaEnum.PROTECOES, ItemCategoriaEnum.EXPLOSIVOS]`),
     mesma dupla já decidida para o Civil jogador em `civil-guia-criacao` — decisão própria do
     NPC (reusar o valor, não a regra de `ClasseEnum`).
3. **Reaproveitamento do motor existente, sem duplicar.** Consumir diretamente (NPC não
   ganha cópia própria):
   - `calcularStatItem`, `resolverDadosItem`, `verificarConflitoModificacao`,
     `listarModificacoesDisponiveis`, `ehEscudo` (`shared/regras/compras`) — dano/resistência/
     bônus do item equipado.
   - `calcularBonusDefesaEquipamento`, `montarResistencias`/`calcularResistenciaEquipamento`
     (`shared/regras/agente/{defesa,resistencia}.ts`) — somam por cima de `defesaBase`/
     `bloquear`/`esquivar` (snapshot manual, igual a hoje — não recalcular ao vivo).
   - Teste de ataque (Luta/Pontaria, Competência quando aplicável) é o motor de teste de
     atributo da `m4-19` — não implementar uma segunda fórmula aqui.
4. **Criação/configuração (UI).** Antes de qualquer tela, ler `docs/design/FICHA-NPC.md` e o
   handoff vigente. Análogos: `ficha-inventario` do jogador (mesmo carrinho, catálogo e
   categorias) e o seletor de Competências da `m4-19` (seleção restrita por Categoria) para o
   novo seletor de `patenteEquivalente` (chips/dropdown com as patentes válidas da Categoria;
   oculto/bloqueado para Civil). `guia-equipamento-loja.component.ts` ganha um `input()` de
   categorias vetadas (mesmo padrão já proposto para o Civil jogador) para esconder
   Proteções/Explosivos quando `categoria === CIVIL`. Inspecionar a API completa do primitivo
   de `shared/ui/` usado; se faltar capacidade, perguntar ao autor antes de HTML/CSS local.
5. **Fecho.** Testar regra pura (tabela de faixas, veto de Civil, limite de modificação,
   roundtrip de NPC antigo sem os campos novos), gate real `verify`/`design-fidelity` em
   `1920×1080`, `360×800`, `960×1080`, `1366×768` (criação/edição/leitura, cinco Categorias,
   patente dentro/fora da faixa, Civil sem acesso a Proteções/Explosivos). Atualizar
   HISTORY/CONTEXT/SCHEMA; mover esta spec para `done/` só com gates completos.

## Critérios de Aceite

- NPC Elite com `patenteEquivalente: OPERACOES_ESPECIAIS` aceita até 18 modificações por item
  (4 níveis de empilhamento); o mesmo NPC com `FORCA_TAREFA` aceita até 12 — o limite muda
  conforme a patente escolhida, não a Categoria isolada.
- `patenteEquivalente` fora da faixa da Categoria (ex.: `AGENTE` para um NPC Elite) é rejeitado
  na validação. NPC Civil com `patenteEquivalente` setada é rejeitado.
- NPC Civil não pode ter item de `PROTECOES`/`EXPLOSIVOS` no `inventario`; demais categorias
  liberadas normalmente (sem herdar orçamento/teto de peso do Civil jogador — o NPC não tem
  sistema de dinheiro/compra, é atribuição direta do mestre).
- Dano do equipamento aparece via `calcularStatItem`, igual ao agente; teste de ataque usa o
  motor da `m4-19` (Luta/Pontaria + Competência quando aplicável) — nenhuma fórmula nova.
- NPC antigo sem `inventario`/`patenteEquivalente` abre, salva e segue sem Vida/Defesa/Energia
  afetadas; `defesaBase`/`bloquear`/`esquivar` continuam snapshot manual, só ganham o bônus de
  equipamento quando o mestre configura.
- Leitor autorizado vê o equipamento apresentado; não edita, não rola, não equipa/desequipa.
- Builds, suítes completas, lint e typechecks dos três workspaces; `shared` construído antes
  de testar contra o backend rodando (DTO novo).
- Gate visual obrigatório cumprido nos quatro viewports, análogo `ficha-inventario` do
  jogador e seletor de Competências da `m4-19` inspecionados pessoalmente, sem overflow.

## Fora de Escopo

- Dano Furtivo automático, inferência de dano/cura pelo resultado do teste (P-099 descartada).
- Maestria, Formação, Lesão ou progressão de classe para o NPC.
- Sistema de dinheiro/orçamento/compra para o NPC — o mestre atribui equipamento diretamente;
  `gasto`/`dinheiroRestante`/peso-limite do carrinho (`calcularResumoCompras`) não se aplicam.
- Alterar DT (`10 + Nível + 2×Atributo`), Vida, Energia ou o motor de teste da `m4-19`.
- Amplificadores (o Guia não os menciona para NPC) e Fragmentos.
- Reabrir a investigação ou suas decisões — este spec só executa o que já foi decidido.

## Dependências

- `m4-19` (motor de teste de atributo/Competência) deve estar em `done/` antes do fecho
  integrado desta task — o teste de ataque reusa esse motor; pode-se preparar contrato/regra
  pura em paralelo, mas o gate de UI integrado espera a `m4-19`.
- [Investigação e decisões](../../reviews/npc-ataques-equipamentos-investigacao.md) (`done/`).
- `civil-guia-criacao` (backlog) — fonte do veto de categoria do Civil, reusado aqui.
- `shared/regras/compras`, `shared/regras/agente/{defesa,resistencia}.ts`, `shared/regras/dados/patente.dados.ts`.
- `docs/design/FICHA-NPC.md`; `SCHEMA.md` (`FichaNpcDadosDto`).
