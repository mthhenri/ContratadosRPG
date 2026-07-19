# m3-33-ficha-apelido-equipamento.spec.md

> Task 30 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Permitir que o jogador dê um apelido a uma instância de equipamento (ex.: "Arma Branca
Média" → "Espada Excalibur") sem afetar a identidade mecânica do item — `categoria`+`nome`
continuam sendo a chave que `calcularStatItem`/`resolverDadosItem` usam para calcular
dano/resistência/etc.

## Entregáveis

1. Campo `readonly apelido?: string;` em `CarrinhoItemDto`
   (`shared/src/regras/compras/compras.dtos.ts`) — só exibição, zero mudança no motor de
   cálculo (`compras.ts` continua ignorando `apelido`).
2. Helper de exibição `rotuloItem(item)` em `frontend/src/app/modules/ficha/rotulos-ficha.ts`
   (mesmo padrão de `rotuloArquetipo`/`rotuloClasse`), retornando `apelido ?? nome` — ponto
   único de formatação reusado por Inventário e, mais tarde, pelos Combos (`m3-37`).
3. UI no `ficha-inventario`: affordance de renomear (ícone lápis) restrita a categorias
   **não-empilháveis** (armas, proteções, exóticos, armazenamento) — itens empilháveis
   (munição, medicinal, operacional) não ganham apelido. Exibição: apelido em destaque +
   nome mecânico como legenda secundária.
4. Ajuste na lógica de merge de `adicionarItem`: duas entradas só se juntam na mesma pilha
   se `apelido` for igual (ou ambos ausentes) — evita que um item apelidado seja absorvido
   silenciosamente por outro sem apelido de mesma categoria/nome.

## Critérios de Aceite

- Renomear um item persiste e aparece consistente em toda a UI da ficha.
- Item apelidado não se funde com item sem apelido de mesma categoria/nome.
- Categorias empilháveis não oferecem a affordance de apelido.

## Fora de Escopo

- Apelido em itens empilháveis.
- Uso do apelido nos Combos (`m3-37` consome `rotuloItem`, mas a UI de Combos é escopo dela).

## Dependências

- `m3-14` (editor de Inventário).
