# preservar-modificacoes-inventario-esquadrao.spec.md

> **Task avulsa (pedido do autor, 2026-08-13), não é feature de milestone.** O número/slot
> definitivo (`mN-NN`) fica a critério do autor na revisão de backlog. Nasce de `docs/context/IDEAS.md`
> `I-020`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> Reusar o padrão visual de chip de modificação já usado em `ficha-inventario.component.html`.

## Objetivo

Fazer o **inventário de esquadrão** (`campanha.inventario`, JSONB) preservar as
**modificações estruturadas** (`ModificacaoAplicadaDto[]`) de um item quando ele atravessa a
fronteira ficha ↔ base, nos **dois sentidos**. Hoje uma arma, proteção ou outro item modificado
perde toda modificação ao ser mandado para a base — e não há como recuperá-la ao trazer o item de
volta para uma ficha.

## Estado atual (o que existe)

- `CarrinhoItemDto` (`shared/src/regras/compras/compras.dtos.ts:124`, inventário de ficha) tem
  `modificacoes: readonly ModificacaoAplicadaDto[]` (obrigatório, pode ser `[]`).
- `CampanhaInventarioItemDto`/`CampanhaInventarioItemAdicionarDto`
  (`shared/src/dtos/campanha/campanha.dtos.ts:368`/`396`, inventário de esquadrão) só guardam os
  campos **descritivos** do catálogo (`nome`/`categoria`/`custo`/`peso`/`quantidade`/`descricao`/
  `dano`/`informacao`/`resistencia`/`bonus`) — comentário no próprio arquivo (linha 364) já
  documenta a omissão deliberada de `equipado`/`modificacoes`/`containerId`.
- `FichaService.mandarItemInventarioParaBase` (`backend/src/modules/ficha/ficha.service.ts:487`)
  monta `itemNovoCampanha: CampanhaInventarioItemDto` campo a campo (linha ~531) sem copiar
  `itemOrigem.modificacoes` — a modificação é descartada nesta transferência.
- `FichaService.pegarItemInventario` (mesmo arquivo, ~linha 401) monta `itemParaFicha:
  CarrinhoItemDto` (~linha 443) sem preencher `modificacoes` a partir do item de campanha — hoje
  não haveria de onde ler, já que o item de campanha nunca as recebeu.
- `itensInventarioSaoIdenticos` (`backend/src/modules/campanha/campanha.service.ts:55`) decide se
  um `POST` de adicionar item empilha (`quantidade += `) num item já existente do mesmo
  nome/categoria/custo/peso/descrição/dano/informação/resistência/bônus — **não olha para
  modificações**, então, se elas existissem, dois itens com mods diferentes fundiriam num só stack.
  Só `OPERACIONAL`/`MEDICINAL` empilham hoje (`CATEGORIAS_EMPILHAVEIS_INVENTARIO`).
- `InventarioEsquadrao` (`frontend/src/app/modules/campanha/componentes/inventario-esquadrao/`) não
  importa `ModificacaoAplicadaDto` nem renderiza nenhuma modificação — só os campos descritivos.
- Armazenamento: `campanha.inventario` é uma coluna **JSONB** (`campanha.repository.ts:243`/`258`,
  `SELECT`/`UPDATE` com `COALESCE(inventario, '[]'::jsonb)`) — um campo novo opcional no DTO não
  exige migration.

## Entregáveis

1. **Contrato (`shared`).** Acrescentar `readonly modificacoes?: readonly ModificacaoAplicadaDto[];`
   a `CampanhaInventarioItemDto` e `CampanhaInventarioItemAdicionarDto`
   (`shared/src/dtos/campanha/campanha.dtos.ts`), reaproveitando o tipo já existente em
   `shared/src/regras/compras/compras.dtos.ts` — **sem** criar um segundo formato de modificação.
   Opcional (não obrigatório) para não quebrar itens já persistidos sem o campo.
2. **Ficha → Base.** `mandarItemInventarioParaBase` passa a copiar `itemOrigem.modificacoes` (quando
   não vazio) para `itemNovoCampanha.modificacoes`.
3. **Base → Ficha.** `pegarItemInventario` passa a copiar `itemCampanha.modificacoes ?? []` para
   `itemParaFicha.modificacoes` (campo obrigatório em `CarrinhoItemDto`, então o fallback `[]` é
   necessário para itens de base sem modificação).
4. **Identidade de stack.** `itensInventarioSaoIdenticos` (`campanha.service.ts`) passa a comparar
   também `modificacoes` — dois itens só empilham quando a lista de modificações for
   estruturalmente igual (mesmos `nome`/`empilhamentos`/`efeitos`/`descricao`, na mesma ordem já
   que ambos vêm do mesmo array de origem sem reordenação). Itens com modificações diferentes nunca
   se fundem num stack só.
5. **Apresentação (`InventarioEsquadrao`).** O card do item de base passa a exibir as modificações
   presentes (nome + texto reaproveitando `descreverEfeitosModificacao`, `shared/regras/compras`),
   no mesmo padrão visual de chip que `ficha-inventario.component.html` já usa — **somente leitura**
   aqui (este inventário não edita modificação, só transfere o item inteiro).

## Critérios de Aceite

- Uma arma/proteção com modificações aplicadas, mandada para a base e depois retirada de volta para
  a mesma ou outra ficha, chega com as **mesmas** modificações — mecânica (efeitos no cálculo de
  stat) e visualmente (chip).
- Um item OPERACIONAL/MEDICINAL modificado, mandado para a base junto de uma unidade idêntica sem
  modificação (ou com modificação diferente), **não empilha** com ela — vira uma entrada separada.
- Dois itens OPERACIONAL/MEDICINAL com a **mesma** modificação continuam empilhando normalmente
  (sem regressão do comportamento de `m3-?`/ajuste de 2026-08-13 que motivou esta task).
- Item de base sem `modificacoes` (dado legado, antes desta task) continua funcionando nos dois
  sentidos, sem erro de tipo/serialização.
- `shared`/`backend`/`frontend`: suítes verdes, lint limpo.
- Gate visual (skill `verify`, `1920×1080` e `360×800`): o chip de modificação no card do
  inventário de esquadrão não quebra layout nem overflow, e é visualmente consistente com o
  mesmo chip na ficha (mesmo análogo).

## Fora de Escopo

- Editar modificação **dentro** do inventário de esquadrão (adicionar/remover/ajustar
  empilhamento) — continua uma operação exclusiva da ficha; a base só preserva o que chega.
- `equipado`/`containerId` — permanecem fora do inventário de esquadrão (omissão deliberada e
  intocada por esta task).
- Qualquer migration de banco — `campanha.inventario` já é JSONB.

## Dependências

- `shared/src/dtos/campanha/campanha.dtos.ts`, `shared/src/regras/compras/compras.dtos.ts`
  (`ModificacaoAplicadaDto`, `descreverEfeitosModificacao`).
- `backend/src/modules/ficha/ficha.service.ts` (`mandarItemInventarioParaBase`,
  `pegarItemInventario`).
- `backend/src/modules/campanha/campanha.service.ts` (`itensInventarioSaoIdenticos`).
- `frontend/src/app/modules/campanha/componentes/inventario-esquadrao/` e o padrão de chip de
  `frontend/src/app/modules/ficha/componentes/ficha-inventario/`.
