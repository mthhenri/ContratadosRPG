# SYSTEM.SPEC.md — contratados-rpg

> **Leia este arquivo integralmente antes de iniciar qualquer sessão de implementação.**
> Este é o documento de constituição do projeto. Toda decisão técnica e de negócio relevante está aqui documentada.
> Em caso de dúvida sobre qualquer padrão, este arquivo tem precedência sobre qualquer outra fonte.

---

## 1. Visão Geral

**Nome:** contratados-rpg
**Tipo:** Site completo do RPG "Contratados" (SCP Foundation RPG v4)
**Descrição:** Plataforma web para a mesa do autor, com suporte a múltiplas campanhas.
Cobre a calculadora de stats (pública, sem login), sistema de campanhas com papéis
(mestre/jogador), fichas persistentes de jogador, criatura e NPC com cálculo automático
de stats, atualização em tempo real durante a sessão e guia de criação de missão.

**Origem:** sucessor da `contratados-calculadora` (SPA vanilla JS estática), que será
arquivada quando o milestone M1 (paridade da calculadora) for concluído.

### 1.1 Fontes da Verdade do Jogo

| Documento | Escopo |
|---|---|
| `docs/core/sistema-v4.1.0.md` | Regras de jogador: atributos, classes, progressão, equipamentos, patentes, descanso, compras |
| `docs/core/guia_de_mestre-v4.0.0.md` | Criação de ameaças: identidade, atributos, modificadores, saúde, defesa, resistências, porte, ações |

Consulte-os antes de alterar qualquer fórmula, tabela de progressão ou regra de domínio.
**Em conflito entre código e documento, o documento vence.**

---

## 2. Stack Técnica

### Backend
- **Runtime:** Node.js
- **Framework:** NestJS (TypeScript)
- **Banco de dados:** PostgreSQL 16 (local: Docker Compose; produção: Supabase)
- **Query layer:** Knex.js — SQL bruto obrigatório, sem ORM
- **Autenticação:** JWT via Passport.js
- **Tempo real:** Socket.IO (`@nestjs/websockets` + `@nestjs/platform-socket.io`) — broadcast-only
- **Validação:** class-validator + class-transformer
- **Encriptação:** bcrypt

### Frontend
- **Framework:** Angular 21 — standalone components obrigatório
- **UI:** PrimeNG 21
- **Estado:** Angular Signals (signal, computed, effect)
- **Formulários:** Reactive Forms
- **HTTP:** Angular HttpClient com interceptores
- **Tempo real:** cliente Socket.IO
- **Estilos:** SCSS + Tailwind CSS + BEM

### Infraestrutura
- **Local:** Docker + Docker Compose (PostgreSQL 16)
- **Produção:** frontend → Cloudflare; API → Render; banco → Supabase (Postgres)
- **CI:** GitHub Actions — lint + testes em todo PR
- **Deploy:** integração nativa das plataformas — Render (backend) e Cloudflare Pages
  (frontend) reimplantam automaticamente no push para master (sem GitHub Actions no deploy)

---

## 3. Estrutura do Repositório

```
contratados-rpg/
  shared/                       → pacote compartilhado entre backend e frontend
    src/
      dtos/
        usuario/
        campanha/
        ficha/
      enums/
      interfaces/
        standard-response.interface.ts
        paginated-result.interface.ts
      validators/               → constantes puras (fonte única)
      regras/                   → motor de regras do jogo (exceção sancionada — §6.6)
        agente/                 → vida, energia, deslocamento, dano, inventário, percepção…
        dt/
        novo-agente/
        patente/
        descanso/
        compras/
        criatura/               → (M4) criação de ameaças conforme guia de mestre
        dados/                  → tabelas do jogo tipadas (progressões, catálogo, modificações…)
    package.json
    tsconfig.json
  backend/
    src/
      modules/
        autenticacao/
        usuario/
        campanha/
        ficha/
      core/
        base/                   → base.entity.ts, base.repository.ts
        exceptions/
        filters/
        interceptors/
        gateway/                → infraestrutura WebSocket genérica (auth de handshake)
        database/
      config/
  frontend/
    src/app/
      modules/
        calculadora/            → páginas públicas: agente, dt, novo-agente, patente, descanso, compras
        campanha/
        ficha/
      core/                     → services, interceptors, guards, signals
      shared/                   → layout, componentes reutilizáveis, pipes
  docs/
    SYSTEM.SPEC.md              → este arquivo — lido no início de toda sessão
    CONVENTIONS.md              → referência rápida de convenções
    SCHEMA.md                   → schema SQL alvo + forma dos documentos JSONB
    CONTEXT.md                  → estado atual do projeto (atualizado após cada sessão)
    design/                     → fonte da verdade VISUAL (tema "Terminal de Contenção")
      DESIGN.md                 → guia do tema + mapa de tokens + como ligar
      tema/                     → _tokens/_base/_componentes.scss + contencao.preset.ts
      examples/                 → protótipos aprovados (fidelidade visual 1:1)
    core/
      sistema-v4.1.0.md         → fonte da verdade do jogo (jogador)
      guia_de_mestre-v4.0.0.md  → fonte da verdade do jogo (ameaças)
    specs/
      backlog/                  → tasks a implementar
      active/                   → task em andamento na sessão atual
      done/                     → tasks concluídas (histórico)
  package.json                  → workspaces root (npm workspaces)
  docker-compose.yml
  .gitignore
  README.md
```

---

## 4. Regras de Linguagem

### Princípio

**Teste:** "Esse conceito existiria em qualquer projeto de software?"
- **Sim** → inglês
- **Não** → português

### Tabela de Referência

| Inglês (genérico / arquitetural) | Português (negócio / projeto) |
|---|---|
| Pastas: `controllers/`, `services/`, `repositories/`, `dtos/`, `core/`, `shared/`, `regras/`… | Arquivos de entidade: `ficha.service.ts`, `campanha.repository.ts` |
| Classes genéricas: `BaseEntity`, `BaseRepository`, `StandardResponse`, `PaginatedResult` | Métodos: `criarFicha()`, `listarCampanhas()`, `regenerarConvite()` |
| Campos BaseEntity: `id`, `isDeleted`, `createdDate`, `updatedDate`, `deletedDate` | DTOs: `FichaCriarDto`, `CampanhaAlterarDto` |
| Colunas BaseEntity SQL: `is_deleted`, `created_date`, `updated_date`, `deleted_date` | Tabelas/colunas: `ficha`, `campanha`, `codigo_convite`, `senha` |
| Exceptions: `BusinessException`, `ResourceNotFoundException`, `UnauthorizedAccessException` | Valores de enum: `MESTRE`, `JOGADOR`, `COMBATENTE`, `CRIATURA` |
| Decorators: `@Public()`, `@ActiveUser()` | Módulos de negócio (pasta): `usuario/`, `campanha/`, `ficha/` |
| Padrões técnicos: `auth-token.interceptor.ts`, `global-exception.filter.ts` | Comportamento de negócio: `autenticacao.guard.ts` |
| Objetos genéricos de banco: `fn_set_updated_date()`, `trg_ficha_updated_date` | Tabelas/colunas de negócio em SQL |
| Eventos WS de infra (se genéricos) | Eventos WS de negócio: `ficha:alterada`, `membro:entrou` |

---

## 5. Convenções de Nomenclatura

Ver `CONVENTIONS.md` para a referência completa com exemplos. Resumo normativo:

- **DTOs:** `Entidade + Complemento? + Verbo + Dto`. Entrada no infinitivo
  (`FichaCriarDto`), saída no particípio (`FichaCriadaDto`), item de listagem `ResumoDto`.
  Nunca `Atualizar/Atualizado` — sempre `Alterar/Alterado`. Complemento inteiro antes do
  verbo (`FichaDadosAlterarDto`, nunca `FichaAlterarDadosDto`). Recuperação individual
  sempre `EntidadeRecuperarDto { id: number }`.
- **Herança de DTO:** negócio nunca herda negócio; negócio herda apenas core
  (`PaginatedResult<T>`, classe). Nenhum DTO é alias/re-export de outro.
- **Métodos:** `verbo + entidade`, português, sem abreviações — `criarCampanha()`,
  `validarLogin()` (nunca `existeLogin`).
- **Variáveis:** nunca abreviadas.
- **Enums:** string enum, valor igual ao nome, SCREAMING_SNAKE_CASE, sempre em `shared/src/enums/`.
- **Zero primitivos** em assinaturas de service e repository — sempre DTO, mesmo com um
  único campo. O `id` de `@Param`/`@Query` é injetado no DTO pela controller.

---

## 6. Pacote Compartilhado (`shared/`)

Workspace npm `@contratados-rpg/shared`, importado por backend e frontend.

### 6.1 O que fica no shared

- **DTOs** — todas as interfaces de entrada e saída da API
- **Enums** — de coluna (papéis, tipos de ficha) e de conteúdo de jogo (classes, patentes…)
- **Interfaces genéricas** — `StandardResponse`, `PaginatedResult`
- **Validators** — constantes puras de validação (fonte única, sem class-validator)
- **Regras de jogo** (`regras/`) — ver §6.6

### 6.2 Importação

```typescript
import { FichaCriarDto }        from '@contratados-rpg/shared/dtos/ficha';
import { ClasseEnum }           from '@contratados-rpg/shared/enums';
import { StandardResponse }     from '@contratados-rpg/shared/interfaces';
import { calcularVida }         from '@contratados-rpg/shared/regras/agente';
```

### 6.3 O que NÃO fica no shared

- Decorators NestJS, componentes Angular, configurações de framework
- Models de banco de dados (backend only)
- Lógica de negócio **de aplicação** (permissões, orquestração, persistência)

### 6.6 Exceção sancionada — motor de regras do jogo (`regras/`)

A regra "lógica de negócio não fica no shared" tem **uma** exceção neste projeto:
`shared/src/regras/` — o motor de regras do jogo (fórmulas de vida, energia, limite de
energia, defesa, deslocamento, dano, inventário, percepção, DT, novo agente, patentes,
descanso, compras/modificações/amplificadores e, no M4, criação de ameaças).

**Racional:** é fonte única exigida pelos dois lados — o frontend calcula instantaneamente
(calculadora e preview de ficha, sem latência de rede) e o backend valida
autoritativamente o que é salvo. Mesmo racional dos validators de fonte única.

**Restrições invioláveis do `regras/`:**
1. Somente **funções puras e dados tipados** — sem estado, sem I/O, sem Date.now/random
   fora de utilidades de rolagem explícitas
2. **Zero dependências** externas (nem class-validator, nem NestJS, nem Angular)
3. Toda fórmula tem **teste unitário** validado contra `docs/core/sistema-v4.1.0.md` /
   `docs/core/guia_de_mestre-v4.0.0.md`
4. Permissões e persistência **nunca** entram aqui — isso é service do backend

---

## 7. Arquitetura do Backend

### 7.1 Camadas — regras obrigatórias

**Controller — burra.** Só expõe endpoint, aplica guards/decorators e repassa. Sem if,
sem try/catch, sem lógica. Única microinteligência: montar o DTO
(`service.alterar({ ...dto, id })`, `service.recuperar({ id }, usuarioAtivo)`).

**Service — inteligente.** Toda regra de negócio: validações, **verificação de permissões
(§14)**, orquestração de repositórios, chamada ao motor de regras para validar dados de
ficha, e **emissão dos eventos WebSocket após mutação bem-sucedida**. Lança
`BusinessException`, `ResourceNotFoundException` ou `UnauthorizedAccessException`.

**Repository — só SQL.** Estende `BaseRepository`; usa `executarConsulta<T>()` /
`executarComando()` / `executarSoftDelete(id)`. Sem lógica, sem if de validação.
Nunca recebe primitivo — sempre DTO (`alterar(dto: FichaInternoAlterarDto)`).

### 7.2 BaseRepository, StandardResponse e exceções

Idênticos ao padrão de referência do autor (ver `CONVENTIONS.md`):
`BaseRepository` com Knex raw + paginação + soft delete; `StandardResponse<T>`
(`sucesso`, `dados`, `mensagem`, `erros?`) montado pelo `response-format.interceptor`;
`global-exception.filter` padroniza erros; exceções carregam o mesmo formato.

---

## 8. Arquitetura do Frontend

- **Standalone components** sempre; **Signals** para estado; **Reactive Forms** em todo
  formulário (sem `ngModel`, mesmo dentro de CVA); **lazy loading** via `loadComponent`.
- Interceptors: `auth-token` (JWT no header), `error-handler` (toast PrimeNG), `loading`.
- Estilos: `.scss` sempre, Tailwind para utilitários, BEM em português para classes
  customizadas. Sem `style=""` inline, sem seletor de ID.
- **Calculadora** (`modules/calculadora/`): páginas públicas, 100% client-side, consumindo
  `shared/regras` diretamente — funcionam sem backend.
- **Identidade visual:** **definida** — tema "Terminal de Contenção" (dark-first, IBM Plex),
  com handoff completo em `docs/design/` (tokens, base, preset PrimeNG, componentes, exemplos).
  **Leia `docs/design/DESIGN.md` antes de qualquer trabalho de UI**; estilos de componente
  consomem os tokens de `docs/design/tema/_tokens.scss` (nunca hex solto). A spec de M1 cobre
  a troca de tema em **runtime** (presets + color picker com trava de contraste), não a
  definição da identidade — essa já está feita.

---

## 9. Tempo Real (WebSocket)

- **Broadcast-only.** Toda mutação entra por REST (guards + validação + motor de regras).
  O gateway **nunca** recebe escrita no v1. A service emite eventos após salvar.
- **Handshake autenticado:** JWT validado na conexão com o mesmo mecanismo do Passport.
- **Salas:**
  - `ficha:<id>` — entrar exige a mesma permissão de visualização do REST (§14).
    Evento: `ficha:alterada`.
  - `campanha:<id>` — só membros. Eventos: `ficha:criada`, `membro:entrou`.
- **Permissões:** a service de ficha/campanha é o único árbitro — o gateway consulta a
  mesma verificação usada pelo REST. Proibido duplicar regra de permissão no gateway.
- **Resiliência:** cliente ressincroniza (refetch da ficha aberta) ao reconectar —
  necessário porque o Render free tier dorme e derruba conexões.

---

## 10. Banco de Dados

### 10.1 BaseEntity — obrigatória em toda tabela

```sql
id            SERIAL      PRIMARY KEY,
created_date  TIMESTAMPTZ NOT NULL,
updated_date  TIMESTAMPTZ NOT NULL,
is_deleted    BOOLEAN     NOT NULL,
deleted_date  TIMESTAMPTZ
```

Sem DEFAULT — todos os valores fornecidos explicitamente no INSERT.

### 10.2 Regras SQL — todas obrigatórias

1. Todo SELECT inclui `WHERE [tabela].is_deleted = false`
2. Tabelas em snake_case português singular: `usuario`, `campanha`, `ficha`
3. Colunas de negócio em snake_case português; BaseEntity em inglês
4. Campos de data: `[contexto]_date` (inglês) ou `[contexto]_data` (português) —
   nunca `_at`, `_em`, `data_[contexto]`. Instante → `timestamptz`; calendário puro → `date`
5. Sem DEFAULT em nenhuma coluna
6. Sem aliases abreviados
7. Parâmetros nomeados `:nome` com objeto — nunca `?`, nunca interpolação
8. INSERT sempre `INSERT INTO ... (...) SELECT :campo ... RETURNING ...` — nunca `VALUES`
9. Soft delete via `executarSoftDelete()` — nunca DELETE físico
10. Objetos genéricos de banco (functions/triggers de infra) em inglês
    (`fn_set_updated_date`); negócio em português
11. Constraints/índices/triggers sempre nomeados explicitamente com prefixo:
    `pk_`, `fk_`, `uix_`, `ix_`, `chk_`, `trg_`, `fn_`
12. **Enums de coluna** são tabelas de referência `tipo_<tabela>_<complemento?>`
    (`codigo` + `descricao`), coluna INTEGER FK — nunca `VARCHAR + CHECK` nem ENUM nativo.
    O repositório traduz `codigo ↔ id` no SQL; DTOs/services/frontend só veem o `codigo`.

### 10.3 Exceção de escopo — enums de conteúdo de jogo

A regra 10.2.12 vale para **colunas**. Enums que vivem **dentro do JSONB `ficha.dados`**
(`ClasseEnum`, `PatenteEnum`, categorias de item, portes, etc.) existem apenas como enums
TS no `shared/`, validados via `@IsEnum` na camada de DTO — **sem** tabela `tipo_*`.
Racional: não são colunas, são conteúdo de documento; a fonte da verdade deles é o
documento do sistema do jogo, não o banco.

### 10.4 JSONB — princípio do modelo de fichas

**Relacional para identidade, posse e permissão; JSONB para conteúdo de jogo.**
Campos de jogo (classe, nível, atributos…) **não** viram colunas — listagens usam
`dados->>'campo'`. A forma dos documentos é contrato tipado no shared
(`FichaJogadorDadosDto`, `FichaCriaturaDadosDto`) e está documentada no `SCHEMA.md`.

### 10.5 Paginação padrão

Query params: `pagina`, `itensPorPagina`, `ordenarPor`, `direcao`; DTOs de filtro de
listagem paginada expõem `allRows?: boolean` (inglês — conceito genérico) que omite
LIMIT/OFFSET mantendo a estrutura `PaginatedResult<T>`.

### 10.6 Configuração de ambiente (.env)

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NOME=contratados_rpg
DB_USUARIO=postgres
DB_SENHA=postgres

# JWT
JWT_SECRETO=troque-em-producao
JWT_EXPIRACAO=8h

# Aplicação
APP_PORTA=3100
APP_AMBIENTE=development
APP_FRONTEND_ORIGEM=http://localhost:4300   # CORS + origem permitida do Socket.IO
```

Backend lê tudo via `ConfigService` injetado — nunca `process.env` direto.

### 10.7 Migrations

Cada migration é um **arquivo `.sql` puro** em `backend/src/database/migrations/`, nomeado
`NNNN - Nome descritivo.sql` — prefixo inteiro sequencial de 4 dígitos (ordem de execução) +
`" - "` + frase legível em português com inicial maiúscula. O Knex continua orquestrando
`db:migrate`/`db:rollback` via um `Knex.MigrationSource` customizado (`sql-migration-source.ts`),
registrado em `knexfile.ts` (CLI) e `database.provider.ts` (runtime). A tabela de controle
continua sendo a `knex_migrations` interna do Knex.

O arquivo tem duas seções, cada marcador sozinho na linha: `-- UP` (obrigatória) e `-- DOWN`
(obrigatória, salvo justificativa em comentário no arquivo).

```sql
-- UP

CREATE TABLE exemplo_tabela (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  nome          VARCHAR(255) NOT NULL
);

CREATE TRIGGER trg_exemplo_tabela_updated_date
  BEFORE UPDATE ON exemplo_tabela
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_exemplo_tabela_updated_date ON exemplo_tabela;
DROP TABLE IF EXISTS exemplo_tabela CASCADE;
```

**Transação automática via Knex — nunca escrita no `.sql`.** O Knex abre uma transação por
migration antes de invocar `up`/`down`; se qualquer instrução do bloco falhar, ele emite `ROLLBACK`
sozinho (tudo ou nada). Por isso o arquivo **nunca** contém `BEGIN`/`COMMIT`/`ROLLBACK` — um
`COMMIT` manual encerraria a transação que o Knex acredita estar aberta e quebraria a garantia.
Única exceção: instruções proibidas dentro de transação (ex.: `CREATE INDEX CONCURRENTLY`) sinalizam
com `-- NO TRANSACTION` logo após o marcador, e o `SqlMigrationSource` desabilita a transação só
naquela migration.

**Exceção de valores literais (só dentro de `migrations/`).** Como migration não recebe input de
usuário, os valores (nomes de tag, feriados, códigos de enum) são **literais SQL** escritos direto
no arquivo (`'Backend'`, `'#3b82f6'`, escapando `'` como `''`) — a única exceção à regra de
parâmetros nomeados (§10.2.7, Proibição #5). O runtime (repositórios) continua 100% `:nomeParametro`.
Todas as demais regras SQL (§10.2 / §16) valem sem afrouxamento.

---

## 11. Validações

**Camada 1 — estrutural (class-validator no DTO):** `ValidationPipe` global com
`whitelist`, `forbidNonWhitelisted`, `transform`. Os DTOs de `dados` de ficha validam a
forma do documento (`@IsEnum`, `@IsInt`, ranges).

**Camada 2 — negócio (service):** regras que exigem banco ou domínio:
- Login duplicado → `BusinessException('Login já está em uso')`
- Sem permissão na ficha/campanha → `UnauthorizedAccessException()`
- Dados de ficha incoerentes com o motor de regras (ex.: HP atual acima do máximo
  calculado para classe/nível/atributos; atributo acima do limite da classe/nível;
  stacks de modificação acima do permitido pela patente) → `BusinessException`

**Formato de erro padronizado:** `{ sucesso: false, dados: null, mensagem, erros[] }`.

---

## 12. Autenticação e Autorização

- **JWT** com Passport.js — token gerado no login, válido por `JWT_EXPIRACAO`
- **Guard global** `JwtAuthGuard` via `APP_GUARD`
- **`@Public()`** — rotas sem autenticação: login, registro e healthcheck.
  As páginas da calculadora são client-side e não têm rota de API.
- **`@ActiveUser()`** — injeta o payload do JWT no parâmetro do método
- Senhas com bcrypt. Sem fluxo de recuperação por e-mail no v1 — reset manual.

---

## 13. Módulos do Sistema

| Módulo (backend) | Responsabilidade |
|---|---|
| `autenticacao` | Registro, login e geração de JWT |
| `usuario` | Perfil e troca de senha |
| `campanha` | CRUD de campanhas, convite por código, membros e papéis |
| `ficha` | CRUD de fichas (jogador/criatura/NPC), JSONB `dados`, concessões de visualização, validação via motor de regras, emissão de eventos WS |

| Módulo (frontend) | Responsabilidade |
|---|---|
| `calculadora` | 6 páginas públicas client-side: agente, dt, novo-agente, patente, descanso, compras |
| `campanha` | Gestão de campanhas, convites, membros |
| `ficha` | Fichas de jogador/criatura/NPC com cálculo automático via `shared/regras` |

---

## 14. Entidades e Regras de Negócio

> Todas as tabelas incluem BaseEntity. Schema SQL completo e comentado em `SCHEMA.md`.

```
usuario                     login UNIQUE, senha (hash bcrypt), nome

campanha                    nome, descricao, codigo_convite UNIQUE
campanha_membro             campanha_id FK, usuario_id FK, tipo_campanha_membro_papel_id FK
tipo_campanha_membro_papel  codigo: MESTRE | JOGADOR

ficha                       campanha_id FK, usuario_id FK (dono), tipo_ficha_id FK,
                            nome, dados JSONB
tipo_ficha                  codigo: JOGADOR | CRIATURA | NPC

usuario_ficha_acesso        ficha_id FK, usuario_id FK
                            └─ concessão de VISUALIZAÇÃO a outro membro da campanha
```

### Matriz de permissões (validada na service; vale para REST e WebSocket)

| Ação | Dono da ficha | Mestre da campanha | Outro membro |
|---|---|---|---|
| Ver ficha | ✅ | ✅ | só com linha em `usuario_ficha_acesso` |
| Editar ficha | ✅ | ✅ | ❌ |
| Criar ficha de jogador | ✅ (a própria) | ✅ | — |
| Criar criatura/NPC | ❌ | ✅ | — |
| Gerenciar campanha (convite, membros) | — | ✅ | ❌ |

### Regras fundamentais

- Criatura e NPC usam o **mesmo mecanismo** de ficha: dono = mestre; invisíveis aos
  jogadores por padrão; reveláveis via `usuario_ficha_acesso`. Sem caso especial.
- Jogador entra na campanha informando `codigo_convite`; entra com papel `JOGADOR`.
  O mestre pode regenerar o código a qualquer momento (invalida o anterior).
- Uma campanha tem exatamente **um** mestre no v1 — inicialmente o criador, mas o papel é
  **transferível** pelo mestre atual a outro membro (o alvo vira `MESTRE` e o mestre atual é
  rebaixado a `JOGADOR`, **atomicamente**; a invariante de exatamente um mestre se mantém).
  O mestre também **remove** jogadores da campanha, mas não pode remover a si mesmo (deixaria
  a campanha sem mestre — transfere o papel ou exclui a campanha).
- Toda mutação de ficha é validada contra o motor de regras antes de persistir.
- Soft delete em tudo; nunca DELETE físico.

---

## 15. Milestones

| # | Milestone | Conteúdo | Status |
|---|---|---|---|
| M0 | Fundação | Workspaces, docs, Docker, core/, pipelines, health e2e | backlog |
| M1 | Calculadora | Paridade funcional com o site antigo; regras extraídas p/ `shared/regras` | backlog |
| M2 | Auth + Campanhas | Contas, login JWT, campanhas, convite, papéis | backlog |
| M3 | Ficha de Jogador | CRUD + cálculo automático + permissões + tempo real | backlog |
| M4 | Ficha de Criatura/NPC | Ferramenta do mestre conforme guia de criação de ameaças | backlog |
| M5 | Guia de Missão | Assistente de criação de missão | backlog |

Specs em `docs/specs/backlog/`. Milestones são quebrados em tasks numeradas antes da
implementação. M2+ recebem design detalhado quando chegar a vez.

### Fora de escopo / decisões adiadas

- **Troca de tema em runtime** — presets + color picker com trava de contraste são M1; a
  identidade visual em si já está **definida** em `docs/design/` (tema "Terminal de Contenção")
- **Escrita via WebSocket** — v1 é broadcast-only
- **Histórico/versão de ficha** — soft delete + `updated_date` bastam no v1
- **Recuperação de senha por e-mail** — reset manual; sem infra de e-mail
- **Multi-tenant público** — o design isola por campanha, mas onboarding público não é objetivo
- **Rolagem de dados / iniciativa / combate assistido** — candidatos a M6+

---

## 16. Proibições Absolutas

Inegociáveis independente do contexto:

| # | Proibição |
|---|---|
| 1 | **Nunca abreviar** nomes de variáveis, métodos, parâmetros, classes ou arquivos |
| 2 | **Nunca colocar lógica de negócio** na controller — apenas repasse para service |
| 3 | **Nunca usar ORM** — apenas SQL bruto via `knex.raw()` |
| 4 | **Nunca omitir** `is_deleted = false` em qualquer SELECT |
| 5 | **Nunca usar `?` posicional** em SQL — sempre parâmetros nomeados `:nome` |
| 6 | **Nunca usar `VALUES`** em INSERT — sempre `INSERT INTO ... SELECT :campo RETURNING` |
| 7 | **Nunca usar DEFAULT** em colunas SQL |
| 8 | **Nunca abreviar aliases** em SQL |
| 9 | **Nunca nomear campo de data fora do padrão** `[contexto]_date` / `[contexto]_data` |
| 10 | **Nunca usar** `process.env` diretamente — sempre `ConfigService` |
| 11 | **Nunca escrever** conceito de negócio em inglês |
| 12 | **Nunca escrever** conceito genérico/arquitetural em português |
| 13 | **Nunca extrapolar** o escopo da task sendo implementada |
| 14 | **Nunca fazer** DELETE físico — sempre soft delete via `executarSoftDelete()` |
| 15 | **Nunca escrever** código sem JSDoc nos métodos públicos de service e repository |
| 16 | **Nunca criar** componente Angular com NgModule — sempre standalone |
| 17 | **Nunca usar** `.css` — todo arquivo de estilo é `.scss` |
| 18 | **Nunca usar** `style=""` inline nem seletor de ID em SCSS |
| 19 | **Nunca passar primitivos** em service/repository — sempre DTO; o id de `@Param`/`@Query` entra no DTO pela controller |
| 20 | **Nunca nomear métodos `existe*`** — usar `validar*` |
| 21 | **Nunca criar DTO** como alias/re-export/subclasse de DTO de negócio — herança só de core (`PaginatedResult`) |
| 22 | **Nunca usar `atualizar`** — sempre `alterar` |
| 23 | **Nunca colocar em repositório A** query de responsabilidade do módulo B |
| 24 | **Nunca representar enum de coluna** como `VARCHAR + CHECK` ou ENUM nativo — tabela `tipo_*` (exceção: enums de conteúdo de jogo dentro do JSONB — §10.3) |
| 25 | **Nunca aceitar mutação via WebSocket** — escrita entra só por REST; gateway é broadcast-only |
| 26 | **Nunca colocar I/O, estado ou dependências** em `shared/src/regras/` — só funções puras e dados tipados |
| 27 | **Nunca alterar fórmula de jogo** sem consultar `docs/core/sistema-v4.1.0.md` / `docs/core/guia_de_mestre-v4.0.0.md` e atualizar os testes — o documento vence o código |
| 28 | **Nunca duplicar regra de permissão** — a service do módulo dono é o único árbitro; REST e WS consomem a mesma verificação |
| 29 | **Nunca hardcodar** cor, fonte ou raio em SCSS/template — todo estilo consome os tokens do tema em `docs/design/tema/` (`var(--surface)`, `var(--accent)`, `var(--font-mono)`…); leia `docs/design/DESIGN.md` antes de qualquer UI |
