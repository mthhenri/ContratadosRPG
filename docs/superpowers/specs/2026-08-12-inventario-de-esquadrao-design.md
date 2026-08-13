# Inventário de Esquadrão — Design

**Goal:** Um inventário compartilhado por campanha (não por ficha): qualquer
membro pode guardar item, tirar item, sem limite de armazenamento e sem
equipar nada. Só pode ser acessado enquanto a campanha está marcada como
"Na Base" (a Fundação); em "Em Missão" fica bloqueado para jogadores (o
Mestre sempre acessa). Itens podem ser transferidos nos dois sentidos entre
o inventário de esquadrão e o inventário de uma ficha ("Pegar" / "Mandar
pra base").

## Contexto atual

- `campanha` (migration `0004`) só tem `id, nome, descricao, codigo_convite`
  — nenhum conceito de localização/estado. Não existe hoje nada de "Base da
  Fundação" em código; é só lore em `docs/core/sistema-v4.1.0.md`.
- Não existe tabela/entidade de item avulso. O inventário de ficha vive
  inteiro dentro do JSONB `ficha.dados` (`FichaInventarioDto.itens:
  CarrinhoItemDto[]`, `shared/src/dtos/ficha/ficha.dtos.ts` +
  `shared/src/regras/compras/compras.dtos.ts`), reescrito por completo a
  cada alteração (merge otimista no front, `FichaEdicaoService`).
- `CarrinhoItemDto` carrega campos de uso (equipado, guardada, apelido,
  modificacoes, containerId) que não fazem sentido pra um inventário só de
  armazenamento sem equipar nada — o novo item do esquadrão reaproveita só
  os campos **descritivos** de `ItemCatalogo` (nome, custo, peso,
  categoria, dano/informação/resistência/bônus), mais `id` e `quantidade`.
- `FichaModule` já importa `CampanhaModule` e injeta `CampanhaRepository`/
  `CampanhaService` (`backend/src/modules/ficha/ficha.module.ts`) — a
  direção da dependência é **ficha → campanha**, nunca o contrário. Isso
  define onde as rotas de transferência precisam morar (ver §4).
- Tempo real: `CampanhaGateway` (`backend/src/core/gateway/campanha.gateway.ts`)
  já mantém a sala `campanha:<id>`, onde todo membro conectado entra
  (`entrarSalaCampanha`); eventos hoje incluem `ficha:alterada`,
  `membro:entrou`, `rolagem:registrada`, todos emitidos pela service
  correspondente **depois** de persistir via REST (padrão broadcast-only,
  proibição #25). O frontend (`tempo-real.service.ts`) escuta e sempre
  refaz o fetch REST — nunca confia no payload do evento pra permissão.
- Tela `/painel/:id` (`CampanhaDetalhe`) não tem abas; visão do Mestre usa
  grade de cards (Membros | Esquadrão) + ícones flutuantes no cabeçalho
  (`app-historico-rolagens-sidebar`, `app-calculadora-flutuante`); visão do
  Jogador tem uma coluna lateral fixa de 450px (`&__jogador-lateral`) com
  Equipe/Rolagens/Sessão, ao lado do card da ficha embutida.

## Design

### 1. Estado da campanha: Na Base / Em Missão

Nova coluna em `campanha`, seguindo a mesma convenção já usada em
"Ficha cor"/"Ficha oculta" (migrations `0012`/`0014`): **nullable, sem
`DEFAULT`** — proibição #7 do projeto (migrations rodam no build, antes do
código novo assumir tráfego; `DEFAULT`/`NOT NULL` sem valor quebraria a
versão anterior ainda rodando contra o schema novo). Campanha existente
nasce com `na_base = null`, tratado como "Na Base" (`true`) na leitura via
`COALESCE`:

```sql
ALTER TABLE campanha ADD COLUMN na_base BOOLEAN;
```

(migration `0017 - Campanha na base e inventario.sql`, seguindo a
numeração sequencial atual, cuja última é `0016`).

- `PUT /campanha/:id/estado` → `CampanhaEstadoAlterarDto { id: number;
  naBase: boolean }`. Só Mestre (`validarMestre`).
- `CampanhaService.alterarEstado` persiste e chama
  `campanhaGateway.emitirEstadoAlterado(campanhaId, naBase)`.
- `CampanhaResumoDto`/`CampanhaDto` (o que já é devolvido em
  `GET /campanha/:id`) ganham o campo `naBase: boolean`.
- Frontend: o chip `🏠 Na Base` / `🚀 Em Missão`, ao lado do nome da
  campanha no cabeçalho de `detalhe.page.html`, vira um botão — só
  clicável quando `exibirComoMestre()`. Clique chama
  `campanhaService.alterarEstado(...)`; o `<button>` fica sem `onclick`
  (só texto) pro jogador.

### 2. Inventário: dado e endpoints

Nova coluna em `campanha`, na mesma migration `0017`, também nullable e
sem `DEFAULT` (proibição #7): campanha existente nasce com
`inventario = null`, tratado como lista vazia na leitura via `COALESCE`.

```sql
ALTER TABLE campanha ADD COLUMN inventario JSONB;
```

DTO novo em `shared/src/dtos/campanha/campanha.dtos.ts`:

```ts
export interface CampanhaInventarioItemDto {
  readonly id: string; // uuid, gerado no POST
  readonly nome: string;
  readonly categoria: ItemCategoriaEnum;
  readonly custo: number;
  readonly peso: number;
  readonly quantidade: number;
  readonly descricao?: string;
  readonly dano?: string;
  readonly informacao?: string;
  readonly resistencia?: string;
  readonly bonus?: string;
}

export interface CampanhaInventarioDto {
  readonly itens: readonly CampanhaInventarioItemDto[];
}

export interface CampanhaInventarioItemAdicionarDto {
  readonly campanhaId: number;
  readonly nome: string;
  readonly categoria: ItemCategoriaEnum;
  readonly custo: number;
  readonly peso: number;
  readonly quantidade: number;
  readonly descricao?: string;
  readonly dano?: string;
  readonly informacao?: string;
  readonly resistencia?: string;
  readonly bonus?: string;
}

export interface CampanhaInventarioItemRemoverDto {
  readonly campanhaId: number;
  readonly itemId: string;
}

export interface CampanhaInventarioItemQuantidadeAjustarDto {
  readonly campanhaId: number;
  readonly itemId: string;
  readonly delta: number; // +1/-1 do stepper; remove o item se zerar
}
```

Endpoints novos em `CampanhaController`/`CampanhaService`
(`backend/src/modules/campanha/`):

- `GET /campanha/:id/inventario` → `CampanhaInventarioDto`
- `POST /campanha/:id/inventario/item` → adiciona (gera `id` via
  `crypto.randomUUID()`)
- `DELETE /campanha/:id/inventario/item/:itemId` → remove item inteiro
- `PATCH /campanha/:id/inventario/item/:itemId/quantidade` → ajusta por
  delta (mesmo padrão do stepper de Vida/Energia da ficha)

Todas passam por um novo gate,
`CampanhaService.validarAcessoInventario({ campanhaId, usuarioId })`:
resolve o papel do usuário (mesma base de `validarMembro` + checar
`tipo_campanha_membro_papel_id`); se `JOGADOR` e `na_base === false`,
lança `UnauthorizedAccessException`. Mestre sempre passa, independente do
estado.
Diferente de `validarMembro`/`validarMestre` (privados), este método
precisa ser **público**: o módulo `ficha` também o chama nas duas rotas
de transferência do §4, já que `FichaModule` importa `CampanhaModule`.

Cada mutação chama `campanhaGateway.emitirInventarioAlterado(campanhaId)`
depois de persistir.

### 3. Frontend: onde o inventário aparece

**Visão do Mestre** — reaproveita literalmente o padrão de
`app-historico-rolagens-sidebar`: um novo ícone circular 📦 no cabeçalho,
ao lado do 🎲 de rolagens, abre um `<aside>` que desliza da direita (mesma
animação/classe-base, adaptada para `app-inventario-esquadrao-sidebar` ou
componente equivalente). Sempre habilitado para o Mestre, mesmo em Missão.

**Visão do Jogador** — no cabeçalho do card "ficha embutida"
(`detalhe__ficha-embutida`, ao lado do botão "Abrir completa"), um novo
botão "📦 Inventário" alterna o conteúdo de `detalhe__jogador-lateral`
inteiro: em vez de Equipe/Rolagens/Sessão, mostra o componente de
inventário. Clicar de novo volta ao conteúdo normal. Desabilitado quando
`naBase === false`.

Componente compartilhado `app-inventario-esquadrao` (usado dentro do
drawer do Mestre e dentro da coluna lateral do Jogador): lista de itens
(nome, categoria, quantidade), botão "+ Adicionar item" que abre o mesmo
seletor de catálogo já usado em `ficha-inventario.component.ts`, e um
botão "Pegar →" por item.

### 4. Transferência ficha ↔ inventário de esquadrão

Como `FichaModule` já depende de `CampanhaModule` (nunca o inverso), as
duas rotas de transferência moram no **módulo `ficha`**, chamando métodos
públicos que o `CampanhaRepository`/`CampanhaService` já expõem (evita
dependência circular):

- `POST /ficha/:id/inventario/item/pegar` —
  `FichaInventarioItemPegarDto { fichaId: number; campanhaItemId: string;
  quantidade?: number }`. Sem `quantidade`, transfere o item inteiro.
- `POST /ficha/:id/inventario/item/:itemId/mandar-para-base` —
  `FichaInventarioItemMandarParaBaseDto { fichaId: number; itemId: string;
  quantidade?: number }`. Bloqueia (400) se o item estiver
  `equipado: true` — a mensagem orienta a desequipar primeiro na aba
  Inventário da ficha.

**Ponto de atenção verificado no código:** este projeto não usa transação
nenhuma, em lugar nenhum, para escrita multi-tabela — nem
`knex.transaction(...)` (que não aparece em nenhum repositório hoje) nem
CTE multi-tabela. O padrão real, usado por **todo** módulo (ex.:
`CampanhaService.criarCampanha` grava `campanha` e depois `campanha_membro`
em dois `await` sequenciais; `FichaService.alterarFicha` lê o `dados`
JSONB inteiro, muda em TypeScript, e regrava o documento inteiro) é
**ler o agregado inteiro, mutar em TypeScript, regravar o documento
inteiro** — sem lock, sem transação, aceitando a mesma janela de "last
write wins" que já existe hoje em qualquer edição concorrente de ficha
(ex.: dois cliques simultâneos no stepper de Vida). A transferência segue
exatamente esse padrão, só que em dois agregados (`ficha`, `campanha`) em
vez de um:

1. Lê a ficha (`FichaRepository.recuperarPorId`) e a campanha
   (`CampanhaRepository.recuperarPorId`, que passa a incluir
   `inventario`).
2. Valida em TypeScript: quantidade pedida `<= quantidade disponível` no
   lado de origem; se for "mandar pra base", o item não pode estar
   `equipado: true`.
3. Monta o novo `ficha.dados` (item somado/subtraído de
   `dados.inventario.itens`) e o novo `campanha.inventario` (item
   subtraído/somado) em memória.
4. Grava os dois com dois `await` sequenciais — `FichaRepository.
   alterarFicha` primeiro, depois `CampanhaRepository.alterarInventario`
   (mesma ordem "dono da rota escreve primeiro" que
   `CampanhaService.criarCampanha` já usa entre `campanha`/
   `campanha_membro`).

Duas transferências simultâneas do mesmíssimo item podem, numa janela
rara, ambas lerem a mesma quantidade "antes" e uma delas sobrescrever a
outra — o mesmo risco que já existe hoje em qualquer ajuste concorrente
de ficha neste projeto. Não introduzo lock/transação nova para este caso
por não ser o padrão do projeto; fica registrado aqui como risco aceito,
não como lacuna esquecida.

Ambas exigem `validarAcessoInventario` (mesma regra de Na Base/Em Missão
do §2) e que `fichaId` pertença ao usuário autenticado (ninguém transfere
para a ficha de outro jogador).

Quando o jogador tem mais de uma ficha na campanha, o **frontend** pede
qual ficha antes de chamar `pegar` (dropdown simples com o nome das
fichas do próprio usuário na campanha — dado que `CampanhaDetalhe` já
carrega via `fichasEsquadrao()`/equivalente).

Quando `quantidade` do item é maior que 1 (nos dois sentidos), o frontend
abre um campo simples pedindo quantos transferir antes de chamar o
endpoint.

### 5. Tempo real

`CampanhaGateway` ganha dois métodos, emitidos na sala `campanha:<id>` já
existente:

- `emitirInventarioAlterado(campanhaId: number)`
- `emitirEstadoAlterado(campanhaId: number, naBase: boolean)`

Chamados pelas services (`CampanhaService` para as mutações diretas do
inventário/estado; `FichaService` para as duas rotas de transferência,
já que ela também tem a instância do gateway via `GatewayModule`) depois
de cada commit bem-sucedido.

`tempo-real.service.ts` ganha `inventarioAlterado$`/`estadoAlterado$`.
`CampanhaDetalhe` (e o novo componente de inventário) escutam e refazem o
`GET /campanha/:id/inventario` / `GET /campanha/:id` — mesmo padrão dos
eventos existentes, sem confiar no payload pra permissão.

### 6. Tratamento de erro

Reaproveita as três exceptions já existentes em `backend/src/core/
exceptions/` (nenhuma nova é necessária):

- `UnauthorizedAccessException` (403): usuário não é membro da campanha;
  ou é jogador e `naBase === false`; ou o `fichaId` informado em
  `pegar`/`mandar-para-base` não pertence ao usuário autenticado.
- `BusinessException` (400): quantidade inválida (`<= 0` ou maior que o
  disponível no momento da leitura); item `equipado: true` tentando ser
  mandado pra base.
- `ResourceNotFoundException` (404): `itemId`/`fichaId`/`campanhaId`
  inexistente ou inativo.

## Testes

**Backend** (`campanha.service.spec.ts`, `ficha.service.spec.ts`):
- Jogador bloqueado em todas as rotas de inventário quando `naBase =
  false`; Mestre passa nas mesmas condições.
- Adicionar/remover/ajustar quantidade no inventário de esquadrão.
- `pegar`: transferência total e parcial; erro se `fichaId` não é do
  usuário; erro se quantidade pedida > disponível.
- `mandar-para-base`: bloqueado se item `equipado: true`; transferência
  total e parcial.
- `alterarEstado`: só Mestre.

**Frontend**:
- Componente `app-inventario-esquadrao`: listar, adicionar (via seletor
  de catálogo), remover, pegar (com e sem seletor de ficha, com e sem
  campo de quantidade).
- Toggle da coluna lateral do Jogador (Equipe/Rolagens/Sessão ↔
  Inventário) e do drawer do Mestre.
- Chip de estado: clicável só pro Mestre; reflete `estadoAlterado$` em
  tempo real pros outros membros conectados.
