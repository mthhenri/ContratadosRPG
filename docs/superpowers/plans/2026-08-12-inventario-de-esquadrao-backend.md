# Inventário de Esquadrão (Backend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à campanha um inventário de esquadrão compartilhado (guardar/tirar item, sem limite, sem equipar), gateado por um estado "Na Base"/"Em Missão" que só o Mestre altera, e as duas rotas de transferência com o inventário de uma ficha ("Pegar"/"Mandar pra base"). Este plano cobre só o **backend** — API REST + eventos de tempo real, testados de ponta a ponta com fixtures. A UI (drawer do Mestre, coluna lateral do Jogador) é um plano seguinte, consumindo o contrato definido aqui.

**Architecture:** Duas colunas novas em `campanha` (`na_base`, `inventario` — nullable, sem `DEFAULT`, proibição #7). O inventário de esquadrão é um array JSONB simples (`CampanhaInventarioItemDto[]`), gerido inteiramente em TypeScript no `CampanhaService` (lê o array inteiro, muta em memória, regrava inteiro — mesmo padrão de `FichaService.alterarFicha`, sem transação/CTE, que não existem em nenhum lugar do projeto). A transferência ficha↔campanha mora no módulo `ficha` (que já depende de `campanha`, nunca o contrário) e reaproveita o gate de permissão único (`CampanhaService.validarAcessoInventario`, público) — proibição #28, um único árbitro por regra.

**Tech Stack:** NestJS + Knex (SQL bruto via `BaseRepository`, sem ORM) no backend; DTOs como interfaces TypeScript em `shared/` (sem `class-validator`); Vitest (`vi.fn`) nos testes; Socket.IO (`CampanhaGateway`, broadcast-only) para tempo real.

## Global Constraints

- Migration nova sempre `NNNN - Descrição.sql` em `backend/src/database/migrations/`; toda coluna nova é **nullable, sem `DEFAULT`** (proibição #7 — migrations rodam no build, antes do código novo assumir tráfego; a versão anterior precisa continuar rodando contra o schema novo).
- DTOs seguem `Entidade + Complemento? + Verbo + Dto` (entrada infinitivo, saída particípio); `Interno` só trafega entre service ↔ repository; sem `class-validator` — DTOs são interfaces (não classes).
- Nunca `DELETE` físico; toda query filtra `is_deleted = false`.
- Controller é burra — só monta o DTO com `@Param`/`@Query`/`@Body` e repassa à service (proibição #2). Toda regra de permissão vive na service dona, nunca duplicada (proibição #28).
- Sem transação/CTE multi-tabela — o padrão do projeto é ler o agregado inteiro, mutar em TypeScript, regravar o documento inteiro (`FichaService.alterarFicha`, `CampanhaService.criarCampanha`); duas escritas sequenciais aceitam a mesma janela de "last write wins" que já existe hoje em qualquer edição concorrente.
- Exceptions disponíveis (não criar novas): `BusinessException` (400), `ResourceNotFoundException` (404), `UnauthorizedAccessException` (403) — `backend/src/core/exceptions/`.
- Testes com Vitest: `npm run test --workspace=backend` (ou `-- <caminho>` para um arquivo).

---

### Task 1: Estado da campanha — Na Base / Em Missão

**Files:**
- Create: `backend/src/database/migrations/0017 - Campanha na base e inventario.sql`
- Modify: `shared/src/dtos/campanha/campanha.dtos.ts` (`CampanhaRecuperadaDto` ganha `naBase`; DTOs novos `CampanhaEstadoAlterarDto`/`CampanhaEstadoAlteradaDto`)
- Modify: `backend/src/modules/campanha/campanha.repository.ts` (`recuperarPorId` passa a selecionar `naBase`; método novo `alterarEstado`)
- Modify: `backend/src/modules/campanha/campanha.repository.spec.ts` (teste novo do SQL de `alterarEstado`/`recuperarPorId`)
- Modify: `backend/src/modules/campanha/campanha.service.ts` (método novo `alterarEstado`)
- Modify: `backend/src/modules/campanha/campanha.service.spec.ts` (fixture `campanhaPersistida` ganha `naBase`; testes novos de `alterarEstado`)
- Modify: `backend/src/modules/campanha/campanha.controller.ts` (rota nova `PUT :id/estado`)
- Modify: `backend/src/core/gateway/campanha.gateway.ts` (método novo `emitirEstadoAlterado`)
- Modify: `backend/src/core/gateway/campanha.gateway.spec.ts` (teste novo do emit)
- Modify (fixtures pra manter o build verde — `naBase` fica obrigatório em `CampanhaRecuperadaDto`):
  - `frontend/src/app/modules/campanha/campanha.service.spec.ts:107-111` (fixture `campanha`)
  - `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts:43-47` (fixture `campanhaBase`)

**Interfaces:**
- Produces: `CampanhaRecuperadaDto.naBase: boolean`; `CampanhaEstadoAlterarDto { id: number; naBase: boolean }`; `CampanhaEstadoAlteradaDto { id: number; naBase: boolean }`; `CampanhaService.alterarEstado(dto: CampanhaEstadoAlterarDto, usuarioAtivo: JwtPayload): Promise<CampanhaEstadoAlteradaDto>`; `CampanhaGateway.emitirEstadoAlterado(evento: CampanhaEstadoAlteradaDto): void` — todos consumidos pelo plano de frontend depois.

- [ ] **Step 1: Criar a migration**

```sql
-- Migration M6 — inventário de esquadrão (campanha). Duas colunas novas, ambas nullable e sem
-- `DEFAULT` (proibição #7): campanha existente nasce com `na_base = null` (tratado como "Na
-- Base"/`true` na leitura via COALESCE) e `inventario = null` (tratado como lista vazia). O
-- inventário é um array JSONB simples de itens descritivos (nome/categoria/custo/peso/
-- quantidade/dano/informação/resistência/bônus) — sem equipar, sem sub-inventário, sem limite de
-- peso; guardado inteiro a cada mutação (mesmo padrão de `ficha.dados`).

-- UP

ALTER TABLE campanha ADD COLUMN na_base BOOLEAN;
ALTER TABLE campanha ADD COLUMN inventario JSONB;

-- DOWN

ALTER TABLE campanha DROP COLUMN IF EXISTS inventario;
ALTER TABLE campanha DROP COLUMN IF EXISTS na_base;
```

- [ ] **Step 2: Rodar a migration**

Run: `npm run db:migrate --workspace=backend`
Expected: migration `0017` aplicada sem erro (precisa do Postgres de dev rodando — ver `docs/` de setup local se não tiver).

- [ ] **Step 3: Adicionar `naBase` a `CampanhaRecuperadaDto` e criar os DTOs de estado**

Em `shared/src/dtos/campanha/campanha.dtos.ts`, altere `CampanhaRecuperadaDto` (a interface já existe, ~linha 78):

```ts
/** Saída da recuperação individual — a campanha completa, incluindo o `codigoConvite`. */
export interface CampanhaRecuperadaDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly codigoConvite: string;
  /**
   * Estado "Na Base da Fundação" (`true`) ou "Em Missão" (`false`) — gate do inventário de
   * esquadrão (§ inventário). Só o Mestre altera (`alterarEstado`). Campanha existente nasce
   * `na_base = null` no banco, tratado como `true` na leitura (`COALESCE`).
   */
  readonly naBase: boolean;
}
```

No fim do arquivo, adicione:

```ts
/*
 * ── Inventário de esquadrão: estado Na Base / Em Missão ──────────────────────────────────
 */

/**
 * Entrada da alteração de estado — o `id` vem do `@Param`, injetado no DTO pela controller. Só
 * o Mestre altera (gate `validarMestre`, único árbitro — proibição #28).
 */
export interface CampanhaEstadoAlterarDto {
  readonly id: number;
  readonly naBase: boolean;
}

/** Saída da alteração de estado — também o payload do evento de tempo real `campanha:estado-alterado`. */
export interface CampanhaEstadoAlteradaDto {
  readonly id: number;
  readonly naBase: boolean;
}
```

- [ ] **Step 4: Corrigir os fixtures existentes pra compilar**

Em `frontend/src/app/modules/campanha/campanha.service.spec.ts`, no literal `campanha: CampanhaRecuperadaDto` (linhas 107-111), adicione `naBase: true,` logo após `codigoConvite: 'DEF456',`.

Em `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`, no literal `campanhaBase: CampanhaRecuperadaDto` (linhas 43-47), adicione `naBase: true,` logo após `codigoConvite: 'DEF456',`.

- [ ] **Step 5: Escrever o teste do SQL de `recuperarPorId`/`alterarEstado` (repositório)**

Em `backend/src/modules/campanha/campanha.repository.spec.ts`, depois do `describe`/`it` de `contarCampanhasComoMestre`, adicione:

```ts
  it('recuperarPorId seleciona na_base com COALESCE para true', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [{ id: 3, nome: 'Contenção Alfa', descricao: null, codigoConvite: 'ABCD2345', naBase: true }],
    });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const campanha = await repositorio.recuperarPorId({ id: 3 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain(`COALESCE(na_base, true) AS "naBase"`);
    expect(parametros).toEqual({ id: 3 });
    expect(campanha?.naBase).toBe(true);
  });

  it('alterarEstado grava na_base e devolve id/naBase', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ id: 3, naBase: false }] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.alterarEstado({ id: 3, naBase: false });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SET na_base = :naBase');
    expect(sql).toContain('WHERE id = :id AND is_deleted = false');
    expect(parametros).toEqual({ id: 3, naBase: false });
    expect(resultado).toEqual({ id: 3, naBase: false });
  });
```

- [ ] **Step 6: Rodar os testes do repositório e confirmar que falham**

Run: `npm run test --workspace=backend -- src/modules/campanha/campanha.repository.spec.ts`
Expected: FAIL — `repositorio.alterarEstado is not a function` / SQL sem `na_base`.

- [ ] **Step 7: Implementar no repositório**

Em `backend/src/modules/campanha/campanha.repository.ts`, altere `recuperarPorId`:

```ts
  /** Recupera a campanha ativa pelo `id` (ou `null`). */
  async recuperarPorId(dto: CampanhaRecuperarDto): Promise<CampanhaRecuperadaDto | null> {
    const [campanhaEncontrada] = await this.executarConsulta<CampanhaRecuperadaDto>(
      `SELECT id, nome, descricao, codigo_convite AS "codigoConvite",
              COALESCE(na_base, true) AS "naBase"
       FROM campanha
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id },
    );
    return campanhaEncontrada ?? null;
  }
```

E adicione, perto de `alterarConvite`:

```ts
  /**
   * Altera o estado "Na Base"/"Em Missão" da campanha (gate do inventário de esquadrão) — só
   * toca campanha ativa (`WHERE is_deleted = false`), sem `DEFAULT`.
   */
  async alterarEstado(dto: CampanhaEstadoAlterarDto): Promise<CampanhaEstadoAlteradaDto> {
    const [estadoAlterado] = await this.executarConsulta<CampanhaEstadoAlteradaDto>(
      `UPDATE campanha
       SET na_base = :naBase, updated_date = NOW()
       WHERE id = :id AND is_deleted = false
       RETURNING id, na_base AS "naBase"`,
      { id: dto.id, naBase: dto.naBase },
    );
    return estadoAlterado;
  }
```

Adicione `CampanhaEstadoAlterarDto`/`CampanhaEstadoAlteradaDto` ao bloco de `import type { ... } from '@contratados-rpg/shared/dtos/campanha';` no topo do arquivo.

- [ ] **Step 8: Rodar os testes do repositório e confirmar que passam**

Run: `npm run test --workspace=backend -- src/modules/campanha/campanha.repository.spec.ts`
Expected: PASS.

- [ ] **Step 9: Escrever o teste da service (`alterarEstado`, só Mestre)**

Em `backend/src/modules/campanha/campanha.service.spec.ts`, atualize o literal `campanhaPersistida` (linhas 47-52) adicionando `naBase: true,` logo após `codigoConvite: 'ABCD2345',`. Adicione `alterarEstado: vi.fn(),` à interface `RepositorioDublado` e ao objeto `repositorio` no `beforeEach`. Depois, no fim do arquivo (após o último `describe`), adicione:

```ts
  describe('alterarEstado', () => {
    it('altera o estado quando o usuário é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      repositorio.alterarEstado.mockResolvedValue({ id: 3, naBase: false });

      const resultado = await service.alterarEstado({ id: 3, naBase: false }, usuarioMestre);

      expect(repositorio.alterarEstado).toHaveBeenCalledWith({ id: 3, naBase: false });
      expect(resultado).toEqual({ id: 3, naBase: false });
    });

    it('lança UnauthorizedAccessException quando o usuário não é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });

      await expect(
        service.alterarEstado({ id: 3, naBase: false }, usuarioNaoMestre),
      ).rejects.toThrow(UnauthorizedAccessException);
      expect(repositorio.alterarEstado).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a campanha não existe', async () => {
      repositorio.recuperarPorId.mockResolvedValue(null);

      await expect(
        service.alterarEstado({ id: 99, naBase: false }, usuarioMestre),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
```

- [ ] **Step 10: Rodar os testes da service e confirmar que falham**

Run: `npm run test --workspace=backend -- src/modules/campanha/campanha.service.spec.ts`
Expected: FAIL — `service.alterarEstado is not a function`.

- [ ] **Step 11: Implementar na service**

Em `backend/src/modules/campanha/campanha.service.ts`, adicione ao final da classe (antes de `gerarCodigoConvite`):

```ts
  /**
   * Altera o estado "Na Base"/"Em Missão" da campanha — só o mestre pode (gate `validarMestre`,
   * único árbitro — proibição #28). Gateia o acesso ao inventário de esquadrão: `naBase = false`
   * bloqueia jogadores em todas as rotas de `§ inventário`, o mestre sempre acessa.
   * `ResourceNotFoundException` se a campanha não existir; `UnauthorizedAccessException` se o
   * autor não for o mestre.
   */
  async alterarEstado(
    dto: CampanhaEstadoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaEstadoAlteradaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });

    const estadoAlterado = await this.campanhaRepositorio.alterarEstado(dto);
    this.campanhaGateway.emitirEstadoAlterado(estadoAlterado);
    return estadoAlterado;
  }
```

Adicione `CampanhaEstadoAlterarDto`/`CampanhaEstadoAlteradaDto` ao bloco de imports do topo do arquivo.

- [ ] **Step 12: Rodar os testes da service e confirmar que passam**

Run: `npm run test --workspace=backend -- src/modules/campanha/campanha.service.spec.ts`
Expected: PASS.

- [ ] **Step 13: Escrever o teste do gateway (`emitirEstadoAlterado`)**

Em `backend/src/core/gateway/campanha.gateway.spec.ts`, dentro de `describe('emissão de eventos (broadcast-only)', ...)`, após o teste de `emitirMembroEntrou`:

```ts
    it('emite campanha:estado-alterado na sala da campanha', () => {
      gateway.emitirEstadoAlterado({ id: 3, naBase: false });

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('campanha:estado-alterado', { id: 3, naBase: false });
    });
```

- [ ] **Step 14: Rodar o teste do gateway e confirmar que falha**

Run: `npm run test --workspace=backend -- src/core/gateway/campanha.gateway.spec.ts`
Expected: FAIL — `gateway.emitirEstadoAlterado is not a function`.

- [ ] **Step 15: Implementar no gateway**

Em `backend/src/core/gateway/campanha.gateway.ts`, adicione perto de `emitirMembroEntrou`:

```ts
  /**
   * Emite `campanha:estado-alterado` na sala `campanha:<id>` (§ inventário de esquadrão).
   * Chamado por `CampanhaService.alterarEstado` após a mutação ser persistida — os membros
   * conectados veem o estado Na Base/Em Missão mudar em tempo real.
   */
  emitirEstadoAlterado(evento: CampanhaEstadoAlteradaDto): void {
    this.servidor.to(this.salaCampanha(evento.id)).emit('campanha:estado-alterado', evento);
  }
```

Adicione `CampanhaEstadoAlteradaDto` ao bloco `import type { ... } from '@contratados-rpg/shared/dtos/campanha';` do topo do arquivo.

- [ ] **Step 16: Rodar o teste do gateway e confirmar que passa**

Run: `npm run test --workspace=backend -- src/core/gateway/campanha.gateway.spec.ts`
Expected: PASS.

- [ ] **Step 17: Adicionar a rota na controller**

Em `backend/src/modules/campanha/campanha.controller.ts`, adicione (perto de `alterar`):

```ts
  @Put(':id/estado')
  alterarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaEstadoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaEstadoAlteradaDto> {
    return this.campanhaService.alterarEstado({ ...dto, id }, usuarioAtivo);
  }
```

Adicione `CampanhaEstadoAlterarDto`/`CampanhaEstadoAlteradaDto` ao bloco de imports do topo do arquivo.

- [ ] **Step 18: Rodar a suíte inteira do backend e confirmar que compila/passa**

Run: `npm run test --workspace=backend`
Expected: PASS (nenhum teste quebrado pelas mudanças de tipo).

Run: `npx tsc --noEmit -p frontend/tsconfig.json` (ou `npm run build --workspace=frontend` se não houver esse script — confirmar em `frontend/package.json`)
Expected: sem erro de tipo nos dois fixtures corrigidos no Step 4.

- [ ] **Step 19: Commit**

```bash
git add backend/src/database/migrations/"0017 - Campanha na base e inventario.sql" \
  shared/src/dtos/campanha/campanha.dtos.ts \
  backend/src/modules/campanha/campanha.repository.ts \
  backend/src/modules/campanha/campanha.repository.spec.ts \
  backend/src/modules/campanha/campanha.service.ts \
  backend/src/modules/campanha/campanha.service.spec.ts \
  backend/src/modules/campanha/campanha.controller.ts \
  backend/src/core/gateway/campanha.gateway.ts \
  backend/src/core/gateway/campanha.gateway.spec.ts \
  frontend/src/app/modules/campanha/campanha.service.spec.ts \
  frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
git commit -m "feat(campanha): estado Na Base/Em Missão (gate do inventário de esquadrão)"
```

---

### Task 2: Inventário de esquadrão — CRUD na campanha

**Files:**
- Modify: `shared/src/dtos/campanha/campanha.dtos.ts` (DTOs novos do inventário)
- Modify: `backend/src/modules/campanha/campanha.repository.ts` (`recuperarInventario`, `alterarInventario`)
- Modify: `backend/src/modules/campanha/campanha.repository.spec.ts` (testes novos)
- Modify: `backend/src/modules/campanha/campanha.service.ts` (`validarAcessoInventario` público + `listarInventario`/`adicionarItemInventario`/`removerItemInventario`/`ajustarQuantidadeItemInventario`)
- Modify: `backend/src/modules/campanha/campanha.service.spec.ts` (testes novos)
- Modify: `backend/src/modules/campanha/campanha.controller.ts` (rotas novas)
- Modify: `backend/src/core/gateway/campanha.gateway.ts` (`emitirInventarioAlterado`)
- Modify: `backend/src/core/gateway/campanha.gateway.spec.ts` (teste novo)

**Interfaces:**
- Consumes: `CampanhaRepository.recuperarPorId` já devolve `naBase` (Task 1).
- Produces: `CampanhaInventarioItemDto`, `CampanhaInventarioDto { itens: readonly CampanhaInventarioItemDto[] }`; `CampanhaService.validarAcessoInventario(dto: { campanhaId: number; usuarioId: number }): Promise<CampanhaRecuperadaDto>` (**público** — Task 3 do módulo `ficha` chama este método, proibição #28); `CampanhaRepository.recuperarInventario(dto: { campanhaId: number }): Promise<readonly CampanhaInventarioItemDto[]>` e `CampanhaRepository.alterarInventario(dto: { campanhaId: number; itens: readonly CampanhaInventarioItemDto[] }): Promise<CampanhaInventarioDto>` (**públicos** — Task 3 chama os dois diretamente para ler/gravar o lado da campanha na transferência).

- [ ] **Step 1: Adicionar os DTOs do inventário**

Em `shared/src/dtos/campanha/campanha.dtos.ts`, no fim do arquivo, após os DTOs de estado do Task 1:

```ts
/*
 * ── Inventário de esquadrão: itens ────────────────────────────────────────────────────────
 */

/**
 * Item do inventário de esquadrão — só os campos **descritivos** do catálogo de compras
 * (`ItemCatalogo`, `shared/regras/compras`), sem `equipado`/`modificacoes`/`containerId`: este
 * inventário só guarda, não equipa nada. `id` é um uuid gerado no `POST` — identificador estável
 * para remover/ajustar/transferir o item.
 */
export interface CampanhaInventarioItemDto {
  readonly id: string;
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

/** Saída da listagem/mutação do inventário de esquadrão — a lista inteira e atual de itens. */
export interface CampanhaInventarioDto {
  readonly itens: readonly CampanhaInventarioItemDto[];
}

/** Entrada da listagem — o `campanhaId` vem do `@Param`, injetado no DTO pela controller. */
export interface CampanhaInventarioRecuperarDto {
  readonly campanhaId: number;
}

/**
 * Entrada de adicionar item — o `campanhaId` vem do `@Param`; os demais campos vêm do corpo.
 * Qualquer membro pode adicionar (respeitando o gate Na Base/Em Missão do jogador).
 */
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

/** Entrada de remover item inteiro — `campanhaId`/`itemId` vêm do `@Param`. */
export interface CampanhaInventarioItemRemoverDto {
  readonly campanhaId: number;
  readonly itemId: string;
}

/**
 * Entrada de ajustar quantidade por delta (stepper +/-1, mesmo padrão de Vida/Energia da ficha)
 * — `campanhaId`/`itemId` vêm do `@Param`, `delta` do corpo. Quantidade que chega a `<= 0` remove
 * o item.
 */
export interface CampanhaInventarioItemQuantidadeAjustarDto {
  readonly campanhaId: number;
  readonly itemId: string;
  readonly delta: number;
}

/**
 * Entrada interna de `CampanhaRepository.alterarInventario` — substitui a lista inteira de itens
 * (mesmo padrão de "ler tudo, mutar em TS, regravar tudo" de `FichaRepository.alterarFicha`). Só
 * service ↔ repository (`ficha` também chama este método do repositório diretamente na Task 3).
 */
export interface CampanhaInventarioInternoAlterarDto {
  readonly campanhaId: number;
  readonly itens: readonly CampanhaInventarioItemDto[];
}

/** Payload do evento de tempo real `campanha:inventario-alterado` — o cliente refaz o GET. */
export interface CampanhaInventarioAlteradoDto {
  readonly campanhaId: number;
}
```

No topo do arquivo, troque o import de tipos para incluir `ItemCategoriaEnum`:

```ts
import type { ArquetipoEnum, ClasseEnum, ItemCategoriaEnum, TipoCampanhaMembroPapelEnum } from '../../enums';
```

- [ ] **Step 2: Escrever os testes do repositório (`recuperarInventario`/`alterarInventario`)**

Em `backend/src/modules/campanha/campanha.repository.spec.ts`, adicione:

```ts
  it('recuperarInventario devolve os itens com COALESCE para lista vazia', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ itens: [{ id: 'a1', nome: 'Kit Médico' }] }] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const itens = await repositorio.recuperarInventario({ campanhaId: 3 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain(`COALESCE(inventario, '[]'::jsonb) AS itens`);
    expect(parametros).toEqual({ campanhaId: 3 });
    expect(itens).toEqual([{ id: 'a1', nome: 'Kit Médico' }]);
  });

  it('recuperarInventario devolve lista vazia quando a campanha não existe', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const itens = await repositorio.recuperarInventario({ campanhaId: 99 });

    expect(itens).toEqual([]);
  });

  it('alterarInventario regrava a lista inteira e devolve os itens atualizados', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ itens: [{ id: 'a1', quantidade: 2 }] }] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.alterarInventario({
      campanhaId: 3,
      itens: [{ id: 'a1', quantidade: 2 } as never],
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SET inventario = :itens::jsonb');
    expect(sql).toContain('WHERE id = :campanhaId AND is_deleted = false');
    expect(parametros).toEqual({ campanhaId: 3, itens: JSON.stringify([{ id: 'a1', quantidade: 2 }]) });
    expect(resultado).toEqual({ itens: [{ id: 'a1', quantidade: 2 }] });
  });
```

- [ ] **Step 3: Rodar e confirmar que falham**

Run: `npm run test --workspace=backend -- src/modules/campanha/campanha.repository.spec.ts`
Expected: FAIL — métodos inexistentes.

- [ ] **Step 4: Implementar no repositório**

Em `backend/src/modules/campanha/campanha.repository.ts`, adicione (perto de `alterarEstado`):

```ts
  /**
   * Recupera os itens ativos do inventário de esquadrão da campanha — lista vazia se a campanha
   * nunca teve item (`inventario = null`) ou não existir (nenhuma linha casa o `WHERE`).
   */
  async recuperarInventario(dto: CampanhaInventarioRecuperarDto): Promise<readonly CampanhaInventarioItemDto[]> {
    const [resultado] = await this.executarConsulta<{ itens: CampanhaInventarioItemDto[] }>(
      `SELECT COALESCE(inventario, '[]'::jsonb) AS itens
       FROM campanha
       WHERE id = :campanhaId AND is_deleted = false`,
      { campanhaId: dto.campanhaId },
    );
    return resultado?.itens ?? [];
  }

  /**
   * Substitui a lista inteira de itens do inventário de esquadrão (mesmo padrão de "ler tudo,
   * mutar em TS, regravar tudo" de `FichaRepository.alterarFicha` — sem transação/CTE, que não
   * existem em nenhum lugar do projeto). Só toca campanha ativa, sem `DEFAULT`.
   */
  async alterarInventario(dto: CampanhaInventarioInternoAlterarDto): Promise<CampanhaInventarioDto> {
    const [resultado] = await this.executarConsulta<{ itens: CampanhaInventarioItemDto[] }>(
      `UPDATE campanha
       SET inventario = :itens::jsonb, updated_date = NOW()
       WHERE id = :campanhaId AND is_deleted = false
       RETURNING COALESCE(inventario, '[]'::jsonb) AS itens`,
      { campanhaId: dto.campanhaId, itens: JSON.stringify(dto.itens) },
    );
    return { itens: resultado.itens };
  }
```

Adicione `CampanhaInventarioDto`, `CampanhaInventarioInternoAlterarDto`, `CampanhaInventarioItemDto`, `CampanhaInventarioRecuperarDto` ao bloco de imports do topo do arquivo.

- [ ] **Step 5: Rodar e confirmar que passam**

Run: `npm run test --workspace=backend -- src/modules/campanha/campanha.repository.spec.ts`
Expected: PASS.

- [ ] **Step 6: Escrever os testes da service**

Em `backend/src/modules/campanha/campanha.service.spec.ts`, adicione `recuperarInventario: vi.fn(), alterarInventario: vi.fn(),` à interface `RepositorioDublado` e ao `beforeEach`, e adicione `ItemCategoriaEnum` ao import de `@contratados-rpg/shared/enums` do topo do arquivo. No fim do arquivo:

```ts
  describe('validarAcessoInventario (gate Na Base / Em Missão)', () => {
    it('permite o mestre mesmo com naBase=false', async () => {
      repositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: false });
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });

      await expect(
        service.validarAcessoInventario({ campanhaId: 3, usuarioId: usuarioMestre.sub }),
      ).resolves.not.toThrow();
    });

    it('bloqueia o jogador quando naBase=false', async () => {
      repositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: false });
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });

      await expect(
        service.validarAcessoInventario({ campanhaId: 3, usuarioId: usuarioNaoMestre.sub }),
      ).rejects.toThrow(UnauthorizedAccessException);
    });

    it('permite o jogador quando naBase=true', async () => {
      repositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: true });
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });

      await expect(
        service.validarAcessoInventario({ campanhaId: 3, usuarioId: usuarioNaoMestre.sub }),
      ).resolves.not.toThrow();
    });

    it('lança UnauthorizedAccessException quando não é membro', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue(null);

      await expect(
        service.validarAcessoInventario({ campanhaId: 3, usuarioId: 999 }),
      ).rejects.toThrow(UnauthorizedAccessException);
    });
  });

  describe('listarInventario', () => {
    it('devolve os itens quando o acesso é permitido', async () => {
      repositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: true });
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });
      repositorio.recuperarInventario.mockResolvedValue([{ id: 'a1', nome: 'Kit Médico' }]);

      const resultado = await service.listarInventario({ campanhaId: 3 }, usuarioNaoMestre);

      expect(resultado).toEqual({ itens: [{ id: 'a1', nome: 'Kit Médico' }] });
    });
  });

  describe('adicionarItemInventario', () => {
    it('gera um id novo e acrescenta o item à lista existente', async () => {
      repositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: true });
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });
      repositorio.recuperarInventario.mockResolvedValue([{ id: 'existente', nome: 'Munição 9mm' }]);
      repositorio.alterarInventario.mockResolvedValue({ itens: [] });

      await service.adicionarItemInventario(
        {
          campanhaId: 3,
          nome: 'Kit Médico Avançado',
          categoria: ItemCategoriaEnum.MEDICINAL,
          custo: 10,
          peso: 1,
          quantidade: 2,
        },
        usuarioNaoMestre,
      );

      expect(repositorio.alterarInventario).toHaveBeenCalledWith({
        campanhaId: 3,
        itens: [
          { id: 'existente', nome: 'Munição 9mm' },
          expect.objectContaining({ nome: 'Kit Médico Avançado', quantidade: 2 }),
        ],
      });
      const itemNovo = (repositorio.alterarInventario.mock.calls[0]![0] as { itens: { id: string }[] }).itens[1];
      expect(typeof itemNovo.id).toBe('string');
      expect(itemNovo.id.length).toBeGreaterThan(0);
    });
  });

  describe('removerItemInventario', () => {
    it('remove o item da lista', async () => {
      repositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: true });
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      repositorio.recuperarInventario.mockResolvedValue([
        { id: 'a1', nome: 'Kit Médico' },
        { id: 'a2', nome: 'Munição' },
      ]);
      repositorio.alterarInventario.mockResolvedValue({ itens: [{ id: 'a2', nome: 'Munição' }] });

      const resultado = await service.removerItemInventario({ campanhaId: 3, itemId: 'a1' }, usuarioMestre);

      expect(repositorio.alterarInventario).toHaveBeenCalledWith({
        campanhaId: 3,
        itens: [{ id: 'a2', nome: 'Munição' }],
      });
      expect(resultado).toEqual({ itens: [{ id: 'a2', nome: 'Munição' }] });
    });

    it('lança ResourceNotFoundException quando o item não existe', async () => {
      repositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: true });
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      repositorio.recuperarInventario.mockResolvedValue([]);

      await expect(
        service.removerItemInventario({ campanhaId: 3, itemId: 'inexistente' }, usuarioMestre),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(repositorio.alterarInventario).not.toHaveBeenCalled();
    });
  });

  describe('ajustarQuantidadeItemInventario', () => {
    it('soma o delta à quantidade existente', async () => {
      repositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: true });
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      repositorio.recuperarInventario.mockResolvedValue([{ id: 'a1', nome: 'Munição', quantidade: 5 }]);
      repositorio.alterarInventario.mockResolvedValue({ itens: [{ id: 'a1', nome: 'Munição', quantidade: 6 }] });

      await service.ajustarQuantidadeItemInventario({ campanhaId: 3, itemId: 'a1', delta: 1 }, usuarioMestre);

      expect(repositorio.alterarInventario).toHaveBeenCalledWith({
        campanhaId: 3,
        itens: [{ id: 'a1', nome: 'Munição', quantidade: 6 }],
      });
    });

    it('remove o item quando a quantidade chega a zero ou menos', async () => {
      repositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: true });
      repositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      repositorio.recuperarInventario.mockResolvedValue([{ id: 'a1', nome: 'Munição', quantidade: 1 }]);
      repositorio.alterarInventario.mockResolvedValue({ itens: [] });

      await service.ajustarQuantidadeItemInventario({ campanhaId: 3, itemId: 'a1', delta: -1 }, usuarioMestre);

      expect(repositorio.alterarInventario).toHaveBeenCalledWith({ campanhaId: 3, itens: [] });
    });
  });
```

- [ ] **Step 7: Rodar e confirmar que falham**

Run: `npm run test --workspace=backend -- src/modules/campanha/campanha.service.spec.ts`
Expected: FAIL — métodos inexistentes.

- [ ] **Step 8: Implementar na service**

Em `backend/src/modules/campanha/campanha.service.ts`, adicione `import { randomUUID } from 'node:crypto';` (junto de `randomBytes`), e os métodos (perto de `listarMembros`, antes dos métodos `private`):

```ts
  /**
   * Gate único do inventário de esquadrão (proibição #28 — árbitro único desta regra, chamado
   * também pelo módulo `ficha` nas rotas de transferência): exige que o usuário seja membro da
   * campanha; se for `JOGADOR`, exige `naBase = true` (o Mestre sempre acessa, mesmo Em Missão).
   * Devolve a campanha (quem chama já precisa dela, evita reconsultar). `ResourceNotFoundException`
   * se a campanha não existir; `UnauthorizedAccessException` se não for membro, ou for jogador com
   * a campanha Em Missão.
   */
  async validarAcessoInventario(dto: CampanhaMembroInternoRecuperarDto): Promise<CampanhaRecuperadaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.campanhaId });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membroEncontrado) {
      throw new UnauthorizedAccessException();
    }
    if (membroEncontrado.papel === TipoCampanhaMembroPapelEnum.JOGADOR && !campanhaEncontrada.naBase) {
      throw new UnauthorizedAccessException(
        'Inventário de esquadrão só pode ser acessado enquanto a campanha está na Base da Fundação',
      );
    }

    return campanhaEncontrada;
  }

  /** Lista os itens do inventário de esquadrão — respeita o gate Na Base/Em Missão. */
  async listarInventario(
    dto: CampanhaInventarioRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    await this.validarAcessoInventario({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const itens = await this.campanhaRepositorio.recuperarInventario({ campanhaId: dto.campanhaId });
    return { itens };
  }

  /** Adiciona um item novo ao inventário de esquadrão (id gerado aqui) — respeita o gate. */
  async adicionarItemInventario(
    dto: CampanhaInventarioItemAdicionarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    await this.validarAcessoInventario({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const itensAtuais = await this.campanhaRepositorio.recuperarInventario({ campanhaId: dto.campanhaId });

    const itemNovo: CampanhaInventarioItemDto = {
      id: randomUUID(),
      nome: dto.nome,
      categoria: dto.categoria,
      custo: dto.custo,
      peso: dto.peso,
      quantidade: dto.quantidade,
      descricao: dto.descricao,
      dano: dto.dano,
      informacao: dto.informacao,
      resistencia: dto.resistencia,
      bonus: dto.bonus,
    };

    const inventarioAlterado = await this.campanhaRepositorio.alterarInventario({
      campanhaId: dto.campanhaId,
      itens: [...itensAtuais, itemNovo],
    });
    this.campanhaGateway.emitirInventarioAlterado({ campanhaId: dto.campanhaId });
    return inventarioAlterado;
  }

  /** Remove um item inteiro do inventário de esquadrão — respeita o gate. */
  async removerItemInventario(
    dto: CampanhaInventarioItemRemoverDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    await this.validarAcessoInventario({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const itensAtuais = await this.campanhaRepositorio.recuperarInventario({ campanhaId: dto.campanhaId });
    if (!itensAtuais.some((item) => item.id === dto.itemId)) {
      throw new ResourceNotFoundException('Item do inventário de esquadrão');
    }

    const inventarioAlterado = await this.campanhaRepositorio.alterarInventario({
      campanhaId: dto.campanhaId,
      itens: itensAtuais.filter((item) => item.id !== dto.itemId),
    });
    this.campanhaGateway.emitirInventarioAlterado({ campanhaId: dto.campanhaId });
    return inventarioAlterado;
  }

  /**
   * Ajusta a quantidade de um item por delta (stepper +/-1, mesmo padrão de Vida/Energia da
   * ficha) — respeita o gate. Quantidade que chega a `<= 0` remove o item.
   */
  async ajustarQuantidadeItemInventario(
    dto: CampanhaInventarioItemQuantidadeAjustarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    await this.validarAcessoInventario({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const itensAtuais = await this.campanhaRepositorio.recuperarInventario({ campanhaId: dto.campanhaId });
    const itemEncontrado = itensAtuais.find((item) => item.id === dto.itemId);
    if (!itemEncontrado) {
      throw new ResourceNotFoundException('Item do inventário de esquadrão');
    }

    const novaQuantidade = itemEncontrado.quantidade + dto.delta;
    const itensNovos =
      novaQuantidade <= 0
        ? itensAtuais.filter((item) => item.id !== dto.itemId)
        : itensAtuais.map((item) =>
            item.id === dto.itemId ? { ...item, quantidade: novaQuantidade } : item,
          );

    const inventarioAlterado = await this.campanhaRepositorio.alterarInventario({
      campanhaId: dto.campanhaId,
      itens: itensNovos,
    });
    this.campanhaGateway.emitirInventarioAlterado({ campanhaId: dto.campanhaId });
    return inventarioAlterado;
  }
```

Adicione os DTOs novos (`CampanhaInventarioDto`, `CampanhaInventarioItemAdicionarDto`, `CampanhaInventarioItemDto`, `CampanhaInventarioItemQuantidadeAjustarDto`, `CampanhaInventarioItemRemoverDto`, `CampanhaInventarioRecuperarDto`) ao bloco de imports do topo do arquivo.

- [ ] **Step 9: Rodar e confirmar que passam**

Run: `npm run test --workspace=backend -- src/modules/campanha/campanha.service.spec.ts`
Expected: PASS.

- [ ] **Step 10: Escrever e implementar o evento do gateway**

Em `backend/src/core/gateway/campanha.gateway.spec.ts`, adicione o teste (mesmo bloco `describe('emissão de eventos...')`):

```ts
    it('emite campanha:inventario-alterado na sala da campanha', () => {
      gateway.emitirInventarioAlterado({ campanhaId: 3 });

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('campanha:inventario-alterado', { campanhaId: 3 });
    });
```

Run: `npm run test --workspace=backend -- src/core/gateway/campanha.gateway.spec.ts`
Expected: FAIL.

Em `backend/src/core/gateway/campanha.gateway.ts`, adicione:

```ts
  /**
   * Emite `campanha:inventario-alterado` na sala `campanha:<id>` — sem payload de dados (o
   * cliente sempre refaz `GET /campanha/:id/inventario`, mesmo padrão dos demais broadcasts).
   * Chamado pelas mutações de `CampanhaService` e pelas rotas de transferência de `FichaService`
   * (Task 3) após persistir.
   */
  emitirInventarioAlterado(evento: CampanhaInventarioAlteradoDto): void {
    this.servidor.to(this.salaCampanha(evento.campanhaId)).emit('campanha:inventario-alterado', evento);
  }
```

Adicione `CampanhaInventarioAlteradoDto` ao bloco de imports do topo do arquivo.

Run: `npm run test --workspace=backend -- src/core/gateway/campanha.gateway.spec.ts`
Expected: PASS.

- [ ] **Step 11: Adicionar as rotas na controller**

Em `backend/src/modules/campanha/campanha.controller.ts`, adicione `Patch` ao import de `@nestjs/common` e as rotas (perto de `listarMembros`):

```ts
  @Get(':id/inventario')
  listarInventario(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    return this.campanhaService.listarInventario({ campanhaId: id }, usuarioAtivo);
  }

  @Post(':id/inventario/item')
  adicionarItemInventario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaInventarioItemAdicionarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    return this.campanhaService.adicionarItemInventario({ ...dto, campanhaId: id }, usuarioAtivo);
  }

  @Delete(':id/inventario/item/:itemId')
  removerItemInventario(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId') itemId: string,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    return this.campanhaService.removerItemInventario({ campanhaId: id, itemId }, usuarioAtivo);
  }

  @Patch(':id/inventario/item/:itemId/quantidade')
  ajustarQuantidadeItemInventario(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId') itemId: string,
    @Body() dto: { delta: number },
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    return this.campanhaService.ajustarQuantidadeItemInventario(
      { campanhaId: id, itemId, delta: dto.delta },
      usuarioAtivo,
    );
  }
```

Adicione `CampanhaInventarioDto`, `CampanhaInventarioItemAdicionarDto` ao bloco de imports do topo do arquivo.

- [ ] **Step 12: Rodar a suíte inteira do backend**

Run: `npm run test --workspace=backend`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add shared/src/dtos/campanha/campanha.dtos.ts \
  backend/src/modules/campanha/campanha.repository.ts \
  backend/src/modules/campanha/campanha.repository.spec.ts \
  backend/src/modules/campanha/campanha.service.ts \
  backend/src/modules/campanha/campanha.service.spec.ts \
  backend/src/modules/campanha/campanha.controller.ts \
  backend/src/core/gateway/campanha.gateway.ts \
  backend/src/core/gateway/campanha.gateway.spec.ts
git commit -m "feat(campanha): CRUD do inventário de esquadrão"
```

---

### Task 3: Transferência ficha ↔ inventário de esquadrão

**Files:**
- Modify: `shared/src/dtos/ficha/ficha-operacao.dtos.ts` (DTOs de transferência)
- Modify: `backend/src/modules/ficha/ficha.repository.ts` (`alterarInventario`, dedicado só a `dados`)
- Create: `backend/src/modules/ficha/ficha.repository.spec.ts` (não existe suíte de repositório pra `ficha` hoje — só `campanha.repository.spec.ts` existe; este arquivo nasce só com o teste de `alterarInventario`, no mesmo estilo)
- Modify: `backend/src/modules/ficha/ficha.service.ts` (`pegarItemInventario`, `mandarItemInventarioParaBase`; construtor ganha `CampanhaService`)
- Modify: `backend/src/modules/ficha/ficha.service.spec.ts` (testes novos)
- Modify: `backend/src/modules/ficha/ficha.controller.ts` (rotas novas)
- Modify: `backend/src/modules/ficha/ficha.module.ts` (nenhuma mudança de wiring — `CampanhaModule` já exporta `CampanhaService`, só o construtor da service muda)

**Interfaces:**
- Consumes: `CampanhaService.validarAcessoInventario` (Task 2, agora usado fora do módulo `campanha`), `CampanhaRepository.recuperarInventario`/`alterarInventario` (Task 2), `CampanhaGateway.emitirInventarioAlterado` (Task 2), `CampanhaGateway.emitirFichaAlterada` (já existente).
- Produces: `FichaInventarioItemPegarDto { fichaId: number; campanhaItemId: string; quantidade?: number }`, `FichaInventarioItemMandarParaBaseDto { fichaId: number; indice: number; quantidade?: number }` — consumidos pelo plano de frontend.

- [ ] **Step 1: Adicionar os DTOs de transferência**

Em `shared/src/dtos/ficha/ficha-operacao.dtos.ts`, no fim do arquivo:

```ts
/*
 * ── Transferência ficha ↔ inventário de esquadrão ─────────────────────────────────────────
 * As duas rotas moram no módulo `ficha` porque `FichaModule` já depende de `CampanhaModule`
 * (nunca o contrário) — evita dependência circular. O gate Na Base/Em Missão é o mesmo de
 * `CampanhaService.validarAcessoInventario` (proibição #28, árbitro único).
 */

/**
 * Entrada de "pegar" um item do inventário de esquadrão pra própria ficha — o `fichaId` vem do
 * `@Param`. `campanhaItemId` é o `id` estável do item no inventário de esquadrão (sempre presente
 * — gerado no `POST /campanha/:id/inventario/item`). Sem `quantidade`, transfere o item inteiro.
 */
export interface FichaInventarioItemPegarDto {
  readonly fichaId: number;
  readonly campanhaItemId: string;
  readonly quantidade?: number;
}

/**
 * Entrada de "mandar pra base" um item do inventário da ficha — o `fichaId` vem do `@Param`.
 * `indice` é a posição do item em `ficha.dados.inventario.itens` **no momento da leitura desta
 * requisição** (mesmo endereçamento por posição que `ficha-inventario.component.ts` já usa no
 * frontend — `CarrinhoItemDto.id` só existe em containers de sub-inventário, m3-44, não em
 * itens comuns). Sem `quantidade`, transfere o item inteiro. Bloqueado se o item estiver
 * `equipado: true`.
 */
export interface FichaInventarioItemMandarParaBaseDto {
  readonly fichaId: number;
  readonly indice: number;
  readonly quantidade?: number;
}

/**
 * Entrada interna de `FichaRepository.alterarInventario` — `UPDATE` dedicado só a `dados` (fora
 * do `alterarFicha` genérico, que também mexe em `nome`/`cor`/`oculta` e roda validação de
 * identidade/contrato que não se aplica a uma transferência de item — mesmo raciocínio de
 * `FichaImagemInternoAlterarDto`/`alterarImagem`). Só service ↔ repository.
 */
export interface FichaInventarioInternoAlterarDto {
  readonly id: number;
  readonly dados: FichaJogadorDadosDto;
}
```

- [ ] **Step 2: Criar o arquivo de teste do repositório (`alterarInventario`)**

Não existe `ficha.repository.spec.ts` hoje (só `campanha.repository.spec.ts` tem suíte de repositório). Crie o arquivo, no mesmo estilo:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';
import { FichaRepository } from './ficha.repository';

describe('FichaRepository', () => {
  it('alterarInventario regrava só dados e devolve a ficha atualizada', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 5,
          campanhaId: 3,
          usuarioId: 10,
          nome: 'Agente Alfa',
          cor: null,
          imagemUrl: null,
          oculta: false,
          dados: { inventario: { itens: [], amplificadores: [] } },
        },
      ],
    });
    const repositorio = new FichaRepository({ raw } as unknown as Knex);
    const dados = { inventario: { itens: [], amplificadores: [] } } as never;

    const resultado = await repositorio.alterarInventario({ id: 5, dados });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SET dados = :dados::jsonb');
    expect(sql).not.toContain('nome = :nome');
    expect(sql).toContain('WHERE id = :id AND is_deleted = false');
    expect(parametros).toEqual({ id: 5, dados: JSON.stringify(dados) });
    expect(resultado.id).toBe(5);
  });
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npm run test --workspace=backend -- src/modules/ficha/ficha.repository.spec.ts`
Expected: FAIL — `alterarInventario is not a function`.

- [ ] **Step 4: Implementar no repositório**

Em `backend/src/modules/ficha/ficha.repository.ts`, adicione perto de `alterarImagem`:

```ts
  /**
   * `UPDATE` dedicado só para `dados` (transferência de item do inventário de esquadrão) — fora
   * do `alterarFicha` genérico, que também mexe em `nome`/`cor`/`oculta` e roda validação de
   * identidade/contrato que não se aplica aqui (mesmo raciocínio de `alterarImagem`).
   */
  async alterarInventario(dto: FichaInventarioInternoAlterarDto): Promise<FichaRecuperadaDto> {
    const [fichaAlterada] = await this.executarConsulta<FichaRecuperadaDto>(
      `UPDATE ficha
       SET dados = :dados::jsonb, updated_date = NOW()
       WHERE id = :id AND is_deleted = false
       RETURNING id, campanha_id AS "campanhaId", usuario_id AS "usuarioId", nome, cor, imagem_url AS "imagemUrl",
                 COALESCE(oculta, false) AS oculta, dados`,
      { id: dto.id, dados: JSON.stringify(dto.dados) },
    );
    return fichaAlterada;
  }
```

Adicione `FichaInventarioInternoAlterarDto` ao bloco de imports do topo do arquivo.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm run test --workspace=backend -- src/modules/ficha/ficha.repository.spec.ts`
Expected: PASS.

- [ ] **Step 6: Escrever os testes da service**

Em `backend/src/modules/ficha/ficha.service.spec.ts`, localize o `beforeEach` que instancia `FichaService` (dublês de `fichaRepositorio`/`campanhaRepositorio`/`campanhaGateway`/`armazenamentoProvedor`, usuários fixture já declarados nas linhas 169-171: `usuarioDono`, `usuarioMestre`, `usuarioMembro`) e:
1. adicione um dublê `campanhaServiceDublado = { validarAcessoInventario: vi.fn() }` e passe-o como novo argumento do construtor, na posição definida no Step 8 abaixo: `service = new FichaService(fichaRepositorio as never, campanhaRepositorio as never, campanhaServiceDublado as never, campanhaGateway as never, armazenamentoProvedor as never);`;
2. adicione `alterarInventario: vi.fn(),` ao dublê de `fichaRepositorio`;
3. adicione `recuperarInventario: vi.fn(), alterarInventario: vi.fn(),` ao dublê de `campanhaRepositorio`;
4. adicione `emitirInventarioAlterado: vi.fn(),` ao dublê de `campanhaGateway`.

No fim do arquivo:

```ts
  describe('pegarItemInventario', () => {
    const fichaComInventarioVazio = {
      id: 5,
      campanhaId: 3,
      usuarioId: 10,
      nome: 'Agente Alfa',
      cor: null,
      imagemUrl: null,
      oculta: false,
      dados: { inventario: { itens: [], amplificadores: [] } },
    } as never;

    it('transfere o item inteiro da campanha pra ficha quando quantidade não é informada', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComInventarioVazio);
      campanhaServiceDublado.validarAcessoInventario.mockResolvedValue(undefined);
      campanhaRepositorio.recuperarInventario.mockResolvedValue([
        { id: 'item-1', nome: 'Kit Médico', categoria: ItemCategoriaEnum.MEDICINAL, custo: 10, peso: 1, quantidade: 2 },
      ]);
      fichaRepositorio.alterarInventario.mockResolvedValue({ ...fichaComInventarioVazio });
      campanhaRepositorio.alterarInventario.mockResolvedValue({ itens: [] });

      await service.pegarItemInventario(
        { fichaId: 5, campanhaItemId: 'item-1' },
        usuarioDono,
      );

      expect(campanhaServiceDublado.validarAcessoInventario).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuarioDono.sub,
      });
      expect(fichaRepositorio.alterarInventario).toHaveBeenCalledWith({
        id: 5,
        dados: {
          inventario: {
            itens: [expect.objectContaining({ nome: 'Kit Médico', quantidade: 2, guardada: true })],
            amplificadores: [],
          },
        },
      });
      expect(campanhaRepositorio.alterarInventario).toHaveBeenCalledWith({ campanhaId: 3, itens: [] });
      expect(campanhaGateway.emitirInventarioAlterado).toHaveBeenCalledWith({ campanhaId: 3 });
    });

    it('transfere só a quantidade pedida, mantendo o resto no inventário de esquadrão', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComInventarioVazio);
      campanhaServiceDublado.validarAcessoInventario.mockResolvedValue(undefined);
      campanhaRepositorio.recuperarInventario.mockResolvedValue([
        { id: 'item-1', nome: 'Munição 9mm', categoria: ItemCategoriaEnum.MUNICOES, custo: 1, peso: 0.1, quantidade: 40 },
      ]);
      fichaRepositorio.alterarInventario.mockResolvedValue({ ...fichaComInventarioVazio });
      campanhaRepositorio.alterarInventario.mockResolvedValue({ itens: [] });

      await service.pegarItemInventario(
        { fichaId: 5, campanhaItemId: 'item-1', quantidade: 10 },
        usuarioDono,
      );

      expect(campanhaRepositorio.alterarInventario).toHaveBeenCalledWith({
        campanhaId: 3,
        itens: [expect.objectContaining({ id: 'item-1', quantidade: 30 })],
      });
    });

    it('lança UnauthorizedAccessException quando a ficha não é do usuário', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComInventarioVazio);

      await expect(
        service.pegarItemInventario({ fichaId: 5, campanhaItemId: 'item-1' }, usuarioMembro),
      ).rejects.toThrow(UnauthorizedAccessException);
      expect(campanhaServiceDublado.validarAcessoInventario).not.toHaveBeenCalled();
    });

    it('lança BusinessException quando a quantidade pedida excede o disponível', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComInventarioVazio);
      campanhaServiceDublado.validarAcessoInventario.mockResolvedValue(undefined);
      campanhaRepositorio.recuperarInventario.mockResolvedValue([
        { id: 'item-1', nome: 'Munição', categoria: ItemCategoriaEnum.MUNICOES, custo: 1, peso: 0.1, quantidade: 5 },
      ]);

      await expect(
        service.pegarItemInventario({ fichaId: 5, campanhaItemId: 'item-1', quantidade: 6 }, usuarioDono),
      ).rejects.toThrow(BusinessException);
      expect(fichaRepositorio.alterarInventario).not.toHaveBeenCalled();
    });
  });

  describe('mandarItemInventarioParaBase', () => {
    const fichaComItem = {
      id: 5,
      campanhaId: 3,
      usuarioId: 10,
      nome: 'Agente Alfa',
      cor: null,
      imagemUrl: null,
      oculta: false,
      dados: {
        inventario: {
          itens: [
            { nome: 'Colete Reserva', categoria: ItemCategoriaEnum.PROTECOES, custo: 20, peso: 3, quantidade: 1, guardada: true, modificacoes: [] },
          ],
          amplificadores: [],
        },
      },
    } as never;

    it('transfere o item da ficha pro inventário de esquadrão', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComItem);
      campanhaServiceDublado.validarAcessoInventario.mockResolvedValue(undefined);
      campanhaRepositorio.recuperarInventario.mockResolvedValue([]);
      fichaRepositorio.alterarInventario.mockResolvedValue({ ...fichaComItem });
      campanhaRepositorio.alterarInventario.mockResolvedValue({ itens: [] });

      await service.mandarItemInventarioParaBase({ fichaId: 5, indice: 0 }, usuarioDono);

      expect(fichaRepositorio.alterarInventario).toHaveBeenCalledWith({
        id: 5,
        dados: { inventario: { itens: [], amplificadores: [] } },
      });
      expect(campanhaRepositorio.alterarInventario).toHaveBeenCalledWith({
        campanhaId: 3,
        itens: [expect.objectContaining({ nome: 'Colete Reserva', quantidade: 1 })],
      });
      const itemNovo = (campanhaRepositorio.alterarInventario.mock.calls[0]![0] as { itens: { id: string }[] }).itens[0];
      expect(typeof itemNovo.id).toBe('string');
    });

    it('lança BusinessException quando o item está equipado', async () => {
      const fichaComItemEquipado = {
        ...fichaComItem,
        dados: {
          inventario: {
            itens: [{ ...fichaComItem.dados.inventario.itens[0], equipado: true }],
            amplificadores: [],
          },
        },
      } as never;
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComItemEquipado);
      campanhaServiceDublado.validarAcessoInventario.mockResolvedValue(undefined);

      await expect(
        service.mandarItemInventarioParaBase({ fichaId: 5, indice: 0 }, usuarioDono),
      ).rejects.toThrow(BusinessException);
      expect(fichaRepositorio.alterarInventario).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando o índice está fora dos limites', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComItem);
      campanhaServiceDublado.validarAcessoInventario.mockResolvedValue(undefined);

      await expect(
        service.mandarItemInventarioParaBase({ fichaId: 5, indice: 9 }, usuarioDono),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
```

- [ ] **Step 7: Rodar e confirmar que falham**

Run: `npm run test --workspace=backend -- src/modules/ficha/ficha.service.spec.ts`
Expected: FAIL — `service.pegarItemInventario`/`mandarItemInventarioParaBase` inexistentes, e o construtor com um argumento a mais quebra a instanciação atual.

- [ ] **Step 8: Implementar na service**

Em `backend/src/modules/ficha/ficha.service.ts`:

1. Adicione ao import de `../campanha/campanha.repository`: nada muda; adicione uma linha nova `import { CampanhaService } from '../campanha/campanha.service';`.
2. Adicione `CarrinhoItemDto` ao import de `@contratados-rpg/shared/regras/compras` (junto de `calcularResumoCompras`): `import { calcularResumoCompras, type CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';`.
3. Adicione `FichaInventarioInternoAlterarDto`, `FichaInventarioItemMandarParaBaseDto`, `FichaInventarioItemPegarDto` ao bloco de imports de tipos de `@contratados-rpg/shared/dtos/ficha`.
4. Adicione `CampanhaInventarioItemDto` ao import de `@contratados-rpg/shared/dtos/campanha` (crie o import se ainda não existir nesse arquivo).
5. Altere o construtor:

```ts
  constructor(
    private readonly fichaRepositorio: FichaRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
    private readonly campanhaService: CampanhaService,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
    @Inject(ARMAZENAMENTO_PROVEDOR)
    private readonly armazenamentoProvedor: ArmazenamentoProvedor,
  ) {}
```

6. Adicione os dois métodos novos (perto de `alterarFicha`):

```ts
  /**
   * "Pegar" um item do inventário de esquadrão pra própria ficha (§ inventário de esquadrão) —
   * só o dono da ficha pode (não o mestre em nome de outro jogador: quem recebe o item decide).
   * Reusa o gate único de acesso ao inventário (`CampanhaService.validarAcessoInventario` —
   * proibição #28). Sem `quantidade`, transfere o item inteiro; com `quantidade`, subtrai do lado
   * da campanha e soma só essa parte à ficha. `ResourceNotFoundException` se a ficha ou o item da
   * campanha não existirem; `UnauthorizedAccessException` se a ficha não for do autenticado ou
   * ele não tiver acesso ao inventário (gate); `BusinessException` se a ficha não tiver campanha
   * ou a quantidade pedida for inválida.
   */
  async pegarItemInventario(
    dto: FichaInventarioItemPegarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.fichaId });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }
    if (fichaEncontrada.usuarioId !== usuarioAtivo.sub) {
      throw new UnauthorizedAccessException();
    }
    if (fichaEncontrada.campanhaId === null) {
      throw new BusinessException('Ficha sem campanha não tem inventário de esquadrão');
    }

    await this.campanhaService.validarAcessoInventario({
      campanhaId: fichaEncontrada.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });

    const itensCampanha = await this.campanhaRepositorio.recuperarInventario({
      campanhaId: fichaEncontrada.campanhaId,
    });
    const itemCampanha = itensCampanha.find((item) => item.id === dto.campanhaItemId);
    if (!itemCampanha) {
      throw new ResourceNotFoundException('Item do inventário de esquadrão');
    }

    const quantidadeTransferida = dto.quantidade ?? itemCampanha.quantidade;
    if (quantidadeTransferida <= 0 || quantidadeTransferida > itemCampanha.quantidade) {
      throw new BusinessException('Quantidade inválida para transferência');
    }

    const itensCampanhaAtualizados =
      quantidadeTransferida === itemCampanha.quantidade
        ? itensCampanha.filter((item) => item.id !== itemCampanha.id)
        : itensCampanha.map((item) =>
            item.id === itemCampanha.id
              ? { ...item, quantidade: item.quantidade - quantidadeTransferida }
              : item,
          );

    const itemParaFicha: CarrinhoItemDto = {
      nome: itemCampanha.nome,
      categoria: itemCampanha.categoria,
      custo: itemCampanha.custo,
      peso: itemCampanha.peso,
      quantidade: quantidadeTransferida,
      guardada: true,
      descricao: itemCampanha.descricao,
      dano: itemCampanha.dano,
      informacao: itemCampanha.informacao,
      resistencia: itemCampanha.resistencia,
      bonus: itemCampanha.bonus,
      modificacoes: [],
    };

    const fichaAlterada = await this.fichaRepositorio.alterarInventario({
      id: dto.fichaId,
      dados: {
        ...fichaEncontrada.dados,
        inventario: {
          ...fichaEncontrada.dados.inventario,
          itens: [...fichaEncontrada.dados.inventario.itens, itemParaFicha],
        },
      },
    });
    await this.campanhaRepositorio.alterarInventario({
      campanhaId: fichaEncontrada.campanhaId,
      itens: itensCampanhaAtualizados,
    });

    this.campanhaGateway.emitirFichaAlterada(fichaAlterada);
    this.campanhaGateway.emitirInventarioAlterado({ campanhaId: fichaEncontrada.campanhaId });

    return fichaAlterada;
  }

  /**
   * "Mandar pra base" um item do inventário da própria ficha (§ inventário de esquadrão) — o
   * `indice` endereça a posição em `dados.inventario.itens` (mesmo endereçamento por posição do
   * `ficha-inventario.component.ts`, já que `CarrinhoItemDto.id` só existe em containers de
   * sub-inventário). Bloqueado se o item estiver `equipado: true` (precisa desequipar primeiro).
   * Mesmas exceptions de `pegarItemInventario`; `ResourceNotFoundException` também para índice
   * fora dos limites do array atual.
   */
  async mandarItemInventarioParaBase(
    dto: FichaInventarioItemMandarParaBaseDto,
    usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    const fichaEncontrada = await this.fichaRepositorio.recuperarPorId({ id: dto.fichaId });
    if (!fichaEncontrada) {
      throw new ResourceNotFoundException('Ficha');
    }
    if (fichaEncontrada.usuarioId !== usuarioAtivo.sub) {
      throw new UnauthorizedAccessException();
    }
    if (fichaEncontrada.campanhaId === null) {
      throw new BusinessException('Ficha sem campanha não tem inventário de esquadrão');
    }

    await this.campanhaService.validarAcessoInventario({
      campanhaId: fichaEncontrada.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });

    const itensFicha = fichaEncontrada.dados.inventario.itens;
    const itemOrigem = itensFicha[dto.indice];
    if (!itemOrigem) {
      throw new ResourceNotFoundException('Item do inventário da ficha');
    }
    if (itemOrigem.equipado) {
      throw new BusinessException('Desequipe o item antes de mandá-lo para a base');
    }

    const quantidadeTransferida = dto.quantidade ?? itemOrigem.quantidade;
    if (quantidadeTransferida <= 0 || quantidadeTransferida > itemOrigem.quantidade) {
      throw new BusinessException('Quantidade inválida para transferência');
    }

    const itensFichaAtualizados =
      quantidadeTransferida === itemOrigem.quantidade
        ? itensFicha.filter((_item, indiceAtual) => indiceAtual !== dto.indice)
        : itensFicha.map((item, indiceAtual) =>
            indiceAtual === dto.indice ? { ...item, quantidade: item.quantidade - quantidadeTransferida } : item,
          );

    const itensCampanha = await this.campanhaRepositorio.recuperarInventario({
      campanhaId: fichaEncontrada.campanhaId,
    });
    const itemNovoCampanha: CampanhaInventarioItemDto = {
      id: randomUUID(),
      nome: itemOrigem.nome,
      categoria: itemOrigem.categoria,
      custo: itemOrigem.custo,
      peso: itemOrigem.peso,
      quantidade: quantidadeTransferida,
      descricao: itemOrigem.descricao,
      dano: itemOrigem.dano,
      informacao: itemOrigem.informacao,
      resistencia: itemOrigem.resistencia,
      bonus: itemOrigem.bonus,
    };

    const fichaAlterada = await this.fichaRepositorio.alterarInventario({
      id: dto.fichaId,
      dados: {
        ...fichaEncontrada.dados,
        inventario: { ...fichaEncontrada.dados.inventario, itens: itensFichaAtualizados },
      },
    });
    await this.campanhaRepositorio.alterarInventario({
      campanhaId: fichaEncontrada.campanhaId,
      itens: [...itensCampanha, itemNovoCampanha],
    });

    this.campanhaGateway.emitirFichaAlterada(fichaAlterada);
    this.campanhaGateway.emitirInventarioAlterado({ campanhaId: fichaEncontrada.campanhaId });

    return fichaAlterada;
  }
```

7. Adicione `import { randomUUID } from 'node:crypto';` no topo do arquivo (junto dos demais imports de `node:`).

- [ ] **Step 9: Rodar e confirmar que passam**

Run: `npm run test --workspace=backend -- src/modules/ficha/ficha.service.spec.ts`
Expected: PASS.

- [ ] **Step 10: Adicionar as rotas na controller**

Em `backend/src/modules/ficha/ficha.controller.ts`, adicione (perto de `atribuirCampanha`):

```ts
  @Post(':id/inventario/item/pegar')
  pegarItemInventario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<FichaInventarioItemPegarDto, 'fichaId'>,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    return this.fichaService.pegarItemInventario({ ...dto, fichaId: id }, usuarioAtivo);
  }

  @Post(':id/inventario/item/mandar-para-base')
  mandarItemInventarioParaBase(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<FichaInventarioItemMandarParaBaseDto, 'fichaId'>,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    return this.fichaService.mandarItemInventarioParaBase({ ...dto, fichaId: id }, usuarioAtivo);
  }
```

Adicione `FichaInventarioItemMandarParaBaseDto`, `FichaInventarioItemPegarDto`, `FichaRecuperadaDto` (se ainda não importado) ao bloco de imports do topo do arquivo.

- [ ] **Step 11: Rodar a suíte inteira do backend**

Run: `npm run test --workspace=backend`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add shared/src/dtos/ficha/ficha-operacao.dtos.ts \
  backend/src/modules/ficha/ficha.repository.ts \
  backend/src/modules/ficha/ficha.repository.spec.ts \
  backend/src/modules/ficha/ficha.service.ts \
  backend/src/modules/ficha/ficha.service.spec.ts \
  backend/src/modules/ficha/ficha.controller.ts
git commit -m "feat(ficha): transferência de item com o inventário de esquadrão (pegar/mandar pra base)"
```

---

## Próximos passos (fora deste plano)

Depois deste plano executado e mergeado, um plano de **frontend** consome este contrato: card de estado clicável no cabeçalho da campanha, drawer do Mestre (mesmo padrão de `app-historico-rolagens-sidebar`), troca de conteúdo da coluna lateral do Jogador, e os botões "Pegar"/"Mandar pra base" nos dois lados — conforme `docs/superpowers/specs/2026-08-12-inventario-de-esquadrao-design.md` §3.
