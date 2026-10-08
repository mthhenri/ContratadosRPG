# Equipe completa e ficha oculta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na visão de jogador, a lista "Equipe" passa a mostrar todo mundo da campanha (mesmo sem ficha visível), com uma "carteirinha" (nome/classe/foto) pra fichas sem acesso completo; o dono de uma ficha ganha um toggle "Ocultar ficha de outros jogadores" que a esconde completamente (nem carteirinha) de qualquer um além dele e do mestre.

**Architecture:** Nova coluna `ficha.oculta` (nullable, sem `DEFAULT`) persistida pelo `PUT /ficha/:id` genérico já existente (mesmo caminho de `cor`). `GET /campanha/:id/membros` ganha um campo novo por membro (`fichas: CampanhaMembroFichaResumoDto[]`) computado no `CampanhaRepository`, que decide por ficha se o requisitante vê completo (`acessoCompleto: true`) ou só a carteirinha — `GET /ficha?campanhaId=` **não muda**. O frontend cruza esse resumo novo com os dados completos que já tinha (`fichasPorMembro`) pra decidir o que renderizar por ficha.

**Tech Stack:** NestJS + Knex (SQL bruto, sem ORM) no backend; Angular 21 (signals/`@if`/`@for`) no frontend; Vitest (`vi.fn`) nos dois lados.

## Global Constraints

- Migration nova sempre `NNNN - Descrição.sql` em `backend/src/database/migrations/`, coluna `BOOLEAN` nullable **sem** `DEFAULT` (convenção do projeto — "proibição #7").
- DTOs seguem `Entidade + Complemento? + Verbo + Dto`; `Interno` só trafega entre service ↔ repository.
- Nunca `DELETE` físico; toda query filtra `is_deleted = false`.
- A carteirinha (ficha sem acesso completo) é **puramente visual** — sem afford­ance de "pedir acesso" (decisão explícita do autor).
- Sem `class-validator`/DTOs como classe — seguem interface.

---

### Task 1: Coluna `ficha.oculta` + DTOs compartilhados

**Files:**
- Create: `backend/src/database/migrations/0014 - Ficha oculta.sql`
- Modify: `shared/src/dtos/ficha/ficha-operacao.dtos.ts` (`FichaRecuperadaDto`, `FichaAlterarDto`, `FichaAlteradaDto`, `FichaInternoAlterarDto`)
- Modify (fixtures, só pra manter o build verde — `oculta` fica obrigatório em `FichaRecuperadaDto`/`FichaAlteradaDto`):
  - `backend/src/modules/ficha/ficha.service.spec.ts:171-179` (`fichaPersistida`)
  - `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts` (3 literais: `recuperada` ~L88-96, `rico` ~L396-403, `remota` ~L879-887)
  - `frontend/src/app/modules/ficha/ficha.service.spec.ts:95` (`recuperada`) e `:108` (`alterada`)

**Interfaces:**
- Produces: `FichaRecuperadaDto.oculta: boolean`, `FichaAlteradaDto.oculta: boolean`, `FichaAlterarDto.oculta?: boolean`, `FichaInternoAlterarDto.oculta?: boolean` — consumidos por Task 2 (persistência) e Task 4 (UI).

- [ ] **Step 1: Criar a migration**

```sql
-- Migration M3 (m3-65) — ficha oculta. Dono esconde a própria ficha de qualquer outro jogador
-- (nem carteirinha aparece — ver CampanhaRepository.listarMembros); mestre e o próprio dono
-- continuam vendo normal. Coluna relacional (ao lado de `nome`/`cor`), nunca dentro do JSONB
-- `dados` — mesma regra de identidade/posse. Nullable e sem `DEFAULT` (proibição #7): ficha
-- existente nasce sem a flag, tratada como `false` na leitura (`COALESCE`).

-- UP

ALTER TABLE ficha ADD COLUMN oculta BOOLEAN;

-- DOWN

ALTER TABLE ficha DROP COLUMN IF EXISTS oculta;
```

- [ ] **Step 2: Rodar a migration**

Run: `cd backend && npm run migrate` (ou o script equivalente já usado no projeto — conferir `package.json`)
Expected: migration `0014` aplicada sem erro.

- [ ] **Step 3: Adicionar `oculta` aos DTOs compartilhados**

Em `shared/src/dtos/ficha/ficha-operacao.dtos.ts`:

```ts
export interface FichaRecuperadaDto {
  readonly id: number;
  readonly campanhaId: number | null;
  readonly usuarioId: number;
  readonly nome: string;
  readonly cor: string | null;
  readonly imagemUrl: string | null;
  /** Ficha oculta (m3-65) — `true` some completamente de qualquer jogador que não seja o dono ou o mestre. */
  readonly oculta: boolean;
  readonly dados: FichaJogadorDadosDto;
}
```

```ts
export interface FichaAlterarDto {
  readonly nome: string;
  readonly cor?: string | null;
  /** Ficha oculta (m3-65) — ver {@link FichaRecuperadaDto.oculta}. Ausente equivale a `false`. */
  readonly oculta?: boolean;
  readonly dados: FichaJogadorDadosDto;
}
```

```ts
export interface FichaAlteradaDto {
  readonly id: number;
  readonly campanhaId: number | null;
  readonly usuarioId: number;
  readonly nome: string;
  readonly cor: string | null;
  readonly imagemUrl: string | null;
  /** Ficha oculta (m3-65) — ver {@link FichaRecuperadaDto.oculta}. */
  readonly oculta: boolean;
  readonly dados: FichaJogadorDadosDto;
}
```

```ts
export interface FichaInternoAlterarDto {
  readonly id: number;
  readonly nome: string;
  readonly cor?: string | null;
  /** Ficha oculta (m3-65) — ver {@link FichaRecuperadaDto.oculta}. Ausente equivale a `false`. */
  readonly oculta?: boolean;
  readonly dados: FichaJogadorDadosDto;
}
```

- [ ] **Step 4: Corrigir os fixtures existentes pra compilar**

Em `backend/src/modules/ficha/ficha.service.spec.ts`, no objeto `fichaPersistida` (L171-179), adicionar `oculta: false,` logo após `imagemUrl: null,`.

Em `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts`, nos três literais (`recuperada`, `rico`, `remota`), adicionar `oculta: false,` logo após cada `imagemUrl: null,`.

Em `frontend/src/app/modules/ficha/ficha.service.spec.ts`, nos literais `recuperada` (L95) e `alterada` (L108), adicionar `oculta: false` logo após `imagemUrl: null`.

- [ ] **Step 5: Rodar as duas suítes pra confirmar que voltaram a compilar/passar**

Run: `cd backend && npm test`
Run: `cd frontend && npx ng test --watch=false`
Expected: PASS nos dois — nenhuma mudança de comportamento ainda, só o campo novo presente nos fixtures.

- [ ] **Step 6: Commit**

```bash
git add backend/src/database/migrations/"0014 - Ficha oculta.sql" shared/src/dtos/ficha/ficha-operacao.dtos.ts backend/src/modules/ficha/ficha.service.spec.ts frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts frontend/src/app/modules/ficha/ficha.service.spec.ts
git commit -m "feat(ficha): coluna oculta + DTOs (m3-65)"
```

---

### Task 2: Backend persiste `oculta`

**Files:**
- Modify: `backend/src/modules/ficha/ficha.repository.ts` (`recuperarPorId`, `alterarFicha`)
- Modify: `backend/src/modules/ficha/ficha.service.spec.ts` (novo teste em `describe('alterarFicha')`)

**Interfaces:**
- Consumes: `FichaInternoAlterarDto.oculta?: boolean` (Task 1).
- Produces: `FichaRepository.recuperarPorId`/`alterarFicha` agora devolvem `oculta: boolean` dentro de `FichaRecuperadaDto` — consumido por Task 4 (o frontend lê `ficha().oculta` pra marcar o toggle).

`FichaService.alterarFicha` **não muda** — já repassa o `dto` inteiro pro repositório (`this.fichaRepositorio.alterarFicha(dto)`), sem lógica própria de validação pra `oculta` (não é como `cor`, que tem `validarCor` — `oculta` é só um boolean).

- [ ] **Step 1: Escrever o teste (repositório dublado) que prova o passthrough**

Em `backend/src/modules/ficha/ficha.service.spec.ts`, dentro de `describe('alterarFicha', ...)`, logo após o primeiro `it('altera a ficha quando o autor é o dono', ...)` (L1135-1152):

```ts
    it('repassa oculta ao repositório quando informado', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      const fichaAlterada = { ...fichaPersistida, oculta: true };
      fichaRepositorio.alterarFicha.mockResolvedValue(fichaAlterada);

      const resultado = await service.alterarFicha(
        { id: 5, nome: 'Agente Alfa', oculta: true, dados: criarDados() },
        usuarioDono,
      );

      expect(fichaRepositorio.alterarFicha).toHaveBeenCalledWith({
        id: 5,
        nome: 'Agente Alfa',
        oculta: true,
        dados: criarDados(),
      });
      expect(resultado.oculta).toBe(true);
    });
```

- [ ] **Step 2: Rodar e confirmar que passa (a service já repassa o dto inteiro — não deveria falhar)**

Run: `cd backend && npx vitest run src/modules/ficha/ficha.service.spec.ts`
Expected: PASS (a service não precisa de mudança nenhuma pra esse teste passar — ele documenta o comportamento existente estendido ao campo novo).

- [ ] **Step 3: Persistir `oculta` no repositório — `recuperarPorId`**

Em `backend/src/modules/ficha/ficha.repository.ts`, método `recuperarPorId` (L71-80):

```ts
  /** Recupera a ficha ativa pelo `id` (ou `null`) — inclui posse/campanha para a checagem de permissão. */
  async recuperarPorId(dto: FichaRecuperarDto): Promise<FichaRecuperadaDto | null> {
    const [fichaEncontrada] = await this.executarConsulta<FichaRecuperadaDto>(
      `SELECT id, campanha_id AS "campanhaId", usuario_id AS "usuarioId", nome, cor, imagem_url AS "imagemUrl",
              COALESCE(oculta, false) AS oculta, dados
       FROM ficha
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id },
    );
    return fichaEncontrada ?? null;
  }
```

- [ ] **Step 4: Persistir `oculta` no repositório — `alterarFicha`**

No mesmo arquivo, método `alterarFicha` (L284-293):

```ts
  /**
   * Altera `nome`, `oculta` (m3-65) e o documento de jogo `dados` (cast `::jsonb`) da ficha e
   * retorna os dados atualizados. Só toca ficha ativa (`WHERE is_deleted = false`), sem `DEFAULT`.
   */
  async alterarFicha(dto: FichaInternoAlterarDto): Promise<FichaRecuperadaDto> {
    const [fichaAlterada] = await this.executarConsulta<FichaRecuperadaDto>(
      `UPDATE ficha
       SET nome = :nome, cor = :cor, oculta = :oculta, dados = :dados::jsonb, updated_date = NOW()
       WHERE id = :id AND is_deleted = false
       RETURNING id, campanha_id AS "campanhaId", usuario_id AS "usuarioId", nome, cor, imagem_url AS "imagemUrl",
                 COALESCE(oculta, false) AS oculta, dados`,
      {
        id: dto.id,
        nome: dto.nome,
        cor: dto.cor ?? null,
        oculta: dto.oculta ?? false,
        dados: JSON.stringify(dto.dados),
      },
    );
    return fichaAlterada;
  }
```

- [ ] **Step 5: Rodar a suíte de backend inteira**

Run: `cd backend && npm test`
Expected: PASS. (A SQL em si não tem teste de repositório dedicado neste projeto — a cobertura de ponta a ponta fica pra verificação manual no fim do plano.)

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/ficha/ficha.repository.ts backend/src/modules/ficha/ficha.service.spec.ts
git commit -m "feat(ficha): persiste oculta no repositório (m3-65)"
```

---

### Task 3: `FichaEdicaoService.ajustarOculta`

**Files:**
- Modify: `frontend/src/app/modules/ficha/ficha-edicao.service.ts`

**Interfaces:**
- Consumes: `FichaRecuperadaDto.oculta` (Task 1), payload de `alterarFicha` (Task 2).
- Produces: `FichaEdicaoService.ajustarOculta(oculta: boolean): void` — consumido por Task 4 (`(ajusteOculta)="fichaEdicao.ajustarOculta($event)"`).

Sem teste dedicado nesta task: `FichaEdicaoService` não tem spec próprio no projeto (nem `ajustarCor`, que segue o mesmo padrão, tem um) — a cobertura vem da Task 4, que exercita o fluxo completo (checkbox → output → `fichaEdicao.ajustarOculta`) via `ficha-visualizacao.component.spec.ts`.

- [ ] **Step 1: Incluir `oculta` no payload do auto-save**

Em `frontend/src/app/modules/ficha/ficha-edicao.service.ts`, dentro de `inicializar()` (L100-105):

```ts
          return this.fichaService
            .alterarFicha(this.obterFichaId(), {
              nome: fichaAtual.nome,
              cor: fichaAtual.cor,
              oculta: fichaAtual.oculta,
              dados: fichaAtual.dados,
            })
```

- [ ] **Step 2: Adicionar `ajustarOculta`, espelhando `ajustarCor`**

Logo após `ajustarCor` (L362-369):

```ts
  /** Ficha oculta (m3-65, relacional — fora do `dados`) — mesmo padrão de {@link ajustarCor}. */
  ajustarOculta(oculta: boolean): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, oculta });
    this.agendarPersistencia();
  }
```

- [ ] **Step 3: Rodar a suíte de frontend**

Run: `cd frontend && npx ng test --watch=false`
Expected: PASS (nenhum teste novo ainda — só confirma que não quebrou nada).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/modules/ficha/ficha-edicao.service.ts
git commit -m "feat(ficha): ajustarOculta no auto-save (m3-65)"
```

---

### Task 4: Toggle "Ocultar ficha" na Identidade

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss`
- Modify: `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.html`
- Test: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`

**Interfaces:**
- Consumes: `FichaEdicaoService.ajustarOculta` (Task 3).
- Produces: `<app-ficha-visualizacao>` ganha `[oculta]` (input) e `(ajusteOculta)` (output) — só usado por `visualizar.page.html` (o `detalhe.page.html` usa `modo="compacto"`, onde `ajustavelAmplo()` já é sempre `false` e o toggle nunca aparece — não precisa de binding lá).

O toggle só existe quando `ajustavelAmplo()` é `true` (mesmo gate do avatar/cor — `ajustavel() && modo() !== 'compacto'`), então só aparece na ficha completa (`VisualizarPage`), nunca no card compacto da campanha.

- [ ] **Step 1: Escrever os testes (component isolado)**

Em `ficha-visualizacao.component.spec.ts`, após o teste `'não mostra os passos − / + de Vida/Energia quando não é ajustável (só leitura)'` (L579):

```ts
  describe('ficha oculta (m3-65)', () => {
    it('reflete oculta() no checkbox quando ajustável', () => {
      const { fixture, raiz } = montar(dados, 'Corvo', 42, true);
      fixture.componentRef.setInput('oculta', true);
      fixture.detectChanges();

      const checkbox = raiz.querySelector('.ficha-ident__oculta-entrada') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('emite ajusteOculta ao alternar o checkbox', () => {
      const { fixture, raiz } = montar(dados, 'Corvo', 42, true);
      const emitidos: boolean[] = [];
      fixture.componentInstance.ajusteOculta.subscribe((valor) => emitidos.push(valor));

      const checkbox = raiz.querySelector('.ficha-ident__oculta-entrada') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      expect(emitidos).toEqual([true]);
    });

    it('não mostra o toggle quando não é ajustável (só leitura)', () => {
      const { raiz } = montar(dados, 'Corvo', 42, false);
      expect(raiz.querySelector('.ficha-ident__oculta-entrada')).toBeNull();
    });
  });
```

- [ ] **Step 2: Rodar e confirmar que falha (input/output/template ainda não existem)**

Run: `cd frontend && npx vitest run src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`
Expected: FAIL — `checkbox` é `null` (seletor `.ficha-ident__oculta-entrada` não existe).

- [ ] **Step 3: Adicionar input/output no componente**

Em `ficha-visualizacao.component.ts`, logo após `imagemUrl` (L419):

```ts
  /** Ficha oculta (m3-65) — `true` esconde a ficha (nem carteirinha) de quem não é dono/mestre. */
  readonly oculta = input<boolean>(false);
```

Logo após `ajusteCor` (L484):

```ts
  /** Novo valor de "ficha oculta" (m3-65, relacional — fora do `dados`) — a página persiste `ficha.oculta`. */
  readonly ajusteOculta = output<boolean>();
```

- [ ] **Step 4: Adicionar o toggle no template, dentro do bloco editável do avatar**

Em `ficha-visualizacao.component.html`, dentro de `@if (ajustavelAmplo())` (L93-132), logo após o bloco `@if (erroImagem(); as mensagemErro)` (L129-131) e antes do fechamento de `.ficha-ident__avatar-coluna` (L132):

```html
              <label class="ficha-ident__oculta">
                <input
                  type="checkbox"
                  class="ficha-ident__oculta-entrada"
                  aria-label="Ocultar ficha de outros jogadores"
                  [checked]="oculta()"
                  (change)="ajusteOculta.emit($any($event.target).checked)"
                />
                Ocultar ficha de outros jogadores
              </label>
```

- [ ] **Step 5: Estilizar o toggle**

Em `ficha-visualizacao.component.scss`, próximo às regras de `.ficha-ident__avatar-coluna`:

```scss
.ficha-ident__oculta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-mute);
  cursor: pointer;
}

.ficha-ident__oculta-entrada {
  accent-color: var(--accent);
  cursor: pointer;
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`
Expected: PASS.

- [ ] **Step 7: Ligar o toggle na ficha completa (`VisualizarPage`)**

Em `visualizar.page.html`, ao lado de `[cor]` (L164) e `(ajusteCor)` (L180):

```html
      [cor]="fichaAtual.cor"
      [imagemUrl]="fichaAtual.imagemUrl"
      [oculta]="fichaAtual.oculta"
```

```html
      (ajusteCor)="fichaEdicao.ajustarCor($event)"
      (ajusteOculta)="fichaEdicao.ajustarOculta($event)"
```

- [ ] **Step 8: Rodar a suíte de frontend inteira**

Run: `cd frontend && npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.html
git commit -m "feat(ficha): toggle Ocultar ficha na Identidade (m3-65)"
```

---

### Task 5: `listarMembros` devolve carteirinha por ficha

**Files:**
- Modify: `shared/src/dtos/campanha/campanha.dtos.ts`
- Modify: `backend/src/modules/campanha/campanha.repository.ts`
- Modify: `backend/src/modules/campanha/campanha.service.ts`
- Modify: `backend/src/modules/campanha/campanha.service.spec.ts`

**Interfaces:**
- Produces: `CampanhaMembroResumoDto.fichas: readonly CampanhaMembroFichaResumoDto[]` — consumido por Task 6 (frontend). `CampanhaMembroFichaResumoDto = { id, nome, classe, arquetipo, imagemUrl, acessoCompleto }`.

- [ ] **Step 1: Adicionar os DTOs**

Em `shared/src/dtos/campanha/campanha.dtos.ts`, ajustar o import do topo:

```ts
import type { ArquetipoEnum, ClasseEnum } from '../../enums';
import type { TipoCampanhaMembroPapelEnum } from '../../enums';
```

Substituir `CampanhaMembroResumoDto` (L199-207):

```ts
/**
 * Ficha de um membro, no recorte mínimo pra Equipe (m3-65): quando `acessoCompleto` é `false`,
 * é só a "carteirinha" — nome/classe/foto, sem vida/energia/etc. (esses continuam vindo, pra quem
 * tem acesso completo, de `GET /ficha?campanhaId=`, que não muda). Fichas marcadas `oculta` por um
 * jogador que não seja o dono/mestre requisitante nem entram nesta lista — não tem carteirinha.
 */
export interface CampanhaMembroFichaResumoDto {
  readonly id: number;
  readonly nome: string;
  readonly classe: ClasseEnum;
  readonly arquetipo: ArquetipoEnum | null;
  readonly imagemUrl: string | null;
  /** `true` quando o requisitante enxerga a ficha completa (dono, mestre, ou concessão ativa). */
  readonly acessoCompleto: boolean;
}

/**
 * Item de listagem de membros — o usuário membro da campanha com o `papel` dele nela
 * (`MESTRE`/`JOGADOR`, `codigo` traduzido de `tipo_campanha_membro_papel` no SQL) e as fichas
 * dele visíveis ao requisitante (m3-65 — sempre todos os membros, ficha ou não).
 */
export interface CampanhaMembroResumoDto {
  readonly usuarioId: number;
  readonly nome: string;
  readonly papel: TipoCampanhaMembroPapelEnum;
  readonly fichas: readonly CampanhaMembroFichaResumoDto[];
}

/**
 * Entrada interna da listagem de membros (m3-65) — o `usuarioAtivoId`/`usuarioAtivoEhMestre` vêm
 * da service (que já resolveu o papel do requisitante pra validar a permissão) e decidem, por
 * ficha, `acessoCompleto` e se uma ficha oculta de terceiro entra na lista. Só service ↔ repository.
 */
export interface CampanhaMembrosInternoListarDto {
  readonly campanhaId: number;
  readonly usuarioAtivoId: number;
  readonly usuarioAtivoEhMestre: boolean;
}
```

- [ ] **Step 2: Atualizar o repositório**

Em `backend/src/modules/campanha/campanha.repository.ts`, trocar o import de `CampanhaMembrosListarDto` por `CampanhaMembrosInternoListarDto` na lista de tipos importados, e substituir `listarMembros` (L258-277):

```ts
  /**
   * Lista os membros da campanha com `nome`/`papel` e as fichas de cada um, no recorte de
   * carteirinha (m3-65): por ficha, `acessoCompleto` é `true` pro mestre, pro dono, ou por
   * concessão ativa (`usuario_ficha_acesso`) — senão é só carteirinha. Ficha marcada `oculta`
   * de outro dono nem entra na lista (nem carteirinha), exceto pro mestre ou pro próprio dono.
   * `json_agg`/`json_build_object` porque o `pg` decodifica JSON pra objeto/array JS sozinho, sem
   * parse manual (mesmo padrão de `minhaFichaResumo` em `listarPorUsuario`). Ordena por nome.
   */
  async listarMembros(dto: CampanhaMembrosInternoListarDto): Promise<CampanhaMembroResumoDto[]> {
    return this.executarConsulta<CampanhaMembroResumoDto>(
      `SELECT usuario.id AS "usuarioId", usuario.nome,
              tipo_campanha_membro_papel.codigo AS papel,
              COALESCE(fichas_membro.fichas, '[]'::json) AS fichas
       FROM campanha_membro
       INNER JOIN usuario
         ON usuario.id = campanha_membro.usuario_id AND usuario.is_deleted = false
       INNER JOIN tipo_campanha_membro_papel
         ON tipo_campanha_membro_papel.id = campanha_membro.tipo_campanha_membro_papel_id
        AND tipo_campanha_membro_papel.is_deleted = false
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'id', ficha.id,
                    'nome', ficha.nome,
                    'classe', ficha.dados->>'classe',
                    'arquetipo', ficha.dados->>'arquetipo',
                    'imagemUrl', ficha.imagem_url,
                    'acessoCompleto', (
                      :usuarioAtivoEhMestre
                      OR ficha.usuario_id = :usuarioAtivoId
                      OR EXISTS (
                        SELECT 1 FROM usuario_ficha_acesso
                        WHERE usuario_ficha_acesso.ficha_id = ficha.id
                          AND usuario_ficha_acesso.usuario_id = :usuarioAtivoId
                          AND usuario_ficha_acesso.is_deleted = false
                      )
                    )
                  )
                  ORDER BY ficha.nome ASC
                ) AS fichas
         FROM ficha
         WHERE ficha.campanha_id = :campanhaId AND ficha.is_deleted = false
           AND ficha.usuario_id = campanha_membro.usuario_id
           AND (
             :usuarioAtivoEhMestre
             OR ficha.usuario_id = :usuarioAtivoId
             OR COALESCE(ficha.oculta, false) = false
           )
       ) fichas_membro ON true
       WHERE campanha_membro.campanha_id = :campanhaId AND campanha_membro.is_deleted = false
       ORDER BY usuario.nome ASC`,
      {
        campanhaId: dto.campanhaId,
        usuarioAtivoId: dto.usuarioAtivoId,
        usuarioAtivoEhMestre: dto.usuarioAtivoEhMestre,
      },
    );
  }
```

- [ ] **Step 3: Atualizar o teste existente de `listarMembros` (service)**

Em `backend/src/modules/campanha/campanha.service.spec.ts`, dentro de `describe('listarMembros', ...)` (L341-382), no primeiro `it` (L342-360):

```ts
    it('devolve os membros quando o usuário é membro da campanha', async () => {
      const membros = [
        {
          usuarioId: usuarioMestre.sub,
          nome: 'Matheus',
          papel: TipoCampanhaMembroPapelEnum.MESTRE,
          fichas: [],
        },
      ];
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      repositorio.listarMembros.mockResolvedValue(membros);

      const resultado = await service.listarMembros({ campanhaId: 3 }, usuarioNaoMestre);

      expect(repositorio.listarMembros).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioAtivoId: usuarioNaoMestre.sub,
        usuarioAtivoEhMestre: false,
      });
      expect(resultado).toBe(membros);
    });

    it('marca usuarioAtivoEhMestre quando quem pede é o mestre da campanha', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      repositorio.listarMembros.mockResolvedValue([]);

      await service.listarMembros({ campanhaId: 3 }, usuarioMestre);

      expect(repositorio.listarMembros).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioAtivoId: usuarioMestre.sub,
        usuarioAtivoEhMestre: true,
      });
    });
```

(os outros dois `it` do bloco — `UnauthorizedAccessException`/`ResourceNotFoundException`, L362-381 — continuam iguais, sem mudança.)

- [ ] **Step 4: Rodar e confirmar que falha**

Run: `cd backend && npx vitest run src/modules/campanha/campanha.service.spec.ts`
Expected: FAIL no primeiro teste (`toHaveBeenCalledWith({ campanhaId: 3 })` não bate mais com o novo formato) e no novo teste (`listarMembros` da service ainda não resolve o papel do requisitante).

- [ ] **Step 5: Atualizar `CampanhaService.listarMembros`**

Em `backend/src/modules/campanha/campanha.service.ts` (L206-224):

```ts
  /**
   * Lista os membros da campanha (nome/papel/fichas — m3-65). Visível a qualquer membro da
   * campanha (§14). Resolve o papel do requisitante via `recuperarMembro` (precisa dele de
   * qualquer forma, pra decidir `acessoCompleto`/carteirinha no repositório) — substitui o antigo
   * `validarMembro` só-checagem por essa mesma chamada. `ResourceNotFoundException` se a campanha
   * não existir; `UnauthorizedAccessException` se o autor não for membro.
   */
  async listarMembros(
    dto: CampanhaMembrosListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMembroResumoDto[]> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({
      id: dto.campanhaId,
    });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    const membroAtivo = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!membroAtivo) {
      throw new UnauthorizedAccessException();
    }

    return this.campanhaRepositorio.listarMembros({
      campanhaId: dto.campanhaId,
      usuarioAtivoId: usuarioAtivo.sub,
      usuarioAtivoEhMestre: membroAtivo.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    });
  }
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `cd backend && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add shared/src/dtos/campanha/campanha.dtos.ts backend/src/modules/campanha/campanha.repository.ts backend/src/modules/campanha/campanha.service.ts backend/src/modules/campanha/campanha.service.spec.ts
git commit -m "feat(campanha): listarMembros devolve carteirinha por ficha (m3-65)"
```

---

### Task 6: Equipe do jogador sempre completa, com carteirinha

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`

**Interfaces:**
- Consumes: `CampanhaMembroResumoDto.fichas` (Task 5), `ItemFicha`/`fichasPorMembro` (já existentes).

Antes de qualquer coisa nova, `fichas: []` precisa entrar em **todo** literal `CampanhaMembroResumoDto` já existente no spec (senão nem compila, o campo é obrigatório) — são 11 ocorrências:
- `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts:47` (`membrosCom`)
- `:213-214` (`membrosDois`)
- `:221-223` (`membrosTres`)
- `:252-254` (teste "ordena a coluna Membros")
- `:404-405` (teste "transfere o mestre")

- [ ] **Step 1: Corrigir os 11 literais existentes (adicionar `fichas: []`)**

`membrosCom` (L46-48):

```ts
  function membrosCom(usuarioId: number, papel: TipoCampanhaMembroPapelEnum): CampanhaMembroResumoDto[] {
    return [{ usuarioId, nome: 'Agente', papel, fichas: [] }];
  }
```

`membrosDois`/`membrosTres` (L212-224):

```ts
  const membrosDois = (): CampanhaMembroResumoDto[] => [
    { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
  ];

  const membrosTres = (): CampanhaMembroResumoDto[] => [
    { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
    { usuarioId: 3, nome: 'Colega', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
  ];
```

Teste "ordena a coluna Membros" (L249-256):

```ts
      membros: [
        { usuarioId: 2, nome: 'Zeca', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
        { usuarioId: 1, nome: 'Ômega', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
        { usuarioId: 3, nome: 'Ana', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
      ],
```

Teste "transfere o mestre" (L402-407):

```ts
      campanhaService.listarMembros.mockReturnValue(
        of([
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
          { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
        ]),
      );
```

- [ ] **Step 2: Rodar e confirmar que volta a compilar/passar (sem comportamento novo ainda)**

Run: `cd frontend && npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 3: Escrever os testes novos da Equipe**

Em `detalhe.page.spec.ts`, criar um novo `describe` (ex.: logo após o describe de "Ver como jogador", ou no fim do arquivo):

```ts
  describe('Equipe (m3-65 — completa + carteirinha)', () => {
    it('lista todo mundo, mesmo quem não tem ficha nenhuma na campanha', () => {
      const { raiz } = montar({
        usuarioId: 2,
        membros: [
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
          { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
        ],
      });

      const nomes = Array.from(raiz.querySelectorAll('.detalhe__equipe-nome')).map((el) =>
        el.textContent?.trim(),
      );
      expect(nomes).toEqual(['Mestre', 'Jogador']);
      expect(raiz.querySelectorAll('.detalhe__equipe-vazio')).toHaveLength(2);
    });

    it('mostra carteirinha (sem botão) pra ficha de colega sem acesso completo', () => {
      const { raiz } = montar({
        usuarioId: 2,
        membros: [
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
          { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
          {
            usuarioId: 3,
            nome: 'Colega',
            papel: TipoCampanhaMembroPapelEnum.JOGADOR,
            fichas: [
              {
                id: 9,
                nome: 'Rex',
                classe: ClasseEnum.COMBATENTE,
                arquetipo: null,
                imagemUrl: null,
                acessoCompleto: false,
              },
            ],
          },
        ],
      });

      const carteirinha = raiz.querySelector('.detalhe__equipe-carteirinha');
      expect(carteirinha).not.toBeNull();
      expect(carteirinha?.tagName).toBe('SPAN');
      expect(carteirinha?.textContent).toContain('Rex');
      expect(carteirinha?.textContent).toContain('Combatente');
      expect(raiz.querySelector('.detalhe__equipe-ficha')).toBeNull();
    });

    it('mantém o card clicável (completo) pra ficha com acessoCompleto, cruzando com listarFichas', () => {
      const { raiz } = montar({
        usuarioId: 2,
        membros: [
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
          {
            usuarioId: 2,
            nome: 'Jogador',
            papel: TipoCampanhaMembroPapelEnum.JOGADOR,
            fichas: [
              {
                id: 3,
                nome: 'Kane',
                classe: ClasseEnum.COMBATENTE,
                arquetipo: null,
                imagemUrl: null,
                acessoCompleto: true,
              },
            ],
          },
        ],
        fichas: [
          {
            id: 3,
            campanhaId: CAMPANHA_ID,
            campanhaNome: null,
            imagemUrl: null,
            usuarioId: 2,
            nome: 'Kane',
            classe: ClasseEnum.COMBATENTE,
            arquetipo: null,
            nivel: 1,
            vidaAtual: 40,
            vidaMaxima: 40,
            energiaAtual: 10,
            energiaMaxima: 10,
            morrendo: false,
            machucado: false,
            inconsciente: false,
          },
        ],
      });

      const botao = raiz.querySelector('.detalhe__equipe-ficha') as HTMLButtonElement;
      expect(botao).not.toBeNull();
      expect(botao.textContent).toContain('Kane');
      expect(botao.textContent).toContain('Vida 40/40');
      expect(raiz.querySelector('.detalhe__equipe-carteirinha')).toBeNull();
    });
  });
```

- [ ] **Step 4: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts -t "Equipe (m3-65"`
Expected: FAIL — `.detalhe__equipe-vazio`/`.detalhe__equipe-carteirinha` não existem; a lista ainda esconde quem não tem ficha visível.

- [ ] **Step 5: Adicionar o computed `equipeExibicao` e o helper de classe**

Em `detalhe.page.ts`, logo após `fichasPorMembro` (achar o fim do computed, por volta da L455 — onde ele fecha):

```ts
  /**
   * Uma ficha exibida na Equipe (m3-65): `completa` reusa `ItemFicha` (clicável, com vida/energia
   * — mesmo dado de `fichasPorMembro`); `teaser` é só a carteirinha (nome/classe/foto, sem clique).
   */
  protected readonly equipeExibicao = computed<
    readonly { readonly membro: CampanhaMembroResumoDto; readonly fichas: readonly EquipeFichaExibicao[] }[]
  >(() => {
    const porMembroCompleto = this.fichasPorMembro();
    return this.membrosOrdenados().map((membro) => ({
      membro,
      fichas: membro.fichas.map((ficha): EquipeFichaExibicao => {
        const completa = ficha.acessoCompleto
          ? porMembroCompleto.get(membro.usuarioId)?.find((item) => item.id === ficha.id)
          : undefined;
        if (completa) {
          return { tipo: 'completa', ...completa };
        }
        return {
          tipo: 'teaser',
          id: ficha.id,
          nome: ficha.nome,
          imagemUrl: ficha.imagemUrl,
          classeTexto: rotuloClasseCompleto(ficha.classe, ficha.arquetipo),
        };
      }),
    }));
  });
```

Logo após a interface `ItemFicha` (fim dela, L112):

```ts
/** Ficha da Equipe (m3-65) com acesso completo — mesmos campos de {@link ItemFicha}, clicável. */
type EquipeFichaExibicao =
  | ({ readonly tipo: 'completa' } & ItemFicha)
  | {
      readonly tipo: 'teaser';
      readonly id: number;
      readonly nome: string;
      readonly imagemUrl: string | null;
      readonly classeTexto: string;
    };
```

- [ ] **Step 6: Reescrever o template da Equipe**

Em `detalhe.page.html`, substituir o bloco L724-754 (dentro de `<ul class="detalhe__equipe-lista" appOverflowFade>`):

```html
            @for (item of equipeExibicao(); track item.membro.usuarioId) {
              <li class="detalhe__equipe-membro">
                <div class="detalhe__equipe-membro-corpo">
                  <span class="detalhe__equipe-nome">{{ item.membro.nome }}</span>
                  @if (item.fichas.length) {
                    @for (ficha of item.fichas; track ficha.id) {
                      @if (ficha.tipo === 'completa') {
                        <button
                          type="button"
                          class="detalhe__equipe-ficha"
                          [class.detalhe__equipe-ficha--ativa]="fichaExibidaId() === ficha.id"
                          [attr.aria-pressed]="fichaExibidaId() === ficha.id"
                          [attr.aria-label]="'Ver ficha de ' + ficha.nome + ' (' + item.membro.nome + ')'"
                          (click)="selecionarFichaExibida(ficha.id)"
                        >
                          <span class="detalhe__equipe-ficha-avatar" aria-hidden="true" [style.--cor-ficha]="ficha.cor">
                            @if (ficha.imagemUrl; as urlImagem) {
                              <img class="detalhe__equipe-ficha-avatar-imagem" [src]="urlImagem" alt="" />
                            }
                          </span>
                          <app-icone nome="olho" />
                          <span class="detalhe__equipe-ficha-corpo">
                            <span class="detalhe__equipe-ficha-nome">{{ ficha.nome }}</span>
                            <span class="detalhe__equipe-ficha-vitais">
                              Vida {{ ficha.vidaAtual }}/{{ ficha.vidaMaxima ?? '—' }} · Energia
                              {{ ficha.energiaAtual }}/{{ ficha.energiaMaxima ?? '—' }}
                            </span>
                          </span>
                        </button>
                      } @else {
                        <span
                          class="detalhe__equipe-carteirinha"
                          [attr.aria-label]="'Ficha de ' + ficha.nome + ' (' + item.membro.nome + ') — sem acesso'"
                        >
                          <span class="detalhe__equipe-ficha-avatar" aria-hidden="true">
                            @if (ficha.imagemUrl; as urlImagem) {
                              <img class="detalhe__equipe-ficha-avatar-imagem" [src]="urlImagem" alt="" />
                            }
                          </span>
                          <span class="detalhe__equipe-ficha-corpo">
                            <span class="detalhe__equipe-ficha-nome">{{ ficha.nome }}</span>
                            <span class="detalhe__equipe-ficha-vitais">{{ ficha.classeTexto }}</span>
                          </span>
                        </span>
                      }
                    }
                  } @else {
                    <span class="detalhe__equipe-vazio">Sem ficha nesta campanha</span>
                  }
                </div>
              </li>
            }
```

- [ ] **Step 7: Estilizar a carteirinha, o avatar por ficha e o estado vazio**

Em `detalhe.page.scss`, logo após `&__equipe-ficha-vitais` (L701-708):

```scss
  &__equipe-ficha-avatar {
    position: relative;
    width: 28px;
    height: 28px;
    flex: none;
    border-radius: var(--radius-control);
    background-color: color-mix(in srgb, var(--cor-ficha, var(--border-strong)) 14%, var(--surface));
    background-image: repeating-linear-gradient(
      135deg,
      color-mix(
          in srgb,
          color-mix(in srgb, var(--cor-ficha, var(--border-strong)) 60%, var(--border-strong)) 20%,
          transparent
        )
        0 2px,
      transparent 2px 6px
    );
    border: 1px solid var(--cor-ficha, var(--border-strong));
    overflow: hidden;
  }

  &__equipe-ficha-avatar-imagem {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // Carteirinha (m3-65) — mesmo layout de `&__equipe-ficha`, mas `<span>` sem interação: borda
  // tracejada e texto mais apagado sinalizam "sem acesso" sem precisar de rótulo extra.
  &__equipe-carteirinha {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    background: var(--surface);
    color: var(--text-mute);
    border: 1px dashed var(--border);
    border-radius: var(--radius-control);
  }

  &__equipe-vazio {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-mute);
    font-style: italic;
  }
```

- [ ] **Step 8: Rodar e confirmar que passa**

Run: `cd frontend && npx ng test --watch=false`
Expected: PASS — todas as suítes, incluindo os testes novos da Equipe e os já existentes de "Ver como jogador"/Esquadrão (que não deveriam ter sido afetados, já que só a lista lateral do jogador mudou).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
git commit -m "feat(campanha): Equipe do jogador sempre completa, com carteirinha (m3-65)"
```

---

## Verificação manual final

Sem cobertura automatizada pra SQL (o projeto não tem testes de repositório) nem pro fluxo de ponta a ponta — rodar localmente com Postgres + NestJS + Angular:

1. Como mestre, criar/editar uma ficha de um jogador sem avatar e outra com avatar.
2. Logar como um segundo jogador **sem** acesso concedido a nenhuma ficha alheia — conferir que a Equipe lista **todos** os membros (mestre incluso), com carteirinha (foto/nome/classe, sem clique) pras fichas de terceiros e "Sem ficha nesta campanha" pra quem não tem.
3. Como dono de uma ficha, abrir a ficha completa (`/painel/:id/ficha/:fichaId`), marcar "Ocultar ficha de outros jogadores" — conferir que ela some da Equipe do segundo jogador (nem carteirinha), mas continua aparecendo pro mestre e pra si mesmo.
4. Conceder acesso de visualização a uma ficha não-oculta pro segundo jogador — conferir que o card na Equipe vira clicável (completo, com Vida/Energia) em vez de carteirinha.
5. Desmarcar "Ocultar" — conferir que a ficha volta a aparecer (carteirinha, ou completa se o acesso concedido antes ainda estiver ativo).
6. Confirmar a limitação já aceita: no preview "Ver como jogador" (mestre), fichas ocultas de terceiros ainda podem aparecer (dado já carregado como mestre) — não é regressão, é a mesma limitação do design original do preview.
