# Cadernos de campanha e busca unificada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar cadernos privados por campanha, com páginas Markdown, leitura dos cadernos dos jogadores pelo mestre e busca textual unificada com as anotações das fichas.

**Architecture:** os contratos permanecem no `shared`; o novo módulo NestJS `pagina-caderno` concentra CRUD, permissões e busca, usando PostgreSQL Full Text Search com configuração portuguesa sem acentos. No Angular, um utilitário flutuante não modal reutiliza a geometria e a linguagem visual de Calculadora/Documentos, mantém rascunhos com Signals e usa um cliente HTTP próprio; Markdown é compilado com `marked`, sem HTML/imagens, e passa ainda pelo sanitizador do Angular.

**Tech Stack:** PostgreSQL 16/Supabase, Knex SQL bruto, NestJS 11, Angular 21 standalone + Signals + Reactive Forms, Vitest, SCSS/BEM, `marked`.

**Spec:** `docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md`

## Global Constraints

- Cada página pertence exatamente a uma campanha e a um autor ativo; exclusão é sempre lógica.
- Jogador nunca recebe conteúdo ou metadado de outro jogador; mestre lê, mas nunca altera/exclui, página alheia.
- Limites desta entrega: título aparado entre 1 e 120 caracteres; Markdown entre 0 e 100.000 caracteres; termo de busca entre 1 e 200 caracteres; paginação padrão 20 e limite máximo 50.
- HTML e imagens Markdown não são renderizados; somente `http:`, `https:` e `mailto:` são aceitos em links, sempre com `target="_blank" rel="noopener noreferrer"`.
- Controllers permanecem finos; permissões e validações ficam na service; repositories contêm somente SQL parametrizado e filtram `is_deleted = false`.
- Nenhum conteúdo de caderno usa WebSocket nesta versão.
- O análogo visual obrigatório é a combinação de `frontend/src/app/shared/calculadora-flutuante/` e `frontend/src/app/shared/leitor-documentos/`.
- A conclusão visual exige aplicação real em `1920×1080` e `360×800` com a skill `verify`.
- Todo commit inclui `Co-authored-by: Codex <noreply@openai.com>` e é conferido com `git show -s --format=full`.

---

## Mapa de arquivos e responsabilidades

- `shared/src/dtos/pagina-caderno/`: contratos públicos e internos do CRUD e da busca.
- `shared/src/enums/busca-campanha-*.enum.ts`: discriminantes compartilhados das fontes e resultados.
- `backend/src/database/migrations/0018 - Caderno de campanha e busca textual.sql`: tabela, configuração textual, triggers e índices GIN.
- `backend/src/modules/pagina-caderno/`: controller, service, repository e testes do novo módulo.
- `backend/src/core/exceptions/resource-conflict.exception.ts`: resposta genérica HTTP 409 para concorrência otimista.
- `frontend/src/app/modules/pagina-caderno/pagina-caderno.service.ts`: transporte HTTP sem regra de permissão.
- `frontend/src/app/modules/pagina-caderno/markdown-seguro.ts`: compilação e sanitização testável de Markdown.
- `frontend/src/app/modules/pagina-caderno/caderno-flutuante.*`: estado, geometria, autosave e casca visual do caderno.
- `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.*`: ponto de montagem do utilitário e navegação para ficha.
- `frontend/src/app/shared/utilitario-flutuante/`: reserva da nova posição na pilha e teste do contrato CSS.
- `docs/SCHEMA.md` e `docs/context/`: documentação persistente após a entrega.

---

### Task 1: Contratos compartilhados e limites

**Files:**
- Create: `shared/src/dtos/pagina-caderno/pagina-caderno.dtos.ts`
- Create: `shared/src/dtos/pagina-caderno/pagina-caderno-interno.dtos.ts`
- Create: `shared/src/dtos/pagina-caderno/index.ts`
- Create: `shared/src/enums/busca-campanha-fonte.enum.ts`
- Create: `shared/src/enums/busca-campanha-resultado-tipo.enum.ts`
- Create: `shared/src/validators/pagina-caderno.validators.ts`
- Create: `shared/src/dtos/pagina-caderno/pagina-caderno.spec.ts`
- Modify: `shared/src/enums/index.ts`
- Modify: `shared/src/validators/index.ts`
- Modify: `shared/package.json`

**Interfaces:**
- Produces: os DTOs públicos exatos da spec e DTOs internos `PaginaCadernoInternoCriarDto`, `PaginaCadernoInternoListarDto`, `PaginaCadernoMembroInternoListarDto`, `PaginaCadernoInternoAlterarDto`, `PaginaCadernoInternoRecuperadaDto`, `BuscaCampanhaInternoDto`.
- Produces: `PAGINA_CADERNO_TITULO_MAXIMO = 120`, `PAGINA_CADERNO_CONTEUDO_MAXIMO = 100_000`, `BUSCA_CAMPANHA_TERMO_MAXIMO = 200`, `BUSCA_CAMPANHA_LIMITE_MAXIMO = 50`.

- [ ] **Step 1: Escrever o teste de exportação e dos valores fechados**

```ts
import { describe, expect, it } from 'vitest';
import { BuscaCampanhaFonteEnum, BuscaCampanhaResultadoTipoEnum } from '../../enums';
import {
  BUSCA_CAMPANHA_LIMITE_MAXIMO,
  BUSCA_CAMPANHA_TERMO_MAXIMO,
  PAGINA_CADERNO_CONTEUDO_MAXIMO,
  PAGINA_CADERNO_TITULO_MAXIMO,
} from '../../validators';

describe('contratos de página de caderno', () => {
  it('mantém enums string e limites públicos estáveis', () => {
    expect(Object.values(BuscaCampanhaFonteEnum)).toEqual([
      'MEU_CADERNO', 'CADERNOS_JOGADORES', 'MINHAS_FICHAS', 'FICHAS_CAMPANHA',
    ]);
    expect(Object.values(BuscaCampanhaResultadoTipoEnum)).toEqual([
      'PAGINA_CADERNO', 'ANOTACAO_FICHA',
    ]);
    expect({
      titulo: PAGINA_CADERNO_TITULO_MAXIMO,
      conteudo: PAGINA_CADERNO_CONTEUDO_MAXIMO,
      termo: BUSCA_CAMPANHA_TERMO_MAXIMO,
      limite: BUSCA_CAMPANHA_LIMITE_MAXIMO,
    }).toEqual({ titulo: 120, conteudo: 100_000, termo: 200, limite: 50 });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar falha por módulos ausentes**

```powershell
npm run test --workspace=shared -- pagina-caderno.spec.ts
```

Expected: FAIL porque enums, validators e DTOs ainda não existem.

- [ ] **Step 3: Criar os enums, validators e DTOs públicos da spec**

```ts
export enum BuscaCampanhaFonteEnum {
  MEU_CADERNO = 'MEU_CADERNO',
  CADERNOS_JOGADORES = 'CADERNOS_JOGADORES',
  MINHAS_FICHAS = 'MINHAS_FICHAS',
  FICHAS_CAMPANHA = 'FICHAS_CAMPANHA',
}

export interface PaginaCadernoAlterarDto {
  readonly id: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly updatedDate: string;
}

export interface BuscaCampanhaDto {
  readonly campanhaId: number;
  readonly termo: string;
  readonly fontes?: readonly BuscaCampanhaFonteEnum[];
  readonly pagina?: number;
  readonly limite?: number;
}
```

Os demais DTOs públicos são copiados literalmente da seção 3 da spec. Os internos declaram todos os campos, sem herança:

```ts
export interface BuscaCampanhaInternoDto {
  readonly campanhaId: number;
  readonly usuarioAtivoId: number;
  readonly termo: string;
  readonly fontes: readonly BuscaCampanhaFonteEnum[];
  readonly pagina: number;
  readonly limite: number;
}

export interface PaginaCadernoInternoRecuperadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioAutorId: number;
  readonly autorNome: string;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly createdDate: string;
  readonly updatedDate: string;
}
```

- [ ] **Step 4: Exportar o subpath e validar tipos/testes**

```json
"./dtos/pagina-caderno": {
  "types": "./dist/dtos/pagina-caderno/index.d.ts",
  "default": "./dist/dtos/pagina-caderno/index.js"
}
```

```powershell
npm run test --workspace=shared -- pagina-caderno.spec.ts
npm run typecheck --workspace=shared
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add shared
git commit -m "feat(shared): define contratos do caderno" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
```

---

### Task 2: Estrutura SQL e índices de busca

**Files:**
- Create: `backend/src/database/migrations/0018 - Caderno de campanha e busca textual.sql`
- Modify: `docs/SCHEMA.md`

**Interfaces:**
- Consumes: limites e nomes de campo da Task 1.
- Produces: tabela `pagina_caderno`, configuração `contratados_portugues`, função `fn_pagina_caderno_busca`, trigger `trg_pagina_caderno_busca`, índice `ix_pagina_caderno_busca` e índice parcial `ix_ficha_anotacoes_busca`.

- [ ] **Step 1: Escrever a migration reversível**

```sql
-- UP
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE TEXT SEARCH CONFIGURATION contratados_portugues (COPY = pg_catalog.portuguese);
ALTER TEXT SEARCH CONFIGURATION contratados_portugues
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;
ALTER TEXT SEARCH CONFIGURATION contratados_portugues
  ALTER MAPPING FOR hword_asciipart, asciihword, asciiword WITH portuguese_stem;

CREATE TABLE pagina_caderno (
  id SERIAL,
  campanha_id INTEGER NOT NULL,
  usuario_autor_id INTEGER NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  conteudo_markdown TEXT NOT NULL,
  busca TSVECTOR NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  CONSTRAINT pk_pagina_caderno PRIMARY KEY (id),
  CONSTRAINT fk_pagina_caderno_campanha FOREIGN KEY (campanha_id) REFERENCES campanha(id),
  CONSTRAINT fk_pagina_caderno_usuario_autor FOREIGN KEY (usuario_autor_id) REFERENCES usuario(id),
  CONSTRAINT chk_pagina_caderno_titulo CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 120),
  CONSTRAINT chk_pagina_caderno_conteudo CHECK (char_length(conteudo_markdown) <= 100000)
);

CREATE FUNCTION fn_pagina_caderno_busca() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.busca :=
    setweight(to_tsvector('contratados_portugues', COALESCE(NEW.titulo, '')), 'A') ||
    setweight(to_tsvector('contratados_portugues', COALESCE(NEW.conteudo_markdown, '')), 'B');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pagina_caderno_busca
BEFORE INSERT OR UPDATE OF titulo, conteudo_markdown ON pagina_caderno
FOR EACH ROW EXECUTE FUNCTION fn_pagina_caderno_busca();

CREATE INDEX ix_pagina_caderno_campanha_autor
  ON pagina_caderno (campanha_id, usuario_autor_id);
CREATE INDEX ix_pagina_caderno_busca ON pagina_caderno USING GIN (busca);
CREATE INDEX ix_ficha_anotacoes_busca ON ficha USING GIN (
  (setweight(to_tsvector('contratados_portugues', COALESCE(nome, '')), 'A') ||
   setweight(to_tsvector('contratados_portugues', COALESCE(dados->>'anotacoes', '')), 'B'))
) WHERE is_deleted = false AND NULLIF(btrim(dados->>'anotacoes'), '') IS NOT NULL;
```

O `-- DOWN` remove índices, trigger, função, tabela e configuração nesta ordem; mantém a extensão `unaccent`, pois pode ser compartilhada por outros recursos do banco.

- [ ] **Step 2: Aplicar e reverter em banco local limpo**

```powershell
npm run db:up
npm run db:migrate --workspace=backend
npm run db:rollback --workspace=backend
npm run db:migrate --workspace=backend
```

Expected: as quatro operações terminam sem erro e a migration 0018 volta a ficar aplicada.

- [ ] **Step 3: Provar acentos, pesos e triggers com SQL de fumaça**

```sql
INSERT INTO pagina_caderno
  (campanha_id, usuario_autor_id, titulo, conteudo_markdown, busca, created_date, updated_date, is_deleted)
SELECT :campanhaId, :usuarioId, 'Dragão no laboratório', 'pegadas na contenção', ''::tsvector,
       NOW(), NOW(), false
RETURNING busca;

SELECT busca @@ websearch_to_tsquery('contratados_portugues', 'dragao') AS encontrou_sem_acento
FROM pagina_caderno WHERE titulo = 'Dragão no laboratório' AND is_deleted = false;
```

Expected: `encontrou_sem_acento = true`; remover a linha de fumaça via soft delete após a prova.

- [ ] **Step 4: Documentar a tabela e os índices em `docs/SCHEMA.md`**

```markdown
### `pagina_caderno`

Uma linha por página; o caderno é o agrupamento lógico por `(campanha_id, usuario_autor_id)`.
`busca` é mantido por trigger e pondera `titulo` como A e `conteudo_markdown` como B.
```

- [ ] **Step 5: Commit**

```powershell
git add backend/src/database/migrations docs/SCHEMA.md
git commit -m "feat(db): cria cadernos e índices textuais" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
```

---

### Task 3: Persistência CRUD de páginas

**Files:**
- Create: `backend/src/modules/pagina-caderno/pagina-caderno.repository.ts`
- Create: `backend/src/modules/pagina-caderno/pagina-caderno.repository.spec.ts`

**Interfaces:**
- Consumes: DTOs internos da Task 1 e tabela da Task 2.
- Produces: `criarPagina`, `listarPaginas`, `recuperarPagina`, `alterarPagina`, `excluirPagina`; `alterarPagina` retorna `PaginaCadernoInternoRecuperadaDto | null` quando a versão não casa. A service, e somente ela, acrescenta `somenteLeitura` ao contrato público.

- [ ] **Step 1: Escrever testes que capturem SQL e parâmetros**

```ts
it('altera apenas a versão ativa esperada', async () => {
  conexao.raw.mockResolvedValue({ rows: [pagina], rowCount: 1 });
  await repositorio.alterarPagina({
    id: 9,
    titulo: 'Relatório',
    conteudoMarkdown: 'Texto',
    updatedDate: '2026-08-14T12:00:00.000Z',
  });
  expect(conexao.raw).toHaveBeenCalledWith(
    expect.stringContaining('updated_date = :updatedDate::timestamptz'),
    expect.objectContaining({ id: 9, titulo: 'Relatório' }),
  );
  expect(conexao.raw.mock.calls[0][0]).toContain('pagina_caderno.is_deleted = false');
});
```

Adicionar casos para `INSERT ... SELECT`, joins de autor/membro ativo, listagem por campanha+autor e soft delete.

- [ ] **Step 2: Rodar e confirmar falha por repository ausente**

```powershell
npm run test --workspace=backend -- pagina-caderno.repository.spec.ts
```

Expected: FAIL na importação.

- [ ] **Step 3: Implementar o repository com colunas comuns e filtros ativos**

```ts
private colunasPagina(): string {
  return `pagina_caderno.id, pagina_caderno.campanha_id AS "campanhaId",
          pagina_caderno.usuario_autor_id AS "usuarioAutorId", usuario.nome AS "autorNome",
          pagina_caderno.titulo, pagina_caderno.conteudo_markdown AS "conteudoMarkdown",
          pagina_caderno.created_date AS "createdDate",
          pagina_caderno.updated_date AS "updatedDate"`;
}

async alterarPagina(dto: PaginaCadernoInternoAlterarDto): Promise<PaginaCadernoInternoRecuperadaDto | null> {
  const [pagina] = await this.executarConsulta<{ id: number }>(
    `UPDATE pagina_caderno
     SET titulo = :titulo, conteudo_markdown = :conteudoMarkdown, updated_date = NOW()
     WHERE id = :id AND updated_date = :updatedDate::timestamptz AND is_deleted = false
     RETURNING id`, dto,
  );
  return pagina ? this.recuperarPagina({ id: pagina.id }) : null;
}
```

Toda leitura junta `campanha_membro` do autor com `is_deleted = false`, fazendo páginas de ex-membros desaparecerem sem apagá-las.

- [ ] **Step 4: Rodar testes e lint focados**

```powershell
npm run test --workspace=backend -- pagina-caderno.repository.spec.ts
npm run lint --workspace=backend
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/pagina-caderno
git commit -m "feat(backend): persiste páginas de caderno" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
```

---

### Task 4: Permissões, concorrência e endpoints CRUD

**Files:**
- Create: `backend/src/core/exceptions/resource-conflict.exception.ts`
- Modify: `backend/src/core/exceptions/index.ts`
- Create: `backend/src/modules/pagina-caderno/pagina-caderno.service.ts`
- Create: `backend/src/modules/pagina-caderno/pagina-caderno.service.spec.ts`
- Create: `backend/src/modules/pagina-caderno/pagina-caderno.controller.ts`
- Create: `backend/src/modules/pagina-caderno/pagina-caderno.controller.spec.ts`
- Create: `backend/src/modules/pagina-caderno/pagina-caderno.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `CampanhaRepository.recuperarMembro`, repository da Task 3 e `JwtPayload`.
- Produces: todos os endpoints CRUD da seção 4 da spec e HTTP 409 via `ResourceConflictException`.

- [ ] **Step 1: Escrever a matriz de permissão na service spec**

```ts
it.each([
  ['jogador alheio', TipoCampanhaMembroPapelEnum.JOGADOR, 22, 403],
  ['mestre leitor', TipoCampanhaMembroPapelEnum.MESTRE, 11, 403],
])('impede alteração por %s', async (_nome, papel, usuarioAtivoId, status) => {
  campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel });
  paginaRepositorio.recuperarPagina.mockResolvedValue({ ...pagina, usuarioAutorId: 33 });
  await expect(
    service.alterarPagina(dtoAlterar, { sub: usuarioAtivoId } as JwtPayload),
  ).rejects.toMatchObject({ status });
  expect(paginaRepositorio.alterarPagina).not.toHaveBeenCalled();
});
```

Cobrir também autor cria/lista/abre/altera/exclui; mestre lista/abre página alheia como `somenteLeitura`; não membro; alvo que não é jogador ativo; título vazio; limites; página inexistente; conflito.

- [ ] **Step 2: Rodar e confirmar falha**

```powershell
npm run test --workspace=backend -- pagina-caderno.service.spec.ts
```

Expected: FAIL porque service/exceção ainda não existem.

- [ ] **Step 3: Implementar validação e 409 sem conceder escrita ao mestre**

```ts
private validarAutoria(pagina: PaginaCadernoDto, usuarioAtivoId: number): void {
  if (pagina.usuarioAutorId !== usuarioAtivoId) throw new UnauthorizedAccessException();
}

const alterada = await this.paginaCadernoRepositorio.alterarPagina({
  id: dto.id,
  titulo: dto.titulo.trim(),
  conteudoMarkdown: dto.conteudoMarkdown,
  updatedDate: dto.updatedDate,
});
if (!alterada) {
  throw new ResourceConflictException('A página foi alterada em outra sessão');
}
return { ...alterada, somenteLeitura: false };
```

- [ ] **Step 4: Criar controller fino e registrar módulo**

```ts
@Controller()
export class PaginaCadernoController {
  @Get('campanha/:campanhaId/caderno/paginas')
  listarProprias(@Param('campanhaId', ParseIntPipe) campanhaId: number, @ActiveUser() usuario: JwtPayload) {
    return this.service.listarPaginas({ campanhaId }, usuario);
  }

  @Put('pagina-caderno/:id')
  alterar(@Param('id', ParseIntPipe) id: number, @Body() dto: PaginaCadernoAlterarDto, @ActiveUser() usuario: JwtPayload) {
    return this.service.alterarPagina({ ...dto, id }, usuario);
  }
}
```

Adicionar as outras cinco rotas literalmente como definidas na spec; controller não contém `if` nem `try/catch`.

- [ ] **Step 5: Rodar suite focada e build do backend**

```powershell
npm run test --workspace=backend -- pagina-caderno
npm run build --workspace=backend
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/core/exceptions backend/src/modules/pagina-caderno backend/src/app.module.ts
git commit -m "feat(backend): expõe cadernos com permissões" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
```

---

### Task 5: Busca unificada autorizada

**Files:**
- Modify: `backend/src/modules/pagina-caderno/pagina-caderno.repository.ts`
- Modify: `backend/src/modules/pagina-caderno/pagina-caderno.repository.spec.ts`
- Modify: `backend/src/modules/pagina-caderno/pagina-caderno.service.ts`
- Modify: `backend/src/modules/pagina-caderno/pagina-caderno.service.spec.ts`
- Modify: `backend/src/modules/pagina-caderno/pagina-caderno.controller.ts`
- Modify: `backend/src/modules/pagina-caderno/pagina-caderno.controller.spec.ts`
- Create: `backend/tools/database/explain-busca-campanha.sql`

**Interfaces:**
- Produces: `buscarCampanha(dto: BuscaCampanhaInternoDto): Promise<PaginatedResult<BuscaCampanhaResultadoDto>>`.
- Produces: `GET /campanha/:campanhaId/busca?termo=...&fontes=MEU_CADERNO,MINHAS_FICHAS&pagina=1&limite=20`.

- [ ] **Step 1: Escrever testes de fontes padrão/proibidas e não vazamento**

```ts
it('usa todas e somente as fontes permitidas do jogador quando fontes são omitidas', async () => {
  campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });
  await service.buscarCampanha({ campanhaId: 7, termo: 'contenção' }, usuarioJogador);
  expect(paginaRepositorio.buscarCampanha).toHaveBeenCalledWith(expect.objectContaining({
    fontes: [BuscaCampanhaFonteEnum.MEU_CADERNO, BuscaCampanhaFonteEnum.MINHAS_FICHAS],
  }));
});

it('recusa fonte do mestre antes de consultar o repository', async () => {
  await expect(service.buscarCampanha({ campanhaId: 7, termo: 'x', fontes: [BuscaCampanhaFonteEnum.CADERNOS_JOGADORES] }, usuarioJogador))
    .rejects.toBeInstanceOf(UnauthorizedAccessException);
  expect(paginaRepositorio.buscarCampanha).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Implementar seleção de ramos SQL sem interpolar entrada do usuário**

```ts
const ramos: string[] = [];
if (dto.fontes.includes(BuscaCampanhaFonteEnum.MEU_CADERNO)) ramos.push(this.ramoMeuCaderno());
if (dto.fontes.includes(BuscaCampanhaFonteEnum.CADERNOS_JOGADORES)) ramos.push(this.ramoCadernosJogadores());
if (dto.fontes.includes(BuscaCampanhaFonteEnum.MINHAS_FICHAS)) ramos.push(this.ramoMinhasFichas());
if (dto.fontes.includes(BuscaCampanhaFonteEnum.FICHAS_CAMPANHA)) ramos.push(this.ramoFichasCampanha());

const sqlBase = `WITH consulta AS (
  SELECT websearch_to_tsquery('contratados_portugues', :termo) AS valor
), resultados AS (${ramos.join('\nUNION ALL\n')})
SELECT * FROM resultados`;
```

Os quatro métodos privados retornam somente fragmentos constantes. Páginas juntam autor ativo e papel; fichas usam o vetor ponderado idêntico ao índice parcial. `ts_headline` recebe `StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12`; o frontend mostra o campo como texto, nunca `innerHTML`.

- [ ] **Step 3: Implementar ordenação/paginação e controller query**

```ts
return this.executarConsultaPaginada<BuscaCampanhaResultadoDto>({
  sqlSelect: sqlBase,
  sqlContagem: `WITH consulta AS (...), resultados AS (${ramos.join('\nUNION ALL\n')}) SELECT COUNT(*) AS total FROM resultados`,
  parametrosSql: { campanhaId: dto.campanhaId, usuarioAtivoId: dto.usuarioAtivoId, termo: dto.termo },
  pagina: dto.pagina,
  itensPorPagina: dto.limite,
  ordenarPor: 'relevancia DESC, "updatedDate" DESC, id',
  direcao: 'DESC',
});
```

Se `termo.trim()` ficar vazio, a service devolve `new PaginatedResult({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 })` sem chamar o repository.

- [ ] **Step 4: Rodar testes e medir os índices**

O script `explain-busca-campanha.sql` cria 10.000 páginas e 10.000 fichas de prova dentro de uma transação, executa `ANALYZE` e duas consultas `EXPLAIN (ANALYZE, BUFFERS)`, uma por tipo de fonte, encerrando com `ROLLBACK`.

```powershell
npm run test --workspace=backend -- pagina-caderno
psql -f backend/tools/database/explain-busca-campanha.sql
```

Expected: testes PASS; planos contêm `Bitmap Index Scan`/`Bitmap Heap Scan` usando `ix_pagina_caderno_busca` e `ix_ficha_anotacoes_busca`. Se a expressão de ficha não usar o índice, substituir o índice de expressão por coluna `busca_anotacoes TSVECTOR` + trigger na mesma migration 0018 antes de qualquer ambiente compartilhado receber a migration, repetir a medição e documentar a evidência no cabeçalho do script.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/pagina-caderno backend/tools/database
git commit -m "feat(backend): adiciona busca unificada da campanha" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
```

---

### Task 6: Cliente HTTP e Markdown seguro

**Files:**
- Modify: `frontend/package.json`
- Modify: `package-lock.json`
- Create: `frontend/src/app/modules/pagina-caderno/pagina-caderno.service.ts`
- Create: `frontend/src/app/modules/pagina-caderno/pagina-caderno.service.spec.ts`
- Create: `frontend/src/app/modules/pagina-caderno/markdown-seguro.ts`
- Create: `frontend/src/app/modules/pagina-caderno/markdown-seguro.spec.ts`

**Interfaces:**
- Produces: métodos HTTP `listarPaginas`, `listarPaginasMembro`, `recuperarPagina`, `criarPagina`, `alterarPagina`, `excluirPagina`, `buscarCampanha`.
- Produces: `renderizarMarkdownSeguro(markdown: string, sanitizer: DomSanitizer): string`.

- [ ] **Step 1: Instalar a dependência pequena e dedicada**

```powershell
npm install marked --workspace=frontend
```

- [ ] **Step 2: Escrever testes de transporte e XSS**

```ts
it('remove HTML e imagens e rejeita protocolos perigosos', () => {
  const html = renderizarMarkdownSeguro(
    '<script>alert(1)</script>\n![segredo](data:text/html,x)\n[ruim](javascript:alert(1))\n[ok](https://example.com)',
    sanitizer,
  );
  expect(html).not.toContain('<script');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('rel="noopener noreferrer"');
});
```

No service spec, usar `HttpTestingController` para confirmar URLs, serialização de `fontes` separada por vírgula e extração de `StandardResponse.dados`.

- [ ] **Step 3: Rodar e confirmar falha**

```powershell
npm run test --workspace=frontend -- pagina-caderno.service.spec.ts markdown-seguro.spec.ts
```

Expected: FAIL por arquivos ausentes.

- [ ] **Step 4: Implementar parser restrito e sanitização Angular sem bypass**

```ts
const renderer = new Renderer();
renderer.html = () => '';
renderer.image = () => '';
renderer.link = function ({ href, title, tokens }) {
  const texto = this.parser.parseInline(tokens);
  if (!/^(https?:|mailto:)/i.test(href)) return texto;
  const titulo = title ? ` title="${escaparAtributo(title)}"` : '';
  return `<a href="${escaparAtributo(href)}"${titulo} target="_blank" rel="noopener noreferrer">${texto}</a>`;
};
const compilado = marked.parse(markdown, { async: false, renderer });
return sanitizer.sanitize(SecurityContext.HTML, compilado) ?? '';
```

Não usar `bypassSecurityTrustHtml`. Imagens e HTML bruto somem; o Markdown original continua intacto no textarea e no banco.

- [ ] **Step 5: Implementar cliente HTTP e rodar testes/build**

```powershell
npm run test --workspace=frontend -- pagina-caderno.service.spec.ts markdown-seguro.spec.ts
npm run build --workspace=frontend
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/package.json package-lock.json frontend/src/app/modules/pagina-caderno
git commit -m "feat(frontend): prepara transporte e markdown do caderno" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
```

---

### Task 7: Estado, geometria e autosave do utilitário

**Files:**
- Create: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.model.ts`
- Create: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.store.ts`
- Create: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.store.spec.ts`

**Interfaces:**
- Produces: store por instância de campanha com Signals `estado`, `paginas`, `paginaAtiva`, `rascunho`, `estadoSalvamento`, `resultadosBusca`.
- Produces: comandos `abrir`, `minimizar`, `fechar`, `selecionarPagina`, `alterarRascunho`, `salvarAgora`, `descartarCampanha`, `alterarGeometria`.

- [ ] **Step 1: Escrever testes com relógio falso para autosave e isolamento**

```ts
it('agrupa alterações em um PUT após 800 ms e conserva o rascunho no erro', fakeAsync(() => {
  store.selecionarPagina(pagina);
  store.alterarRascunho({ titulo: 'A', conteudoMarkdown: 'um' });
  tick(400);
  store.alterarRascunho({ titulo: 'AB', conteudoMarkdown: 'dois' });
  tick(799);
  expect(api.alterarPagina).not.toHaveBeenCalled();
  tick(1);
  expect(api.alterarPagina).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'AB' }));
}));
```

Adicionar casos: página nova não salva sem título; minimizar preserva; fechar chama `salvarAgora`; troca de campanha finaliza a tentativa pendente e limpa texto anterior; 409 mantém rascunho e marca `CONFLITO`; somente leitura nunca agenda PUT; geometria fica dentro do viewport e persiste em chave `contratados-rpg:caderno-geometria:v1` sem conteúdo textual.

- [ ] **Step 2: Rodar e confirmar falha**

```powershell
npm run test --workspace=frontend -- caderno-flutuante.store.spec.ts
```

Expected: FAIL por store ausente.

- [ ] **Step 3: Implementar máquina de estado explícita**

```ts
export type EstadoSalvamentoCaderno = 'INATIVO' | 'SALVANDO' | 'SALVO' | 'FALHA' | 'CONFLITO';

alterarRascunho(rascunho: CadernoRascunho): void {
  if (this.paginaAtiva()?.somenteLeitura) return;
  this.rascunho.set(rascunho);
  this.agendarSalvamento();
}
```

Usar `setTimeout` de 800 ms encapsulado no store, `takeUntilDestroyed`, `finalize` e uma fila serial: se houver mudança durante um PUT, o término agenda outro PUT com o `updatedDate` devolvido. Não gravar Markdown em `localStorage`.

- [ ] **Step 4: Rodar testes e lint**

```powershell
npm run test --workspace=frontend -- caderno-flutuante.store.spec.ts
npm run lint --workspace=frontend
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/app/modules/pagina-caderno
git commit -m "feat(frontend): gerencia estado e autosave do caderno" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
```

---

### Task 8: Janela de caderno, páginas e modo mestre

**Files:**
- Create: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.ts`
- Create: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.html`
- Create: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.scss`
- Create: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.spec.ts`
- Modify: `frontend/src/app/shared/utilitario-flutuante/utilitario-flutuante.spec.ts`

**Interfaces:**
- Consumes: inputs `campanhaId`, `campanhaNome`, `usuarioAtivoId`, `ehMestre`, `membros`; store da Task 7.
- Produces: output `abrirFicha = output<number>()` para resultados de ficha da Task 9.

- [ ] **Step 1: Escrever testes de estados e ações visíveis**

```ts
it('mestre vê página alheia sem controles de escrita', () => {
  fixture.componentRef.setInput('ehMestre', true);
  store.paginaAtiva.set({ ...pagina, somenteLeitura: true });
  fixture.detectChanges();
  expect(raiz.textContent).toContain('Somente leitura');
  expect(raiz.querySelector('[data-acao="salvar"]')).toBeNull();
  expect(raiz.querySelector('[data-acao="excluir"]')).toBeNull();
});
```

Cobrir fechado/aberto/minimizado; criar; editar/visualizar; vazio; carregando; salvando/salvo/falha/conflito; confirmação de exclusão; seletor Meu caderno/Cadernos dos jogadores; mobile lista↔conteúdo.

- [ ] **Step 2: Rodar e confirmar falha**

```powershell
npm run test --workspace=frontend -- caderno-flutuante.component.spec.ts
```

Expected: FAIL por componente ausente.

- [ ] **Step 3: Construir o corte visual representativo desktop**

```html
<button class="caderno__gatilho utilitario-flutuante utilitario-flutuante--caderno" type="button" (click)="abrir()">
  <app-icone nome="anotacoes" />
</button>

@if (estado().aberto && !estado().minimizado) {
  <section #janela class="caderno__janela" role="dialog" aria-label="Caderno da campanha">
    <header class="caderno__cabecalho" (pointerdown)="iniciarArraste($event)">…</header>
    <aside class="caderno__lista">…</aside>
    <main class="caderno__editor">…</main>
    <span class="caderno__redimensionar" (pointerdown)="iniciarRedimensionamento($event)"></span>
  </section>
}
```

Usar Reactive Forms para título/Markdown; tokens do tema; cabeçalho, botões e alça derivados de `leitor-documentos`; densidade do conteúdo derivada dos cards da campanha. O gatilho usa `posicionar-utilitario-flutuante(3)` para coexistir com Calculadora (0), Histórico (1) e Inventário (2).

- [ ] **Step 4: Implementar comportamento responsivo e acessível**

```scss
@include bp.mobile {
  .caderno__janela {
    inset: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
      max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
    width: auto;
    height: auto;
  }
  .caderno__redimensionar { display: none; }
}
```

No mobile, a store alterna `LISTA`/`CONTEUDO`; não há listener efetivo de drag/resize. Escape fecha quando o foco está na janela; fechar devolve foco ao abridor; todos os botões têm nome acessível e alvo mínimo canônico.

- [ ] **Step 5: Rodar testes e atualizar contrato da pilha**

```powershell
npm run test --workspace=frontend -- caderno-flutuante.component.spec.ts utilitario-flutuante.spec.ts
npm run build --workspace=frontend
```

Expected: PASS; o contrato CSS verifica a quarta vaga e que Documentos continua deslocando toda a pilha.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/app/modules/pagina-caderno frontend/src/app/shared/utilitario-flutuante
git commit -m "feat(frontend): cria janela flutuante do caderno" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
```

---

### Task 9: Busca, navegação e montagem na campanha

**Files:**
- Modify: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.ts`
- Modify: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.html`
- Modify: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.scss`
- Modify: `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.spec.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`

**Interfaces:**
- Consumes: busca paginada da Task 5 e output `abrirFicha` da Task 8.
- Produces: navegação de resultado de ficha para `/painel/:campanhaId/ficha/:fichaId#anotacoes`; resultado de página abre dentro do caderno.

- [ ] **Step 1: Escrever testes dos filtros por papel e destinos**

```ts
it('mostra somente filtros de jogador e abre ficha na aba anotações', () => {
  fixture.componentRef.setInput('ehMestre', false);
  fixture.detectChanges();
  expect(rotulosFiltros()).toEqual(['Meu caderno', 'Minhas fichas']);
  componente['selecionarResultado']({ ...resultadoFicha, tipo: BuscaCampanhaResultadoTipoEnum.ANOTACAO_FICHA });
  expect(abrirFichaEmitido).toBe(resultadoFicha.id);
});
```

Para mestre, esperar `Meu caderno`, `Cadernos dos jogadores`, `Fichas da campanha`; todos selecionados inicialmente. Confirmar que trecho usa interpolação textual e que paginação mantém filtros.

- [ ] **Step 2: Implementar busca reativa com debounce de 300 ms**

```ts
this.formBusca.controls.termo.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((termo) => this.api.buscarCampanha({
    campanhaId: this.campanhaId(), termo, fontes: this.fontesSelecionadas(), pagina: 1, limite: 20,
  })),
  takeUntilDestroyed(this.destroyRef),
).subscribe((resultado) => this.store.definirResultados(resultado));
```

Desmarcar todas as fontes limpa resultados e não chama API. Resultado de página chama `recuperarPagina` e muda para a vista de conteúdo; ficha emite o id.

- [ ] **Step 3: Montar o componente na página de campanha e navegar para a ficha**

```html
<app-caderno-flutuante
  [campanhaId]="id"
  [campanhaNome]="campanha()?.nome ?? ''"
  [usuarioAtivoId]="usuarioAtivoId()"
  [ehMestre]="ehMestre()"
  [membros]="membros()"
  (abrirFicha)="abrirAnotacoesFicha($event)"
/>
```

```ts
protected abrirAnotacoesFicha(fichaId: number): void {
  void this.router.navigate(['/painel', this.id, 'ficha', fichaId], { fragment: 'anotacoes' });
}
```

- [ ] **Step 4: Rodar testes integrados do frontend**

```powershell
npm run test --workspace=frontend -- caderno-flutuante.component.spec.ts detalhe.page.spec.ts
npm run lint --workspace=frontend
npm run build --workspace=frontend
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/app/modules/pagina-caderno frontend/src/app/modules/campanha/paginas/detalhe
git commit -m "feat(frontend): integra busca e caderno à campanha" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
```

---

### Task 10: Gate integrado, verificação visual e documentação final

**Files:**
- Modify: `docs/context/CONTEXT.md`
- Modify: `docs/context/HISTORY.md`
- Modify: `docs/context/PROBLEMS.md` somente se surgir defeito que permanecer aberto
- Preserve: `docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md` como registro aprovado e referência estável deste plano.

**Interfaces:**
- Consumes: feature completa das Tasks 1–9.
- Produces: evidência de banco, backend, frontend e UI; contexto persistente atualizado.

- [ ] **Step 1: Rodar o gate automatizado completo uma única vez no corte integrado**

```powershell
npm run lint
npm run test
npm run build --workspace=shared
npm run build --workspace=backend
npm run build --workspace=frontend
git diff --check
```

Expected: todos PASS. Falhas preexistentes são registradas separadamente e a tarefa permanece aberta se impedirem um gate obrigatório.

- [ ] **Step 2: Levantar a aplicação real e executar a skill `verify`**

```powershell
npm run db:up
npm run db:migrate --workspace=backend
npm run backend:dev
npm run frontend:dev
```

Verificar pessoalmente em `1920×1080` e `360×800`: fechado, aberto, redimensionado, minimizado, edição, preview Markdown, busca com filtros, resultado, somente leitura, vazio, erro, conflito e confirmação de exclusão. Comparar com Calculadora/Documentos: shell, densidade, cabeçalho, controles, foco/z-index, espaçamento, iconografia e responsividade. Corrigir e repetir somente os estados afetados.

- [ ] **Step 3: Executar roteiro funcional de permissão**

```text
1. Jogador A cria duas páginas, recarrega e pesquisa ambas.
2. Jogador B confirma que não lista, abre nem pesquisa páginas de A.
3. Mestre abre e pesquisa páginas de A, vê “Somente leitura” e não recebe ação de alterar/excluir.
4. Mestre pesquisa conjuntamente próprio caderno, cadernos dos jogadores e fichas.
5. Remover A da campanha e confirmar que suas páginas somem inclusive para o mestre.
6. Enviar PUT com updatedDate antigo e confirmar 409 sem perda do rascunho.
7. Abrir resultado de ficha e confirmar a URL terminando em #anotacoes.
```

- [ ] **Step 4: Revisar o diff contra cada seção da spec**

```powershell
git diff master...HEAD -- shared backend frontend docs
rg -n "TODO|TBD|bypassSecurityTrustHtml|process\.env|DELETE FROM|INSERT INTO[\s\S]*VALUES" shared backend frontend docs
```

Expected: nenhum placeholder, bypass, acesso direto a env, delete físico ou INSERT `VALUES` introduzido pela feature.

- [ ] **Step 5: Atualizar contexto e histórico em português**

```markdown
## Cadernos de campanha e busca textual

- Caderno privado por membro/campanha, páginas Markdown e leitura dos jogadores pelo mestre.
- Busca PostgreSQL unificada com anotações de ficha e filtros por papel.
- Elasticsearch permanece somente como evolução futura reconstruível.
```

- [ ] **Step 6: Commit final de documentação e conferência**

```powershell
git add docs
git commit -m "docs: registra entrega dos cadernos de campanha" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -s --format=full HEAD
git status --short --branch
```

Expected: branch limpa, todos os commits com trailer e nenhum arquivo do usuário incluído por engano.
