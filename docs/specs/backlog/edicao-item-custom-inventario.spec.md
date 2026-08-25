# edicao-item-custom-inventario.spec.md

> **Task avulsa (pedido direto do autor, 2026-08-24), não é feature de milestone.** O número/slot
> definitivo (`mN-NN`) fica a critério do autor na revisão de backlog.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> Reusar o padrão visual já existente em cada componente (lápis de apelido na ficha; `.dialogo`
> modal já usado por "Pegar" no inventário de esquadrão) — sem inventar uma terceira superfície.

## Objetivo

Deixar o dono/mestre **editar** um item **custom** já existente no inventário — descrição, peso e
custo — nos dois inventários do sistema: o da ficha do agente (`FichaInventario`) e o de esquadrão
da campanha (`InventarioEsquadrao`). Hoje os dois só sabem **criar** um item custom (formulário
completo) e **remover**; não existe caminho para corrigir/ajustar as informações de um item custom
depois que ele já está na lista — a única saída é remover e recriar do zero, perdendo quantidade,
modificações (ficha) e o `id` do registro (campanha). Item de **catálogo** não é afetado: seus
dados vêm de `CATALOGO_ITENS` (fonte do jogo) e continuam sem nenhuma ação de editar.

## Estado atual (o que existe)

- **Detecção de "item custom" já existe e é reaproveitável.** `resolverDadosItem`
  (`shared/src/regras/compras/compras.ts:192`) resolve um `CarrinhoItemDto` contra o catálogo por
  `CATALOGO_ITENS[item.categoria]?.find((catalogo) => catalogo.nome === item.nome)` (linha 193) —
  a mesma checagem de nome/categoria é o critério "é custom" a reaproveitar nos dois componentes
  (não usar presença de `descricao`: no inventário de esquadrão um item de **catálogo** adicionado
  também grava `descricao`, `dano` etc. — ver `InventarioEsquadrao.adicionar()` abaixo — então esse
  campo não distingue custom de catálogo ali).
- **Ficha do agente — `FichaInventario`** (`frontend/src/app/modules/ficha/componentes/
  ficha-inventario/`), componente **controlado** (sem REST próprio; toda mutação emite
  `inventarioMudou` com o `FichaInventarioDto` inteiro e a página persiste):
  - `CarrinhoItemDto` (`shared/src/regras/compras/compras.dtos.ts:124`) já tem `custo`/`peso`
    (linhas 127-131, obrigatórios) e `descricao?: string` (linhas 160-165, "só nos itens custom").
  - `itemCustomForm` (`ficha-inventario.component.ts:638`) é o form de **criação**, com os campos
    `custo`/`peso`/`descricao` entre outros; `confirmarCriarItem`/`montarItemCustom` (linhas
    1388/1462) montam um `CarrinhoItemDto` novo e `inserirItem` (linha 1542) o acrescenta ao array.
  - `ItemInventarioVM` (linhas 341-390) já expõe `descricao: string | null` (linha 372) mas não tem
    nenhum campo "é custom"; `montarItemInventario` (linha 2614) monta o VM item a item, `descricao:
    item.descricao ?? null` na linha 2728.
  - Já existe um precedente de **edição inline por item** no próprio card: o lápis de apelido
    (`ficha-inventario.component.html:678-687`, `editandoApelidoIndice`/`editarApelido`/
    `confirmarApelido`/`cancelarApelido`) abre um `<input>` no lugar do nome, sem nunca virar
    `p-dialog` mesmo no modo `apresentacao() === 'dialog'` — só as quatro superfícies grandes
    (catálogo+amplificadores, criar item custom, painel "Modificar", "Aplicar em...") viram dialog
    nesse modo (comentário em `ficha-inventario.component.ts:458-465`).
  - O form de criar item já usa, para `custo`/`peso`, um stepper com as classes `.ficha-inv__campo`/
    `.ficha-inv__stepper`/`.ficha-inv__mini-btn`/`.ficha-inv__entrada--num` e `ajustarCampoItem`
    (`ficha-inventario.component.html:296-313`); a descrição usa `.ficha-inv__entrada--area`
    (linhas 405-413) — mesmas classes a reaproveitar no form de edição.
  - No card, `item.descricao` é hoje só leitura (`ficha-inventario.component.html:910-911`).
- **Inventário de esquadrão — `InventarioEsquadrao`** (`frontend/src/app/modules/campanha/
  componentes/inventario-esquadrao/`), **REST-backed** (cada mutação chama `CampanhaService` e
  emite `atualizado` com a lista devolvida pelo backend):
  - `CampanhaInventarioItemDto` (`shared/src/dtos/campanha/campanha.dtos.ts:368-380`) tem
    `id: string`, `custo`/`peso` obrigatórios, `descricao?`/`dano?`/`informacao?`/`resistencia?`/
    `bonus?` opcionais.
  - `InventarioEsquadrao.adicionar(item: ItemCatalogo)` (`inventario-esquadrao.component.ts:178-192`)
    grava `descricao`/`dano`/`informacao`/`resistencia`/`bonus` também para item **de catálogo** —
    por isso a checagem "é custom" não pode usar presença desses campos (ver acima).
  - `itemCustomForm` (linhas 61-72) e `confirmarCriarItem` (linhas 153-176) são só **criação**
    (`POST` via `CampanhaService.adicionarItemInventario`); não existe hoje nenhum método de
    alteração de item — só `ajustarQuantidadeItemInventario` (delta de quantidade) e
    `removerItemInventario` (remoção inteira).
  - Backend: `CampanhaController` (`backend/src/modules/campanha/campanha.controller.ts:124-161`)
    expõe `GET .../inventario`, `POST .../inventario/item`, `DELETE .../inventario/item/:itemId`,
    `PATCH .../inventario/item/:itemId/quantidade` — **não** existe `PATCH`/`PUT` para alterar
    descrição/peso/custo de um item já existente.
  - `CampanhaService` (`backend/src/modules/campanha/campanha.service.ts`) segue sempre o mesmo
    molde: `validarAcessoInventario` → `recuperarInventario` → mutar a lista em TS → `campanhaRepositorio.
    alterarInventario({campanhaId, itens})` (regrava tudo) → `campanhaGateway.emitirInventarioAlterado`.
    Ver `adicionarItemInventario` (319-352), `removerItemInventario` (355-371) e
    `ajustarQuantidadeItemInventario` (377-402) — o novo método de alterar segue o mesmo molde.
  - No template, o card do item (`inventario-esquadrao.component.html:161-193`) mostra
    `<small>{{ item.peso }} slots · ${{ item.custo }}</small>` e não renderiza `descricao`; as
    ações do item ficam em `.inventario-esquadrao__item-acoes` (linhas 169-190: stepper de
    quantidade, "Pegar", remover). Já existe um `.dialogo` modal no mesmo arquivo, usado por
    "Pegar" (linhas 199-212) — mesmo padrão (`dialogo__fundo`/`dialogo`/`dialogo__cabecalho`/
    `dialogo__acoes`, classes globais de `_componentes.scss`) a reaproveitar para o form de editar.

## Entregáveis

### Ficha do agente (`FichaInventario`)

1. `ItemInventarioVM` ganha `readonly custom: boolean`; `montarItemInventario` calcula com
   `!CATALOGO_ITENS[item.categoria]?.some((catalogo) => catalogo.nome === item.nome)` (mesma lógica
   de `resolverDadosItem`, sem importar a função em si — ela resolve pro formato `ItemCatalogo`,
   aqui só o booleano é necessário).
2. Novo signal `editandoItemIndice = signal<number | null>(null)` e `FormGroup itemEditarForm` com
   só 3 controles: `descricao`, `custo`, `peso` (mesmos validators/defaults do trecho equivalente de
   `itemCustomForm`).
3. Métodos `abrirEdicaoItem(indice)` (pré-preenche o form com `descricao ?? ''`/`custo`/`peso` do
   item atual), `cancelarEdicaoItem()`, `confirmarEdicaoItem()` — este último substitui o item no
   array (`custo`/`peso` clampados `Math.max(0, …)`, `descricao` trimada → grava a chave só quando
   não vazia, remove a chave quando o campo for esvaziado) e emite `inventarioMudou` com o array
   inteiro, no mesmo padrão de `inserirItem`/`emitirItens`.
4. Template: um botão de lápis "Editar informações" ao lado do nome do item
   (`ficha-inventario.component.html`, mesma região do lápis de apelido, linhas 678-687), visível só
   quando `editavel() && item.custom`. Clicar abre, **inline no card** (sem `p-dialog`, nos dois
   modos de `apresentacao`), um mini-formulário com Descrição (`textarea`, `.ficha-inv__entrada--area`),
   Custo e Peso (steppers `.ficha-inv__stepper`/`.ficha-inv__mini-btn`, mesmo padrão do form de
   criar) e os botões Salvar/Cancelar (`.ficha-inv__btn--principal`/`.ficha-inv__btn--secundario`).

### Inventário de campanha (`InventarioEsquadrao`)

5. **Contrato (`shared`).** Novo DTO `CampanhaInventarioItemAlterarDto` em
   `shared/src/dtos/campanha/campanha.dtos.ts`, ao lado dos demais DTOs de operação de inventário:
   `{ readonly campanhaId: number; readonly itemId: string; readonly descricao?: string; readonly
   custo: number; readonly peso: number; }` — só os 3 campos pedidos, sem nome/categoria/dano/etc.
6. **Backend.** `CampanhaService.alterarItemInventario(dto, usuarioAtivo)`: `validarAcessoInventario`
   → localiza o item por `itemId` (`ResourceNotFoundException` se não achar, mesmo padrão de
   `ajustarQuantidadeItemInventario`) → substitui `descricao`/`custo`/`peso` preservando os demais
   campos (`nome`, `categoria`, `quantidade`, `dano`/`informacao`/`resistencia`/`bonus`, `id`) →
   `campanhaRepositorio.alterarInventario` → `campanhaGateway.emitirInventarioAlterado`. Novo
   endpoint no controller: `@Patch(':id/inventario/item/:itemId')`, ao lado do de quantidade.
7. **Frontend service.** `CampanhaService.alterarItemInventario(id, itemId, dto)` — `PATCH
   ${base}/${id}/inventario/item/${itemId}`, mesmo padrão de `ajustarQuantidadeItemInventario`.
8. **Componente.** Botão de lápis na linha do item (`inventario-esquadrao.component.html:161-193`,
   dentro de `.inventario-esquadrao__item-acoes`), visível só quando `!somenteLeitura() && item`
   custom (mesma checagem de nome contra `CATALOGO_ITENS[item.categoria]`). Abre o mesmo padrão de
   `.dialogo` modal já usado por "Pegar" (linhas 199-212), com Descrição/Custo/Peso e os botões
   Salvar/Cancelar; confirmar chama `CampanhaService.alterarItemInventario` e emite `atualizado`
   com a lista devolvida, no mesmo padrão de `confirmarTransferencia`.

## Critérios de Aceite

- Na ficha, um item custom mostra o lápis "Editar informações"; um item de catálogo não mostra
  nenhum. Editar descrição/custo/peso e salvar reflete de imediato no card (`item.descricao`,
  `item.pesoTexto`, `item.custoTotalTexto`) e persiste (reabrir a ficha/recarregar mantém o valor).
- Na campanha, mesmo comportamento: só item custom tem o lápis; editar e salvar reflete na lista
  (peso/custo exibidos) e persiste no banco (`GET .../inventario` depois de editar devolve os novos
  valores); outro usuário conectado à mesma campanha vê a mudança sem F5 (evento
  `campanha:inventario-alterado`).
- Em nenhum dos dois inventários a edição altera `nome`, `categoria`, `quantidade` ou qualquer
  stat mecânico (`dano`/`informacao`/`resistencia`/`bonus`/`modulo`/`categoriaEmprestada`) do item.
- Limpar o campo Descrição e salvar remove a descrição do item (deixa de aparecer no card/lista),
  sem erro.
- Custo/Peso não aceitam valor negativo (mesmo clamp `Math.max(0, …)` do form de criação).
- `shared`/`backend`/`frontend`: suítes verdes (casos novos cobrindo detecção de item custom,
  `alterarItemInventario` do backend e a mutação de item na ficha), lint limpo.
- Gate visual (skill `verify`, `1920×1080` e `360×800`, dois usuários simultâneos na campanha): o
  lápis novo não quebra o layout do card/linha em nenhum dos dois inventários, o mini-formulário
  (inline na ficha; modal na campanha) abre e fecha sem overflow, e o valor editado aparece
  corretamente pros dois usuários.

## Fora de Escopo

- Editar item de **catálogo** — permanece inteiramente somente-leitura nos dois inventários.
- Editar `nome`, `categoria`, `quantidade`, `dano`/`informacao`/`resistencia`/`bonus`/`modulo`/
  `categoriaEmprestada` — só os 3 campos pedidos (descrição/peso/custo).
- Editar item dentro de um sub-inventário (`containerId`, Pochete/Bolso de Corpo) de forma
  diferente do item no inventário principal — o lápis funciona igual nos dois, sem tratamento
  especial de container.
- Editar `modificacoes` aplicadas a um item (ficha) ou preservá-las no inventário de esquadrão —
  frentes independentes já registradas em `docs/specs/backlog/
  preservar-modificacoes-inventario-esquadrao.spec.md` (`IDEAS.md` `I-020`) e
  `docs/specs/backlog/descricao-modificacoes-item-inventario.spec.md` (`IDEAS.md` `I-021`).
- Qualquer migration de banco — `campanha.inventario` já é JSONB (`campanha.repository.ts`), e a
  ficha guarda o inventário dentro de `ficha.dados`, também JSONB.

## Dependências

- `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.ts`
  (`ItemInventarioVM`, `montarItemInventario`, `itemCustomForm` como referência) e `.html`
  (lápis de apelido como análogo, `formItemCustomTemplate` como referência de classes).
- `shared/src/regras/compras/compras.ts` (`resolverDadosItem`, referência da checagem "é custom"),
  `shared/src/regras/compras/compras.dtos.ts` (`CarrinhoItemDto`).
- `frontend/src/app/modules/campanha/componentes/inventario-esquadrao/
  inventario-esquadrao.component.ts` (`itemCustomForm`/`confirmarCriarItem` como referência) e
  `.html` (`.dialogo` de "Pegar" como análogo).
- `frontend/src/app/modules/campanha/campanha.service.ts` (`ajustarQuantidadeItemInventario` como
  referência de método REST por item).
- `shared/src/dtos/campanha/campanha.dtos.ts` (novo `CampanhaInventarioItemAlterarDto`).
- `backend/src/modules/campanha/campanha.controller.ts` e `campanha.service.ts`
  (`ajustarQuantidadeItemInventario`/`removerItemInventario` como referência de molde).
