# CONVENTIONS.md — contratados-rpg

> Referência rápida. Para contexto completo e justificativas, consulte o `SYSTEM.SPEC.md`.

---

## Regra de Linguagem

**Teste:** "Esse conceito existiria em qualquer projeto de software?"
- **Sim → inglês** (pastas arquiteturais, classes genéricas, campos de BaseEntity, exceptions, decorators)
- **Não → português** (arquivos de entidade, métodos, variáveis, DTOs, valores de enum, nomes de tabela)

| ✅ Inglês | ✅ Português |
|---|---|
| `controllers/` `services/` `repositories/` `core/` `shared/` `regras/` | `ficha.service.ts` `campanha.repository.ts` |
| `BaseEntity` `BaseRepository` `StandardResponse` `PaginatedResult` | `criarFicha()` `regenerarConvite()` |
| `isDeleted` `createdDate` `updatedDate` `deletedDate` (TS e SQL) | `nomeCompleto` `codigoConvite` `senhaEncriptada` |
| `BusinessException` `ResourceNotFoundException` `UnauthorizedAccessException` | `FichaCriarDto` `TipoFichaEnum` |
| `@Public()` `@ActiveUser()` | `MESTRE` `JOGADOR` `COMBATENTE` |
| `auth-token.interceptor.ts` `global-exception.filter.ts` | `autenticacao.guard.ts` |

---

## Nomes de Arquivo

```
ficha.service.ts            → entidade de negócio → português
ficha.repository.ts
ficha.controller.ts
base.repository.ts          → padrão genérico → inglês
global-exception.filter.ts  → padrão técnico → inglês
auth-token.interceptor.ts   → padrão técnico → inglês
autenticacao.guard.ts       → comportamento de negócio → português
ficha-formulario.component.ts
campanha-listagem.page.ts
```

---

## DTOs

**Padrão:** `Entidade + Complemento (se houver) + Verbo + Dto`

**Entrada** (verbo no infinitivo) / **Saída** (verbo no particípio):

| Entrada | Saída | Quando usar |
|---|---|---|
| `FichaCriarDto` | `FichaCriadaDto` | operação no modelo inteiro |
| `FichaRecuperarDto` | `FichaRecuperadaDto` | recuperação individual — entrada sempre `{ id: number }` |
| `FichaListarDto` | `FichaResumoDto` | listagem — saída sempre resumida |
| `FichaAlterarDto` | `FichaAlteradaDto` | alteração completa — nunca "Atualizar/Atualizado" |
| `FichaDadosAlterarDto` | `FichaDadosAlteradaDto` | sub-aspecto específico (complemento) |
| `CampanhaConviteRegenerarDto` | `CampanhaConviteRegeneradoDto` | complemento + verbo |
| `UsuarioSenhaAlterarDto` | `UsuarioSenhaAlteradaDto` | sub-aspecto específico |

**Regras do complemento:**
- Omitir quando a operação representa o modelo inteiro
- Usar quando atinge só um sub-aspecto (`Dados`, `Senha`, `Convite`)
- Múltiplos campos → agrupar num substantivo semântico
- Coleção → plural do complemento
- **Complemento com mais de uma palavra → todas as palavras antes do verbo, sem exceção:**
  `FichaAcessoConcederDto` ✅ / `FichaConcederAcessoDto` ❌

**DTOs de relatório/consulta computada** (recorte calculado, não CRUD) → `Entidade + Recorte + Dto`, sem verbo.
**Value-objects** (sem entidade nem ciclo de vida) → nome do conceito, sem entidade nem verbo.

**Regras adicionais:**
- Recuperação individual sempre `EntidadeRecuperarDto { id: number }` — nunca primitivo
- Toda operação usa DTO mesmo com um único campo — zero primitivos em assinaturas
- O `id` de `@Param`/`@Query` é injetado no DTO **pela controller** — service e repository nunca recebem `id` solto
- `alterar` idem: id dentro do DTO (`EntidadeInternoAlterarDto`), nunca `alterar(id, dados)`
- Nenhum DTO é alias ou re-export de outro
- **Herança:** negócio nunca herda negócio (nem subclasse vazia); negócio herda apenas core
  (`PaginatedResult<TItem>` — classe — e `StandardResponse<TData>` — interface, montada pelo interceptor)

**Localização:** sempre em `shared/src/dtos/[modulo]/` — nunca dentro de `backend/` ou `frontend/`

**Paginação e `allRows`:** listagens paginadas usam `pagina`, `itensPorPagina`,
`ordenarPor`, `direcao`; o DTO de filtro pode expor `allRows?: boolean` (inglês) que omite
`LIMIT/OFFSET` mantendo a estrutura `PaginatedResult<T>` (`totalItens = itens.length`,
`paginaAtual = totalPaginas = 1`). Query param chega string → usar o `@Transform` de
boolean padrão. Listagens que já retornam tudo não recebem `allRows`.

---

## Métodos

Padrão: `verbo + entidade`, sem preposições, sem abreviações:

```typescript
// ✅
criarFicha()          listarFichas()         recuperarFicha()
alterarFicha()        excluirFicha()         validarLogin()
criarCampanha()       regenerarConvite()     entrarCampanha()
concederAcesso()      revogarAcesso()        calcularVida()

// ❌
createFicha()         getFicha()             findByLogin()
calcVida()            checkAcesso()          atualizarFicha()
existeLogin()         existeNome()
```

---

## Variáveis

Sem abreviações. Sempre explícitas:

```typescript
// ✅
const usuarioEncontrado  = await this.usuarioRepositorio.buscarLogin({ login });
const fichaRecuperada    = await this.fichaRepositorio.recuperar({ id: dto.id });
const senhaEstaCorreta   = await bcrypt.compare(senhaNaoEncriptada, senhaEncriptada);

// ❌
const u  = await this.repo.find(l);
const ok = await bcrypt.compare(p, h);
```

---

## SQL

```sql
-- ✅ Parâmetros nomeados com objeto
SELECT * FROM ficha WHERE campanha_id = :campanhaId AND is_deleted = false
{ campanhaId }

-- ✅ INSERT com SELECT — BaseEntity sempre explícito (sem DEFAULT)
INSERT INTO campanha (nome, descricao, codigo_convite, created_date, updated_date, is_deleted)
SELECT :nome, :descricao, :codigoConvite, NOW(), NOW(), false
RETURNING id, nome, descricao, codigo_convite, created_date
{ nome, descricao, codigoConvite }

-- ✅ Soft delete via BaseRepository
executarSoftDelete(identificador)  -- nunca DELETE físico

-- ✅ JSONB: campo de jogo em listagem
SELECT ficha.id, ficha.nome, ficha.dados->>'classe' AS classe
FROM ficha WHERE ficha.campanha_id = :campanhaId AND ficha.is_deleted = false

-- ❌ Nunca
SELECT * FROM ficha WHERE id = ?                 -- posicional proibido
INSERT INTO ficha VALUES (...)                   -- VALUES proibido
WHERE login = '${login}'                         -- interpolação proibida
SELECT * FROM ficha                              -- sem filtro is_deleted proibido
INNER JOIN campanha c ON ...                     -- alias abreviado proibido
codigo_convite VARCHAR NOT NULL DEFAULT '...'    -- DEFAULT proibido
```

**Nomes de campo de data:**
- BaseEntity (inglês): `created_date`, `updated_date`, `deleted_date` — `timestamptz`
- Negócio (português): `[contexto]_data` — instante → `timestamptz`; calendário puro → `date`
- Nunca `_at`, `_em`, `data_[contexto]`

**Nomes:**
- Tabelas: singular português — `usuario`, `campanha`, `ficha`, `usuario_ficha_acesso`
- Colunas de negócio: snake_case português; BaseEntity: snake_case inglês
- Objetos genéricos de banco (functions/triggers de infra): inglês — `fn_set_updated_date()`

**Constraints, índices, triggers, functions — prefixo por tipo, sempre nomeados:**

| Objeto | Prefixo | Exemplo |
|---|---|---|
| Primary key | `pk_` | `pk_ficha` |
| Foreign key | `fk_` | `fk_ficha_campanha` |
| Unique index | `uix_` | `uix_usuario_login_ativo` |
| Index | `ix_` | `ix_ficha_campanha` |
| Check constraint | `chk_` | `chk_campanha_membro_papel_valido` |
| Trigger | `trg_` | `trg_ficha_updated_date` |
| Function | `fn_` | `fn_set_updated_date` |

---

## Enums

```typescript
// shared/src/enums/tipo-ficha.enum.ts        → tabela tipo_ficha
export enum TipoFichaEnum {
  JOGADOR  = 'JOGADOR',
  CRIATURA = 'CRIATURA',
  NPC      = 'NPC',
}

// shared/src/enums/tipo-campanha-membro-papel.enum.ts → tabela tipo_campanha_membro_papel
export enum TipoCampanhaMembroPapelEnum {
  MESTRE  = 'MESTRE',
  JOGADOR = 'JOGADOR',
}
```

Sempre: string enum, valor igual ao nome, SCREAMING_SNAKE_CASE, em `shared/src/enums/`.

**Enums de COLUNA são tabelas de referência** `tipo_<tabela>_<complemento?>`
(BaseEntity + `codigo` + `descricao`); coluna de negócio é INTEGER FK `<tabela_referencia>_id`.
Repositório traduz `codigo ↔ id` no SQL — DTOs/services/frontend nunca veem o id.
Nome do enum TS = nome da tabela em PascalCase + `Enum`.

**Enums de CONTEÚDO DE JOGO (dentro do JSONB `ficha.dados`) NÃO viram tabela `tipo_*`:**
`ClasseEnum`, `PatenteEnum`, categorias de item etc. existem só como enum TS no shared,
validados via `@IsEnum`. A fonte da verdade deles é `docs/core/sistema-v4.1.0.md`.

---

## Migrations

Arquivo `.sql` puro em `backend/src/database/migrations/`, nome `NNNN - Nome descritivo.sql`
(4 dígitos + `" - "` + frase em português). Duas seções por marcador sozinho na linha: `-- UP`
(obrigatória) e `-- DOWN` (obrigatória, salvo justificativa no arquivo). Próxima migration: `0002`.
Detalhes completos no `SYSTEM.SPEC.md` §10.7.

```sql
-- UP

CREATE TABLE exemplo (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  nome          VARCHAR(255) NOT NULL
);

-- DOWN

DROP TABLE IF EXISTS exemplo CASCADE;
```

| ❌ Nunca no arquivo de migration | ✅ Fazer |
|---|---|
| `BEGIN` / `COMMIT` / `ROLLBACK` | Nada — o Knex abre/fecha a transação por migration sozinho |
| Arquivo `.ts` com `up`/`down` | Arquivo `.sql` com marcadores `-- UP` / `-- DOWN` |
| Deixar a seção `-- DOWN` de fora | Sempre incluir (ou justificar em comentário) |

**Única exceção à regra de parâmetros nomeados:** dentro de `migrations/`, valores constantes
(nomes de tag, feriados, códigos de enum) são **literais SQL** (`'Backend'`, escapando `'` como
`''`) — migration não tem input de usuário. O runtime (repositórios) continua 100% `:nomeParametro`.

---

## Motor de Regras (`shared/src/regras/`) — exceção sancionada

Única lógica de negócio permitida no shared: fórmulas e tabelas do jogo.

- Funções puras + dados tipados; zero dependências; sem I/O, sem estado
- Consumido pelo frontend (cálculo instantâneo) e backend (validação autoritativa)
- Toda fórmula com teste unitário validado contra os docs do jogo
- Permissões e persistência NUNCA entram aqui

```typescript
// ✅
export function calcularVida(dto: VidaCalcularDto): number { ... }
export const PROGRESSAO_COMBATENTE: ProgressaoClasse = { ... };

// ❌ proibido em regras/
import { Injectable } from '@nestjs/common';     // dependência de framework
export async function salvarFicha(...)           // I/O
```

---

## Camadas — Regras Rápidas

### Controller — burra
Só expõe endpoint e repassa. Sem if, sem try/catch, sem lógica. Única microinteligência:
montar o DTO com o id da rota:
```typescript
@Post()
criar(@Body() dto: FichaCriarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
  return this.fichaService.criar(dto, usuarioAtivo);
}

@Get(':id')
recuperar(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
  return this.fichaService.recuperar({ id }, usuarioAtivo);   // id entra no DTO
}

@Put(':id')
alterar(@Param('id', ParseIntPipe) id: number, @Body() dto: FichaAlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
  return this.fichaService.alterar({ ...dto, id }, usuarioAtivo);
}
```

### Service — inteligente
Regras de negócio, validações, **permissões**, orquestração, motor de regras, emissão WS:
```typescript
async alterar(dto: FichaInternoAlterarDto, usuarioAtivo: JwtPayload) {
  const fichaRecuperada = await this.fichaRepositorio.recuperar({ id: dto.id });
  if (!fichaRecuperada) throw new ResourceNotFoundException('Ficha');

  await this.validarPermissaoEdicao({ fichaId: dto.id }, usuarioAtivo);   // dono ou mestre
  this.validarDadosContraRegras(dto);                                     // shared/regras

  const fichaAlterada = await this.fichaRepositorio.alterar(dto);
  this.campanhaGateway.emitirFichaAlterada(fichaAlterada);                // pós-mutação
  return fichaAlterada;
}
```

### Repository — só SQL
Sem lógica. `executarConsulta()` / `executarComando()` / `executarSoftDelete()`.
Nunca recebe primitivo nem `Partial<Model>` — sempre DTO interno
(`alterar(dto: FichaInternoAlterarDto)`, nunca `alterar(id, dados)`).

### Gateway — broadcast-only
Valida JWT no handshake; valida permissão de sala consultando a service do módulo dono;
**nunca** recebe mutação; **nunca** duplica regra de permissão.

---

## Imports do Shared

```typescript
import { FichaCriarDto }     from '@contratados-rpg/shared/dtos/ficha';
import { TipoFichaEnum }     from '@contratados-rpg/shared/enums';
import { StandardResponse }  from '@contratados-rpg/shared/interfaces';
import { calcularVida }      from '@contratados-rpg/shared/regras/agente';
```

DTOs e enums **nunca** são redefinidos dentro de `backend/` ou `frontend/`.

---

## Frontend (Angular)

- **Standalone components** sempre — nunca NgModule por feature
- **Signals** (`signal`/`computed`/`effect`) — evitar `Subject`/`BehaviorSubject`
- **Reactive Forms** em todos os formulários — sem template-driven, sem `ngModel`
  (nem dentro de CVA — embrulhar controle de terceiros com `FormControl` + `[formControl]`)
- **Lazy loading** por rota via `loadComponent`/`loadChildren`
- Calculadora: páginas públicas, 100% client-side via `shared/regras`

---

## Estilos

**Extensão:** sempre `.scss`, nunca `.css`
**Utilitários:** Tailwind CSS para layout, espaçamento e tipografia
**Classes customizadas:** BEM em português — `.ficha-cartao__atributo--destacado`
**Escopo:** estilo de componente no `.scss` do componente; `styles.scss` só o global
**Proibido:** `style=""` inline, seletor de ID
**Identidade visual:** tema "Terminal de Contenção" — **fonte da verdade em `docs/design/`**
(tokens em `docs/design/tema/_tokens.scss`). Estilos de componente **consomem os tokens**
(`var(--surface)`, `var(--accent)`, `var(--font-mono)`, `var(--positive)`…) — **nunca hex
solto**. Copie o bloco BEM necessário de `docs/design/tema/_componentes.scss` para o `.scss`
scoped do componente. **Leia `docs/design/DESIGN.md` antes de qualquer trabalho de UI.**

---

## Proibições — Resumo Rápido

| ❌ Nunca fazer | ✅ Fazer em vez disso |
|---|---|
| Abreviar nomes | Nome completo sempre |
| Lógica na controller | Mover para a service |
| ORM / query builder | `knex.raw()` com SQL bruto |
| `SELECT` sem `is_deleted = false` | Sempre filtrar deletados |
| `?` posicional em SQL | `:nomeParametro` com objeto |
| `VALUES` no INSERT | `INSERT ... SELECT ... RETURNING` |
| `DEFAULT` em coluna SQL | Aplicação fornece todos os valores |
| Enum de coluna como `VARCHAR + CHECK` / ENUM nativo | Tabela `tipo_*` + INTEGER FK |
| Tabela `tipo_*` para enum de conteúdo de jogo (JSONB) | Enum TS no shared + `@IsEnum` |
| Campo de jogo virando coluna | JSONB `dados` + `dados->>'campo'` |
| Alias abreviado em SQL | Nome completo ou alias descritivo |
| Campo de data fora do padrão | `[contexto]_date` / `[contexto]_data` |
| `process.env` direto | `ConfigService` injetado |
| Conceito de negócio em inglês / genérico em português | Regra de linguagem (§4 do SPEC) |
| DELETE físico | `executarSoftDelete()` sempre |
| Extrapolar escopo da task | Implementar exatamente o que a spec define |
| DTO dentro de `backend/` ou `frontend/` | Sempre em `shared/src/dtos/` |
| NgModule / `.css` / `style=""` / seletor de ID | standalone / `.scss` / Tailwind+BEM |
| Hex/cor/fonte/raio hardcoded em SCSS | Consumir tokens do tema (`var(--accent)`, `var(--font-mono)`… de `docs/design/`) |
| Primitivo em service/repository | DTO, mesmo com um único campo |
| `existe*` em método | `validar*` |
| `Atualizar`/`Atualizado` | `Alterar`/`Alterado` |
| DTO herdando DTO de negócio | Campos explícitos; herança só de core |
| Query do módulo A no repositório do módulo B | Repositório do módulo correto |
| Mutação via WebSocket | Escrita só por REST; gateway broadcast-only |
| I/O, estado ou framework em `shared/regras/` | Funções puras + dados tipados |
| Alterar fórmula sem consultar os docs do jogo | Documento vence o código; atualizar testes |
| Duplicar regra de permissão (gateway, controller…) | Service do módulo dono é o único árbitro |
