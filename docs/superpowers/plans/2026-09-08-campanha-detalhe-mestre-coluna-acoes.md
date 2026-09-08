# Campanha Detalhe — Split Mestre/Jogador + Coluna de Ações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `CampanhaDetalhe` into `CampanhaDetalheMestre` (redesigned) and `CampanhaDetalheJogador` (byte-for-byte regression), introduce the `app-coluna-acoes` primitive, and relocate `FichaFlutuante` from `modules/encontro` to `modules/ficha`.

**Architecture:** A route-scoped `CampanhaDetalheDadosService` (provided by a thin wrapper component `CampanhaDetalheShell`) owns all data/tempo-real/socket wiring shared by both roles. The wrapper resolves `ehMestre()` and renders either `CampanhaDetalheMestre` or `CampanhaDetalheJogador`, each owning only role-specific state. `app-coluna-acoes`/`app-coluna-acoes-item` (new `shared/ui/` primitive) follow the existing companion-component pattern (`Abas`/`Aba`, `Segmentado`/`SegmentadoItem`). `EspectadorFichaCard` gains an opt-in `[mostrarAcoes]` mode so the mestre's Esquadrão grid can reuse it without touching the espectador's read-only rendering.

**Tech Stack:** Angular 21 standalone components, Signals, PrimeNG 21 (unused here), SCSS with `docs/design/tema/_tokens.scss` tokens, Jasmine/Karma via `npm run test --workspace=frontend`.

**Spec:** `docs/specs/active/campanha-detalhe-mestre-coluna-acoes.spec.md` (moved from `backlog/` at task start)

## Global Constraints

- No hex/font/radius literals outside `docs/design/tema/_tokens.scss` — consume `var(--*)` tokens (proibição #29).
- Every interface control uses the `shared/ui/` primitive with its full API (`[tamanho]`, `[variante]`, etc.) — never a hand-styled native element.
- `CampanhaDetalheJogador` must be behaviorally and visually **identical** to today's `@else` branch of `CampanhaDetalhe` — no redesign, no dead-code trimming beyond removing state that is provably `ehMestre()`-gated today (documented per-task below).
- `.utilitario-flutuante` and its 6 existing consumers (ficha, iniciativa, campanha-jogador) stay untouched — `app-coluna-acoes` is adopted **only** by `CampanhaDetalheMestre`.
- Every `DTO`/enum comes from `@contratados-rpg/shared` — never redefined locally.
- Decision resolved with the author (2026-09-08): **"Prévia de jogador"** moves into the "Membros" dialog as a per-row icon action next to Transferir mestre/Alternar papel/Remover (jogador rows only, same `jogadoresDaCampanha` filter as today).
- Português for all UI copy, comments (only where WHY is non-obvious), and `docs/context/` entries at closeout.
- `Co-authored-by:` trailer on every commit per `CLAUDE.md` "Coautoria de commits".

---

## Ownership Map (reference for every task below)

**`CampanhaDetalheDadosService`** (new, provided per-route by `CampanhaDetalheShell`) owns:
`id`, `campanha`, `carregando`, `membros`, `membrosOrdenados`, `fichas`, `fichasPorMembro`, `usuarioAtivoId`, `ehMestre`, `inventarioEsquadrao`, `carregarInventario()`, `rolagensFeed`, `carregandoRolagens`, `agora` (5s tick), `textoAtualizacao`, `ultimaAtualizacaoEm`, all tempo-real wiring (`entrarSalaCampanha`/`sairSalaCampanha`, `sincronizarSalasFicha`/`salasFichaAtivas`, subscriptions to `fichaCriada$`/`membroEntrou$`/`fichaAlterada$`(list-level)/`fichaVisibilidadeAlterada$`/`rolagemRegistrada$`/`estadoAlterado$`/`inventarioAlterado$`/`reconexao()`), `recarregarMembrosEFichas()`, `recarregarCampanhaEInventario()`, `carregarRolagens()`, `TopbarContextoService` wiring (nome da campanha).

**Dropped entirely** (mestre-only feature made obsolete by the redesign — the "Combate" stat tile disappears, replaced by a plain "Iniciativa" nav item): `encontros`, `encontroAberto`, `encontrosEncerrados`, `carregarEncontros()`, `EncontroService` injection, `rotuloStatusEncontro`, `EncontroStatusEnum` re-export. None of this is used anywhere else in `detalhe.page.ts`.

**`CampanhaDetalheJogador`-only** (moves verbatim): `fichaExibidaId`, `fichaExibidaDados`, `carregandoFichaExibida`, `podeAjustarFichaExibida`, `minhaFichaExibida`, `dialogAcessoFicha`, `acessosFichaExibida`, `membroParaConcederAcesso`, `concedendoAcesso`, `revogandoAcesso`, `membrosElegiveisAcesso`, `equipeExibicao` (+ `montarEquipeExibicao` call), `destinoMobileFicha`, `cardRolagens`, `aoMudarDestinoFicha()`, `gastarEnergiaFichaExibida()`, `selecionarFichaExibida()`, `absorverFichaExibidaRemota()` (+ its `fichaAlterada$` filter subscription), `onRolagemRegistradaEmbutida()` (+ `FichaRolagemRegistroService.registrada$` subscription), `dialogVincular`, `fichasSoltas`, `carregandoFichasSoltas`, `fichaParaVincular`, `vinculando`, `abrirVincularFicha()`/`fecharVincularFicha()`/`escolherFichaParaVincular()`/`confirmarVincularFicha()`, `exibindoInventarioJogador`, `menuCampanhaAberto` (jogador's own kebab, renamed `menuAberto`), `abrirCriarFicha()` (jogador copy), `abrirAcessoFicha()`/`fecharAcessoFicha()`/`carregarAcessosFichaExibida()`/`concederAcessoFicha()`/`revogarAcessoFicha()`, `removerDaCampanha()`/`rotuloRemoverDaCampanha()`, `pedirExcluirFicha()`/`excluirFicha()`, `avancarFichaExibidaApos()`, `podeAjustarFicha()`, `ajustarVitalidade()` (only used by jogador's own card — mestre's grid doesn't have inline steppers anymore per entregável 3), `abrirAnotacoesFicha()`, `FichaEdicaoService`/`FichaRolagemRegistroService` providers, `UMA_HORA_MS`, `rolagensRecentes` computed, `tempoRolagem()`, `mostrarPreviaRolagem()`/`esconderPreviaRolagem()`/`previaRolagemId`, `BandejaDadosService` injection, `FichaVitalidadeRapidaService` injection + `falhou$` subscription, `mandarItemFichaParaBase()`, `fichaCritica` computed (banner **stays** for jogador — it is not gated by `ehMestre()` today), `fichasCriticas`, `fichasDestinoInventario`, `HoldRepeat`/`BarraRecurso` imports (mini-card steppers on own ficha card come from `FichaVisualizacao`, not raw markup — verify while porting).

**`CampanhaDetalheMestre`-only** (new/redesigned): `editando`/`salvando`/`formularioEdicao`/`abrirEdicao()`/`cancelarEdicao()`/`salvarEdicao()` (inline edit form unchanged internally, now triggered from a coluna-acoes item instead of the old kebab), `pedirExclusao()`/`excluirCampanha()`, `regenerando`/`regenerado`/`copiado`/`regenerarConvite()`/`pedirRegenerarConvite()`/`copiarConvite()` + espectador twins (`regenerandoEspectador`/`regeneradoEspectador`/`copiadoEspectador`/`regenerarConviteEspectador()`/`pedirRegenerarConviteEspectador()`/`copiarConviteEspectador()`) — now inside the "Convites" dialog, `rotuloCopiarConvite()`/`rotuloRegenerarConvite()`, `acaoMembro`/`processandoMembro`/`alterandoPapel`/`podeGerenciarMembro()`/`pedirRemocaoMembro()`/`removerMembro()`/`pedirTransferenciaMestre()`/`cancelarAcaoMembro()`/`confirmarTransferenciaMestre()`/`papelAlvo()`/`pedirAlterarPapelMembro()`/`alterarPapelMembro()` — now inside the "Membros" dialog, `jogadoresDaCampanha`/`abrirPreviaJogador()` (now a per-row action in "Membros"), `fichasEsquadrao`/`criaturasEsquadrao`, `abrirCriarFicha()`/`abrirCriarCriatura()` (mestre copies, Esquadrão header buttons — unchanged), `menuFichaAberto`/`menuFichaPosicao`/`alternarMenuFicha()`/`fecharMenuFicha()` (now driving `EspectadorFichaCard`'s `[mostrarAcoes]` menu instead of the old raw `.detalhe__ficha-card` markup), `previewAvatar`/`agendarPreviewAvatar()`/`cancelarPreviewAvatar()` (reused by both the Esquadrão grid and the Membros dialog), `confirmandoDuplicar`/`duplicando`/`pedirDuplicar()`/`cancelarDuplicar()`/`confirmarDuplicar()`, `removendo` (menu-driven remove, not inline steppers), `pedirExcluirFicha()`/`excluirFicha()` (mestre copy — different call sites than jogador's), `caminhoFicha()`/`caminhoCriatura()`/`abrirFichaDuploClique()`/`abrirFichaCliqueDoMeio()`/`abrirCriaturaDuploClique()`/`abrirCriaturaCliqueDoMeio()`/`cliqueEmControlePropio()`, new: `painelLateralAtivo` signal (`'rolagens' | 'inventario'`) for the segmented toggle, new: `fichaFlutuanteRef` + `abrirFichaFlutuante()` wiring.

---

## Task 1: `CampanhaDetalheDadosService`

**Files:**
- Create: `frontend/src/app/modules/campanha/paginas/detalhe/campanha-detalhe-dados.service.ts`
- Test: `frontend/src/app/modules/campanha/paginas/detalhe/campanha-detalhe-dados.service.spec.ts`

**Interfaces:**
- Produces: `CampanhaDetalheDadosService` — injectable, **not** `providedIn: 'root'` (route-scoped via `CampanhaDetalheShell`'s `providers`). Public readonly signals/computed listed in the Ownership Map above, plus method `inicializar(id: number): void` (called once by the shell after resolving the route param — the service itself cannot read `ActivatedRoute` cleanly when instantiated per-route via `providers`, so the id is pushed in explicitly) and `recarregarMembrosEFichas(): void` (public — both role pages call it after actions that mutate `fichas`/`membros` outside socket events, e.g. after duplicating a ficha).

- [ ] **Step 1: Create the service file**

Copy the following members from `detalhe.page.ts` **verbatim** (same signal names, same computed logic), adjusting only visibility (`readonly` signals stay public, no `protected`) and injecting `DestroyRef`/`SessaoService`/`CampanhaService`/`FichaService`/`RolagemService`/`TempoRealService`/`TopbarContextoService` the same way the original component does:

```typescript
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { finalize, forkJoin, merge } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  CampanhaInventarioItemDto,
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { rotuloRelativo } from '../../../../shared/rotulo-relativo.util';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { agruparFichasPorMembro, ordenarMembros, type ItemFicha } from '../../campanha-equipe.util';

/**
 * Dado e tempo real compartilhados entre `CampanhaDetalheMestre`/`CampanhaDetalheJogador`
 * (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 1) — extraído do antigo
 * `CampanhaDetalhe` monolítico para não duplicar fetch/assinaturas de socket entre os dois papéis.
 * Provido por `CampanhaDetalheShell` (`providers`, escopo de rota — uma instância por navegação
 * para `/campanhas/:id`), não `providedIn: 'root'`.
 */
@Injectable()
export class CampanhaDetalheDadosService {
  private readonly campanhaService = inject(CampanhaService);
  private readonly fichaService = inject(FichaService);
  private readonly rolagemService = inject(RolagemService);
  private readonly sessaoService = inject(SessaoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly destroyRef = inject(DestroyRef);

  private id_ = 0;

  readonly campanha = signal<CampanhaRecuperadaDto | null>(null);
  readonly inventarioEsquadrao = signal<readonly CampanhaInventarioItemDto[]>([]);
  readonly membros = signal<CampanhaMembroResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly fichas = signal<FichaResumoDto[]>([]);
  readonly rolagensFeed = signal<readonly RolagemResumoDto[]>([]);
  readonly carregandoRolagens = signal(true);

  private readonly ultimaAtualizacaoEm = signal<number | null>(null);
  private readonly agoraInterno = signal(Date.now());
  readonly agora = this.agoraInterno.asReadonly();

  readonly textoAtualizacao = computed<string | null>(() => {
    const em = this.ultimaAtualizacaoEm();
    if (em === null) return null;
    return `Atualizado ${rotuloRelativo(em, this.agora())}`;
  });

  readonly usuarioAtivoId = computed(() => this.sessaoService.usuario()?.id ?? null);

  readonly ehMestre = computed(() => {
    const usuarioId = this.usuarioAtivoId();
    return this.membros().some(
      (membro) =>
        membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    );
  });

  readonly membrosOrdenados = computed<readonly CampanhaMembroResumoDto[]>(() =>
    ordenarMembros(this.membros()),
  );

  readonly fichasPorMembro = computed<ReadonlyMap<number, readonly ItemFicha[]>>(() =>
    agruparFichasPorMembro(this.fichas()),
  );

  readonly fichasDestinoInventario = computed(() =>
    this.fichas()
      .filter((ficha) => ficha.usuarioId === this.usuarioAtivoId())
      .map(({ id, nome }) => ({ id, nome })),
  );

  private readonly salasFichaAtivas = new Set<number>();

  get id(): number {
    return this.id_;
  }

  /** Chamado uma vez pelo `CampanhaDetalheShell` com o `id` resolvido da rota. */
  inicializar(id: number): void {
    this.id_ = id;

    effect(() => this.topbarContexto.definir(this.campanha()?.nome ?? null));
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    this.carregar();
    this.carregarRolagens();

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(id);
    this.destroyRef.onDestroy(() => {
      this.tempoRealService.sairSalaCampanha(id);
      for (const fichaId of this.salasFichaAtivas) {
        this.tempoRealService.sairSalaFicha(fichaId);
      }
    });

    merge(
      this.tempoRealService.fichaCriada$,
      this.tempoRealService.membroEntrou$,
      this.tempoRealService.fichaAlterada$,
      this.tempoRealService.fichaVisibilidadeAlterada$,
    ).subscribe({ next: () => this.recarregarMembrosEFichas() });

    this.tempoRealService.rolagemRegistrada$.subscribe({
      next: (rolagem) => this.rolagensFeed.update((atuais) => [rolagem, ...atuais]),
    });

    this.tempoRealService.estadoAlterado$
      .subscribe({ next: (evento) => evento.id === id && this.recarregarCampanhaEInventario() });

    this.tempoRealService.inventarioAlterado$
      .subscribe({ next: (evento) => evento.campanhaId === id && this.carregarInventario() });

    effect(() => {
      if (this.tempoRealService.reconexao() > 0) {
        this.recarregarMembrosEFichas();
      }
    });

    const relogio = setInterval(() => this.agoraInterno.set(Date.now()), 5000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }

  sincronizarSalasFicha(fichas: readonly FichaResumoDto[]): void {
    const idsAtuais = new Set(fichas.map((ficha) => ficha.id));
    for (const idFicha of idsAtuais) {
      if (!this.salasFichaAtivas.has(idFicha)) {
        this.tempoRealService.entrarSalaFicha(idFicha);
        this.salasFichaAtivas.add(idFicha);
      }
    }
    for (const idFicha of this.salasFichaAtivas) {
      if (!idsAtuais.has(idFicha)) {
        this.tempoRealService.sairSalaFicha(idFicha);
        this.salasFichaAtivas.delete(idFicha);
      }
    }
  }

  private carregar(): void {
    this.carregando.set(true);
    forkJoin({
      campanha: this.campanhaService.recuperarCampanha(this.id_),
      membros: this.campanhaService.listarMembros(this.id_),
      fichas: this.fichaService.listarFichas(this.id_),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ campanha, membros, fichas }) => {
          this.campanha.set(campanha);
          this.membros.set(membros);
          this.fichas.set(fichas);
          this.sincronizarSalasFicha(fichas);
          this.ultimaAtualizacaoEm.set(Date.now());
          this.carregarInventario();
        },
      });
  }

  carregarInventario(): void {
    this.campanhaService
      .recuperarInventario(this.id_)
      .subscribe((inventario) => this.inventarioEsquadrao.set(inventario.itens));
  }

  recarregarCampanhaEInventario(): void {
    this.campanhaService.recuperarCampanha(this.id_).subscribe((campanha) => {
      this.campanha.set(campanha);
      this.carregarInventario();
    });
  }

  recarregarMembrosEFichas(): void {
    forkJoin({
      membros: this.campanhaService.listarMembros(this.id_),
      fichas: this.fichaService.listarFichas(this.id_),
    }).subscribe({
      next: ({ membros, fichas }) => {
        this.membros.set(membros);
        this.fichas.set(fichas);
        this.sincronizarSalasFicha(fichas);
        this.ultimaAtualizacaoEm.set(Date.now());
      },
    });
  }

  private carregarRolagens(): void {
    this.rolagemService
      .listarPorCampanha(this.id_)
      .pipe(finalize(() => this.carregandoRolagens.set(false)))
      .subscribe({ next: (itens) => this.rolagensFeed.set(itens), error: () => undefined });
  }
}
```

Note: `fichaAlterada$`/`estadoAlterado$`/`inventarioAlterado$` above drop the `filter()`+`takeUntilDestroyed()` RxJS operators in favor of an inline predicate + plain `.subscribe()` — an injectable's `subscribe()` without `takeUntilDestroyed()` leaks unless manually torn down. Since `TempoRealService`'s subjects live for the app's lifetime and this service is destroyed once per route deactivation, use `takeUntilDestroyed(this.destroyRef)` explicitly on every subscription that isn't naturally re-created (import `takeUntilDestroyed` from `@angular/core/rxjs-interop` and chain it before every `.subscribe()` above, matching the original component's pattern exactly — the snippet above omitted it only for brevity; **do not omit it in the actual file**).

- [ ] **Step 2: Write the service spec**

Port the relevant subset of `detalhe.page.spec.ts`'s setup (`TestBed` providers for `CampanhaService`/`FichaService`/`RolagemService`/`SessaoService`/`TempoRealService`/`TopbarContextoService`) into a focused spec that calls `service.inicializar(8)` and asserts: `campanha()`/`membros()`/`fichas()` populate after `forkJoin` resolves; `ehMestre()` reflects the injected `SessaoService.usuario()` against `membros()`; `recarregarMembrosEFichas()` re-fetches; a `rolagemRegistrada$` emission prepends to `rolagensFeed()`; `sincronizarSalasFicha` enters/exits the right ficha rooms. Reuse `detalhe.page.spec.ts`'s existing fixture builders (`campanhaBase`, `membrosCom`, `rolagem`) as a starting point — copy them into the new spec file (the old spec file is deleted in Task 6, so no shared-fixture dependency survives).

- [ ] **Step 3: Run the focused test**

Run: `npm run test --workspace=frontend -- --include='**/campanha-detalhe-dados.service.spec.ts'`
Expected: PASS, all assertions from Step 2 green.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe/campanha-detalhe-dados.service.ts frontend/src/app/modules/campanha/paginas/detalhe/campanha-detalhe-dados.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(campanha): extrai CampanhaDetalheDadosService do CampanhaDetalhe

Dado e tempo real compartilhados entre as visões de mestre e jogador que
serao separadas em componentes proprios (campanha-detalhe-mestre-coluna-
acoes.spec.md) — primeiro corte, ainda sem consumidor.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Relocate `FichaFlutuante` to `modules/ficha/componentes/ficha-flutuante/`

**Files:**
- Move: `frontend/src/app/modules/encontro/componentes/ficha-flutuante/*` → `frontend/src/app/modules/ficha/componentes/ficha-flutuante/*` (4 non-spec files + 2 spec files: `ficha-flutuante.component.ts/.html/.scss/.spec.ts`, `ficha-flutuante-conteudo.component.ts/.html/.scss/.spec.ts`, `ficha-flutuante.model.ts`)
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.ts` (cross-module import paths, now same-module)
- Modify: `frontend/src/app/modules/encontro/paginas/painel/painel-encontro.page.ts:64` (import path)

**Interfaces:**
- Consumes: nothing new.
- Produces: `FichaFlutuante` (selector `app-ficha-flutuante`, unchanged public API — `ehMestre = input.required<boolean>()`, `abrir(alvo: FichaFlutuanteAlvo): void`) now importable from `../../../ficha/componentes/ficha-flutuante/ficha-flutuante.component` by any consumer under `modules/`.

- [ ] **Step 1: Move the files with git mv (preserves history)**

```bash
git mv frontend/src/app/modules/encontro/componentes/ficha-flutuante/ficha-flutuante.component.ts frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante.component.ts
git mv frontend/src/app/modules/encontro/componentes/ficha-flutuante/ficha-flutuante.component.html frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante.component.html
git mv frontend/src/app/modules/encontro/componentes/ficha-flutuante/ficha-flutuante.component.scss frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante.component.scss
git mv frontend/src/app/modules/encontro/componentes/ficha-flutuante/ficha-flutuante.component.spec.ts frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante.component.spec.ts
git mv frontend/src/app/modules/encontro/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.ts frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.ts
git mv frontend/src/app/modules/encontro/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.html frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.html
git mv frontend/src/app/modules/encontro/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.scss frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.scss
git mv frontend/src/app/modules/encontro/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.spec.ts frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.spec.ts
git mv frontend/src/app/modules/encontro/componentes/ficha-flutuante/ficha-flutuante.model.ts frontend/src/app/modules/ficha/componentes/ficha-flutuante/ficha-flutuante.model.ts
```

- [ ] **Step 2: Fix cross-module imports in the moved `ficha-flutuante-conteudo.component.ts`**

Old imports (relative to `modules/encontro/componentes/ficha-flutuante/`):
```typescript
import { CriaturaVisualizacao } from '../../../ficha/componentes/criatura-visualizacao/criatura-visualizacao.component';
import { FichaVisualizacao } from '../../../ficha/componentes/ficha-visualizacao/ficha-visualizacao.component';
import { FichaEdicaoCriaturaService } from '../../../ficha/ficha-edicao-criatura.service';
import { FichaEdicaoService } from '../../../ficha/ficha-edicao.service';
import { FichaRolagemRegistroService } from '../../../ficha/ficha-rolagem-registro.service';
import { FichaService } from '../../../ficha/ficha.service';
```

New imports (relative to `modules/ficha/componentes/ficha-flutuante/`, same module now):
```typescript
import { CriaturaVisualizacao } from '../criatura-visualizacao/criatura-visualizacao.component';
import { FichaVisualizacao } from '../ficha-visualizacao/ficha-visualizacao.component';
import { FichaEdicaoCriaturaService } from '../../ficha-edicao-criatura.service';
import { FichaEdicaoService } from '../../ficha-edicao.service';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import { FichaService } from '../../ficha.service';
```

`SessaoService` import (`'../../../../core/services/sessao.service'`) is unchanged — same directory depth. `ficha-flutuante.component.ts`'s own imports of `shared/*` (`Icone`/`Tooltip`/`BotaoIcone`/`PainelFlutuante`, all `'../../../../shared/...'`) are unchanged for the same reason; only its same-directory imports (`./ficha-flutuante-conteudo.component`, `./ficha-flutuante.model`) move with the files untouched.

- [ ] **Step 3: Fix the consumer import in `painel-encontro.page.ts`**

Use Edit on `frontend/src/app/modules/encontro/paginas/painel/painel-encontro.page.ts:64`:

old: `import { FichaFlutuante } from '../../componentes/ficha-flutuante/ficha-flutuante.component';`
new: `import { FichaFlutuante } from '../../../ficha/componentes/ficha-flutuante/ficha-flutuante.component';`

- [ ] **Step 4: Check for any other stale references and confirm the old directory is gone**

Run: `Grep` for `componentes/ficha-flutuante` across `frontend/src` — every remaining hit must resolve under `modules/ficha/componentes/ficha-flutuante/`. Confirm `frontend/src/app/modules/encontro/componentes/ficha-flutuante/` no longer exists (`git status` should show only renames, no leftover files).

- [ ] **Step 5: Build and run the affected specs**

Run: `npm run test --workspace=frontend -- --include='**/ficha-flutuante*.spec.ts' --include='**/painel-encontro.page.spec.ts'`
Expected: PASS — no behavior changed, only file location and import paths.

Run: `npm run build --workspace=frontend`
Expected: clean compile (catches any missed relative-import fix from Step 2/3).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(ficha): move FichaFlutuante de encontro para modules/ficha

FichaFlutuante nao tem nada especifico de encontro (so FichaService por
fichaId/tipo) — realoca para ser reusada por campanha (proximo commit
desta serie) sem encontro depender de campanha ou vice-versa
(campanha-detalhe-mestre-coluna-acoes.spec.md, entregavel 3).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `app-coluna-acoes` / `app-coluna-acoes-item` primitive

**Files:**
- Create: `frontend/src/app/shared/ui/coluna-acoes/coluna-acoes.component.ts`
- Create: `frontend/src/app/shared/ui/coluna-acoes/coluna-acoes.component.html`
- Create: `frontend/src/app/shared/ui/coluna-acoes/coluna-acoes.component.scss`
- Create: `frontend/src/app/shared/ui/coluna-acoes/coluna-acoes-item.component.ts`
- Create: `frontend/src/app/shared/ui/coluna-acoes/coluna-acoes-item.component.scss`
- Create: `frontend/src/app/shared/ui/coluna-acoes/coluna-acoes.component.spec.ts`
- Modify: `frontend/src/app/shared/icone/icone.component.ts` (add `'membros'` to `IconeNome`)
- Modify: `frontend/src/app/shared/icone/icone.component.html` (add the `@case ("membros")` glyph)
- Modify: `docs/design/DESIGN.md` (document the new primitive in the "Painel flutuante, modal e painel lateral" section's family — add a short paragraph, not a rewrite)

**Interfaces:**
- Produces:
  - `ColunaAcoes` — selector `app-coluna-acoes`. Inputs: `id = input.required<string>()` (persistence key, same convention as `PainelFlutuante`), `rotulo = input.required<string>()` (`aria-label` of the nav landmark). No outputs — the expanded/retracted state is fully internal + persisted, nothing for a consumer to bind.
  - `ColunaAcoesItem` — selector `button[app-coluna-acoes-item], a[app-coluna-acoes-item]` (mirrors `BotaoIcone`'s dual-host pattern so `routerLink` items work). Inputs: `icone = input.required<IconeNome>()`, `ativo = input(false)`, `contagem = input<number | null>(null)`. Content: `<ng-content />` is the visible label text (rendered both retracted-as-tooltip and expanded-as-text).

- [ ] **Step 1: Write the component spec first**

```typescript
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ColunaAcoes } from './coluna-acoes.component';
import { ColunaAcoesItem } from './coluna-acoes-item.component';

@Component({
  imports: [ColunaAcoes, ColunaAcoesItem],
  template: `
    <app-coluna-acoes id="teste-coluna" rotulo="Ações da campanha">
      <button app-coluna-acoes-item icone="olho" [ativo]="true" appTooltip="Membros">Membros</button>
      <button app-coluna-acoes-item icone="convite" [contagem]="3" appTooltip="Convites">Convites</button>
    </app-coluna-acoes>
  `,
})
class HospedeiroTeste {}

describe('ColunaAcoes', () => {
  let fixture: ComponentFixture<HospedeiroTeste>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HospedeiroTeste] });
    fixture = TestBed.createComponent(HospedeiroTeste);
    fixture.detectChanges();
  });

  it('nasce retraída por padrão (sem estado persistido)', () => {
    const host = fixture.debugElement.query(By.directive(ColunaAcoes));
    expect(host.nativeElement.classList.contains('coluna-acoes--expandida')).toBe(false);
  });

  it('expande ao clicar no botão de alternar e persiste em localStorage', () => {
    const botaoAlternar = fixture.debugElement.query(By.css('.coluna-acoes__alternar')).nativeElement as HTMLButtonElement;
    botaoAlternar.click();
    fixture.detectChanges();
    const host = fixture.debugElement.query(By.directive(ColunaAcoes));
    expect(host.nativeElement.classList.contains('coluna-acoes--expandida')).toBe(true);
    expect(localStorage.getItem('contratados-rpg:coluna-acoes:teste-coluna')).toBe('true');
  });

  it('restaura o estado expandido persistido ao recriar', () => {
    localStorage.setItem('contratados-rpg:coluna-acoes:teste-coluna', 'true');
    const outraFixture = TestBed.createComponent(HospedeiroTeste);
    outraFixture.detectChanges();
    const host = outraFixture.debugElement.query(By.directive(ColunaAcoes));
    expect(host.nativeElement.classList.contains('coluna-acoes--expandida')).toBe(true);
  });

  it('reflete [ativo] e [contagem] nos itens', () => {
    const itens = fixture.debugElement.queryAll(By.directive(ColunaAcoesItem));
    expect(itens[0].nativeElement.getAttribute('aria-current')).toBe('page');
    expect(itens[1].nativeElement.querySelector('.coluna-acoes__item-contagem')?.textContent?.trim()).toBe('3');
  });

  it('aria-label do nav reflete [rotulo]', () => {
    const host = fixture.debugElement.query(By.directive(ColunaAcoes));
    expect(host.nativeElement.getAttribute('aria-label')).toBe('Ações da campanha');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails (components don't exist yet)**

Run: `npm run test --workspace=frontend -- --include='**/coluna-acoes.component.spec.ts'`
Expected: FAIL — `Cannot find module './coluna-acoes.component'`.

- [ ] **Step 3: Implement `ColunaAcoesItem`**

```typescript
// coluna-acoes-item.component.ts
import { Component, computed, input } from '@angular/core';

import type { IconeNome } from '../../icone/icone.component';
import { Icone } from '../../icone/icone.component';
import { Tooltip } from '../../tooltip/tooltip.directive';

/**
 * Item de `app-coluna-acoes` (`campanha-detalhe-mestre-coluna-acoes.spec.md`). Ícone sempre
 * visível; o rótulo (`<ng-content>`) só aparece expandido (retraído, o `appTooltip` do host cobre
 * a leitura visual — `[icone]` some junto do texto porque o botão vira 56px de largura fixa).
 *
 * Ao contrário de `SegmentadoItem` (seleção única mutuamente exclusiva), os itens aqui são ações
 * heterogêneas (abrir dialog, navegar, abrir painel flutuante) — sem `aria-pressed`/roving
 * tabindex: ordem de tab nativa do DOM, mesmo padrão de foco que `Segmentado` já usa.
 */
@Component({
  selector: 'button[app-coluna-acoes-item], a[app-coluna-acoes-item]',
  imports: [Icone],
  hostDirectives: [{ directive: Tooltip, inputs: ['appTooltip'] }],
  templateUrl: './coluna-acoes-item.component.html',
  styleUrl: './coluna-acoes-item.component.scss',
  host: {
    '[class]': 'classes()',
    '[attr.aria-current]': 'ativo() ? "page" : null',
  },
})
export class ColunaAcoesItem {
  readonly icone = input.required<IconeNome>();
  readonly ativo = input(false);
  readonly contagem = input<number | null>(null);

  protected readonly classes = computed(() =>
    this.ativo() ? 'coluna-acoes__item coluna-acoes__item--ativo' : 'coluna-acoes__item',
  );
}
```

Create `coluna-acoes-item.component.html` (inline template moved out since it has structure, not `template:` string):
```html
<app-icone [nome]="icone()" class="coluna-acoes__item-icone" />
<span class="coluna-acoes__item-rotulo"><ng-content /></span>
@if (contagem(); as n) {
  <span class="coluna-acoes__item-contagem">{{ n }}</span>
}
```

Update the `@Component` decorator to `templateUrl: './coluna-acoes-item.component.html'` (already shown above — keep consistent, don't leave a stray inline `template:`).

`coluna-acoes-item.component.scss`:
```scss
.coluna-acoes__item {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-12);
    width: 100%;
    min-height: 44px;
    padding: var(--space-12);
    background: transparent;
    border: 0;
    border-radius: var(--radius-control);
    color: var(--text-dim);
    text-decoration: none;
    cursor: pointer;

    &:hover {
        color: var(--text);
        background: var(--surface-2);
    }

    &--ativo {
        color: var(--text);
        background: var(--accent-dim);
        box-shadow: inset 2px 0 0 var(--accent);
    }
}

.coluna-acoes__item-icone {
    flex: none;
    font-size: 18px;
}

.coluna-acoes__item-rotulo {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 12px;
    text-align: left;

    // Retraído: só o ícone conta como conteúdo visível — o rótulo textual existe no DOM (leitor de
    // tela lê sempre) mas não ocupa espaço, o `appTooltip` do host cobre a leitura visual.
    :host-context(.coluna-acoes:not(.coluna-acoes--expandida)) & {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
    }
}

.coluna-acoes__item-contagem {
    flex: none;
    min-width: 18px;
    padding: 1px 5px;
    background: var(--accent);
    color: var(--bg);
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    text-align: center;
}
```

- [ ] **Step 4: Implement `ColunaAcoes`**

```typescript
// coluna-acoes.component.ts
import { Component, computed, effect, input, signal } from '@angular/core';

import { BotaoIcone } from '../botao-icone/botao-icone.component';
import { Icone } from '../../icone/icone.component';
import { Tooltip } from '../../tooltip/tooltip.directive';

const PREFIXO_ARMAZENAMENTO = 'contratados-rpg:coluna-acoes:';

/**
 * Coluna de ações lateral (`campanha-detalhe-mestre-coluna-acoes.spec.md`) — substitui
 * `.utilitario-flutuante` na visão de mestre da campanha (só ela, por ora; os outros 6
 * consumidores de `.utilitario-flutuante` ficam fora de escopo). Participa do fluxo normal do
 * layout (flex, não `position: fixed`) — expandir/retrair empurra o conteúdo ao lado em vez de
 * sobrepor. Estado expandido/retraído persiste em `localStorage` por `[id]`, mesmo padrão de
 * `app-painel-flutuante`. No mobile vira barra inferior fixa (mesmo racional de `.ficha-nav`),
 * sempre com rótulo abaixo do ícone e sem o botão de alternar (decisão validada no POC visual do
 * autor) — a mudança de layout retraído↔expandido não existe nessa faixa.
 */
@Component({
  selector: 'app-coluna-acoes',
  imports: [BotaoIcone, Icone, Tooltip],
  templateUrl: './coluna-acoes.component.html',
  styleUrl: './coluna-acoes.component.scss',
  host: {
    class: 'coluna-acoes',
    role: 'navigation',
    '[class.coluna-acoes--expandida]': 'expandida()',
    '[attr.aria-label]': 'rotulo()',
  },
})
export class ColunaAcoes {
  readonly id = input.required<string>();
  readonly rotulo = input.required<string>();

  protected readonly expandida = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      this.expandida.set(carregarEstado(id));
    });
  }

  protected alternar(): void {
    this.expandida.update((atual) => {
      const proximo = !atual;
      persistirEstado(this.id(), proximo);
      return proximo;
    });
  }
}

function carregarEstado(id: string): boolean {
  try {
    return globalThis.localStorage?.getItem(PREFIXO_ARMAZENAMENTO + id) === 'true';
  } catch {
    return false;
  }
}

function persistirEstado(id: string, expandida: boolean): void {
  try {
    globalThis.localStorage?.setItem(PREFIXO_ARMAZENAMENTO + id, String(expandida));
  } catch {
    // Preferência efêmera se o armazenamento local estiver indisponível.
  }
}
```

`coluna-acoes.component.html`:
```html
<button
    app-botao-icone
    type="button"
    class="coluna-acoes__alternar"
    [attr.aria-label]="expandida() ? 'Retrair coluna de ações' : 'Expandir coluna de ações'"
    [appTooltip]="expandida() ? 'Retrair' : 'Expandir'"
    (click)="alternar()"
>
    <app-icone [nome]="expandida() ? 'voltar' : 'chevron'" />
</button>

<div class="coluna-acoes__itens">
    <ng-content />
</div>
```

`coluna-acoes.component.scss`:
```scss
@use "tema/breakpoints" as bp;

:host {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    width: 56px;
    padding: var(--space-8);
    background: var(--surface);
    border-right: 1px solid var(--border);
    align-self: stretch;
    transition: width 0.2s ease;

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
}

:host(.coluna-acoes--expandida) {
    width: 200px;
}

.coluna-acoes__alternar {
    align-self: flex-end;
    flex: none;
    margin-bottom: var(--space-8);
}

.coluna-acoes__itens {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    overflow-y: auto;
}

// Mobile: barra inferior fixa (mesmo racional de `.ficha-nav`) — rótulo sempre visível abaixo do
// ícone, sem o botão de alternar (decisão validada no POC visual do autor).
@include bp.mobile {
    :host {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 15;
        flex-direction: row;
        width: auto;
        height: auto;
        padding: 6px 6px calc(6px + env(safe-area-inset-bottom, 0px));
        border-right: 0;
        border-top: 1px solid var(--border-strong);
    }

    .coluna-acoes__alternar {
        display: none;
    }

    .coluna-acoes__itens {
        flex-direction: row;
        flex: 1;
        overflow: visible;
    }

    ::ng-deep .coluna-acoes__item {
        flex-direction: column;
        gap: 3px;
        min-height: bp.$alvo-toque;
        padding: 5px 1px;
    }

    ::ng-deep .coluna-acoes__item-rotulo {
        position: static !important;
        width: auto !important;
        height: auto !important;
        clip: auto !important;
        overflow: visible !important;
        white-space: normal !important;
        font-size: 9px;
        text-align: center;
    }
}
```

- [ ] **Step 5: Run the spec, verify it passes**

Run: `npm run test --workspace=frontend -- --include='**/coluna-acoes.component.spec.ts'`
Expected: PASS, all 5 assertions from Step 1.

- [ ] **Step 6: Add the `'membros'` icon**

`icone.component.ts` — add `| 'membros'` to the `IconeNome` union (append after `'fantasma'`), and extend the doc comment's trailing clause with: `; e 'membros', grupo de pessoas — item "Membros" de app-coluna-acoes e ação "Prévia de jogador" na dialog homônima.`

`icone.component.html` — add before the closing `}` `}` at line 560-561 (Tabler Icons "users" outline, MIT, same attribution convention as the other borrowed glyphs):
```html
@case ("membros") {
    <!-- Grupo de pessoas — recorte do ícone "users" da Tabler Icons (MIT), tabler.io/icons. -->
    <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
    <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
}
```

- [ ] **Step 7: Run the icon spec (snapshot/coverage of all cases, if one exists) and the full coluna-acoes spec again**

Run: `npm run test --workspace=frontend -- --include='**/icone.component.spec.ts' --include='**/coluna-acoes*.spec.ts'`
Expected: PASS.

- [ ] **Step 8: Document the primitive in `DESIGN.md`**

Append one short paragraph to the end of the "Painel flutuante, modal e painel lateral (`ui-17`)" section (`docs/design/DESIGN.md`) — do not rewrite the section, just add:

```markdown

`app-coluna-acoes` (`shared/ui/coluna-acoes/`, `campanha-detalhe-mestre-coluna-acoes.spec.md`) é uma
quarta forma, mais próxima do painel lateral de 500px que do painel flutuante: participa do fluxo
normal do layout (flex, nunca `position: fixed`) e empurra o conteúdo ao expandir/retrair em vez de
sobrepor. Substitui `.utilitario-flutuante` só na visão de mestre da campanha por ora — os outros 6
consumidores de `.utilitario-flutuante` (ficha, Iniciativa, campanha do jogador) migram em specs
futuras, mesmo padrão de rollout gradual de `ui-28`…`ui-32`.
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/shared/ui/coluna-acoes frontend/src/app/shared/icone/icone.component.ts frontend/src/app/shared/icone/icone.component.html docs/design/DESIGN.md
git commit -m "$(cat <<'EOF'
feat(shared-ui): adiciona primitivo app-coluna-acoes

Coluna lateral expansivel/retratil que participa do fluxo do layout (nunca
sobrepoe) — primeiro consumidor sera CampanhaDetalheMestre
(campanha-detalhe-mestre-coluna-acoes.spec.md). Icone 'membros' novo.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `EspectadorFichaCard` ganha modo interativo (`[mostrarAcoes]`)

**Files:**
- Modify: `frontend/src/app/modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.ts`
- Modify: `frontend/src/app/modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.html`
- Modify: `frontend/src/app/modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.scss`
- Modify: `frontend/src/app/modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.spec.ts`

**Interfaces:**
- Consumes: `BotaoIcone` (`shared/ui/botao-icone`), `Icone`, `Tooltip` — all already available in the module tree.
- Produces: `EspectadorFichaCard` gains inputs `mostrarAcoes = input(false)`, `menuAberto = input(false)` (whether **this** card's kebab menu is open — driven by the parent, same pattern as `CampanhaDetalheMestre.menuFichaAberto()?.id === ficha.id`), and outputs `abrirFicha = output<void>()`, `alternarMenu = output<MouseEvent>()`, `duplicar = output<void>()`, `remover = output<void>()`, `excluir = output<void>()`. When `mostrarAcoes()` is `false` (espectador's existing usage, unchanged), none of the new markup renders — behavior is 100% additive.

- [ ] **Step 1: Extend the component spec first (failing)**

Add to `espectador-ficha-card.component.spec.ts` (alongside its existing tests — read the file first to match its existing fixture-building helpers before appending):

```typescript
it('não renderiza abrir-ficha nem o menu quando mostrarAcoes é false (padrão, espectador)', () => {
  // fixture com [ficha]="..." apenas, sem [mostrarAcoes]
  expect(fixture.nativeElement.querySelector('.espectador-ficha__abrir-ficha')).toBeNull();
  expect(fixture.nativeElement.querySelector('.espectador-ficha__menu-botao')).toBeNull();
});

it('renderiza abrir-ficha e o gatilho do menu quando mostrarAcoes é true', () => {
  fixture.componentRef.setInput('mostrarAcoes', true);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.espectador-ficha__abrir-ficha')).not.toBeNull();
  expect(fixture.nativeElement.querySelector('.espectador-ficha__menu-botao')).not.toBeNull();
});

it('emite abrirFicha ao clicar no ícone de abrir', () => {
  fixture.componentRef.setInput('mostrarAcoes', true);
  fixture.detectChanges();
  const emitido = jasmine.createSpy();
  fixture.componentInstance.abrirFicha.subscribe(emitido);
  (fixture.nativeElement.querySelector('.espectador-ficha__abrir-ficha') as HTMLButtonElement).click();
  expect(emitido).toHaveBeenCalled();
});

it('emite duplicar/remover/excluir a partir do menu', () => {
  fixture.componentRef.setInput('mostrarAcoes', true);
  fixture.componentRef.setInput('menuAberto', true);
  fixture.detectChanges();
  const duplicar = jasmine.createSpy();
  fixture.componentInstance.duplicar.subscribe(duplicar);
  (fixture.nativeElement.querySelector('.espectador-ficha__menu-item--duplicar') as HTMLButtonElement).click();
  expect(duplicar).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run test --workspace=frontend -- --include='**/espectador-ficha-card.component.spec.ts'`
Expected: FAIL — new inputs/outputs/markup don't exist yet.

- [ ] **Step 3: Implement the inputs/outputs**

Edit `espectador-ficha-card.component.ts`:
```typescript
import { Component, input, output } from '@angular/core';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { BarraRecurso } from '../../../../shared/ui/barra-recurso/barra-recurso.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import type { ItemFicha } from '../../campanha-equipe.util';

export type EspectadorFichaCardDados = ItemFicha & { readonly donoNome: string };

@Component({
  selector: 'app-espectador-ficha-card',
  imports: [BarraRecurso, BotaoIcone, Icone, Tooltip],
  templateUrl: './espectador-ficha-card.component.html',
  styleUrl: './espectador-ficha-card.component.scss',
})
export class EspectadorFichaCard {
  readonly ficha = input.required<EspectadorFichaCardDados>();
  readonly ultimaRolagem = input<RolagemResumoDto | null>(null);
  readonly ultimaRolagemTempo = input<string | null>(null);

  /**
   * Modo interativo (`campanha-detalhe-mestre-coluna-acoes.spec.md`) — `false` por padrão
   * (comportamento original do espectador, só leitura, inalterado). O mestre liga para reusar
   * este cartão no Esquadrão em vez de duplicar a receita visual.
   */
  readonly mostrarAcoes = input(false);
  /** Se o menu "⋯" DESTE cartão está aberto — controlado pelo pai (mesmo padrão de `menuFichaAberto`). */
  readonly menuAberto = input(false);

  readonly abrirFicha = output<void>();
  readonly alternarMenu = output<MouseEvent>();
  readonly duplicar = output<void>();
  readonly remover = output<void>();
  readonly excluir = output<void>();
}
```

- [ ] **Step 4: Add the markup**

Edit `espectador-ficha-card.component.html` — add inside `.espectador-ficha__cabecalho`, right after the `__avatar` span closes (so the icon anchors to the avatar's top-right corner per spec entregável 3's "chip pequeno sobre a imagem"):

```html
@if (mostrarAcoes()) {
    <button
        app-botao-icone
        [redondo]="true"
        tamanho="mini"
        type="button"
        class="espectador-ficha__abrir-ficha"
        [attr.aria-label]="'Abrir ficha de ' + ficha().nome"
        [appTooltip]="'Abrir ficha'"
        (click)="abrirFicha.emit()"
    >
        <app-icone nome="visao-geral" />
    </button>
}
```

And at the end of `.espectador-ficha__corpo` (mirrors where `.detalhe__ficha-menu-botao` sits in the old rodapé), add the menu trigger — actual dropdown markup (positioned menu) stays owned by the **consumer** (`CampanhaDetalheMestre`, same `position: fixed` + raiz-do-template pattern the old code used, since this card can sit inside an `overflow`+`mask-image` grid) — this component only exposes the trigger button and the outputs:

```html
@if (mostrarAcoes()) {
    <button
        app-botao-icone
        type="button"
        class="espectador-ficha__menu-botao"
        [attr.aria-label]="'Ações de ' + ficha().nome"
        [appTooltip]="'Ações de ' + ficha().nome"
        aria-haspopup="menu"
        [attr.aria-expanded]="menuAberto()"
        (click)="alternarMenu.emit($event)"
    >
        ⋯
    </button>
}
```

(The spec-file assertions for `.espectador-ficha__menu-item--duplicar` in Step 1 assumed the dropdown lived inside this component — correct that: since the dropdown must live at the consumer's template root for the same `overflow`/`mask-image` clipping reason documented in `detalhe.page.ts`'s `menuFichaAberto` comment, **revise Step 1's spec** to only assert the trigger button exists and emits `alternarMenu`, not that a `duplicar`/`remover`/`excluir` menu item exists inside this component. Rewrite the 4th spec test to:)

```typescript
it('emite alternarMenu ao clicar no gatilho "⋯"', () => {
  fixture.componentRef.setInput('mostrarAcoes', true);
  fixture.detectChanges();
  const emitido = jasmine.createSpy();
  fixture.componentInstance.alternarMenu.subscribe(emitido);
  (fixture.nativeElement.querySelector('.espectador-ficha__menu-botao') as HTMLButtonElement).click();
  expect(emitido).toHaveBeenCalled();
});
```

Drop the now-unused `duplicar`/`remover`/`excluir` outputs from the component entirely — the consumer owns the actual menu (calls its own `pedirDuplicar`/`removerDaCampanha`/`pedirExcluirFicha` directly from its own root-level dropdown, exactly like the old `detalhe.page.html` did), so `EspectadorFichaCard` only needs `abrirFicha` and `alternarMenu`. Update Step 3's component code accordingly (remove those 3 outputs and their import if unused).

- [ ] **Step 5: Add the SCSS for the two new controls**

Append to `espectador-ficha-card.component.scss`:
```scss
&__abrir-ficha {
    position: absolute;
    top: 4px;
    right: 4px;
    background: color-mix(in srgb, var(--surface) 70%, transparent);
}

&__menu-botao {
    align-self: flex-start;
    margin-left: auto;
    font-size: 16px;
    line-height: 1;
}
```

Add `position: relative;` to `.espectador-ficha__avatar` if not already present (it is — declared at line 40 in the file already read) so `&__abrir-ficha`'s `position: absolute` anchors to the avatar, not the whole card. Move `&__abrir-ficha` to be nested appropriately — since `.espectador-ficha__avatar` already has `position: relative`, place the button as a **sibling inside** `.espectador-ficha__avatar` in the HTML (Step 4), not inside `__cabecalho`, so the absolute positioning resolves against the avatar square, not the full-width header row. Revise Step 4's HTML placement: nest the `@if (mostrarAcoes())` abrir-ficha button **inside** the `<span class="espectador-ficha__avatar">` element, after the `@if (ficha().imagemUrl; ...)` image block.

- [ ] **Step 6: Run the spec, verify it passes**

Run: `npm run test --workspace=frontend -- --include='**/espectador-ficha-card.component.spec.ts'`
Expected: PASS.

- [ ] **Step 7: Run the espectador page spec too (regression check — default `mostrarAcoes=false` must not change its rendering)**

Run: `npm run test --workspace=frontend -- --include='**/espectador.page.spec.ts'`
Expected: PASS, unchanged.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/modules/campanha/componentes/espectador-ficha-card
git commit -m "$(cat <<'EOF'
feat(campanha): EspectadorFichaCard ganha modo interativo opt-in

[mostrarAcoes] (default false, espectador inalterado) adiciona o icone
"abrir ficha" sobre o avatar e o gatilho do menu "..." — o mestre vai
reusar o cartao no Esquadrao em vez de duplicar a receita visual
(campanha-detalhe-mestre-coluna-acoes.spec.md, entregavel 3).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `CampanhaDetalheJogador` (regressão byte-a-byte)

**Files:**
- Create: `frontend/src/app/modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.ts`
- Create: `frontend/src/app/modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.html`
- Create: `frontend/src/app/modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.scss`
- Create: `frontend/src/app/modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.spec.ts`

**Interfaces:**
- Consumes: `CampanhaDetalheDadosService` (injected, **not** provided here — provided by `CampanhaDetalheShell` in Task 6, this component just does `inject(CampanhaDetalheDadosService)`), all signals/computed from the Ownership Map's shared section.
- Produces: `CampanhaDetalheJogador`, selector `app-campanha-detalhe-jogador`, no inputs (reads everything from the injected service + its own `ActivatedRoute` only for nothing — `id` comes from the service).

- [ ] **Step 1: Create `detalhe-jogador.page.ts`**

Start from `detalhe.page.ts` (currently `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`) and produce a new class `CampanhaDetalheJogador` containing exactly the members listed under "`CampanhaDetalheJogador`-only" in the Ownership Map, plus:
- `protected readonly dados = inject(CampanhaDetalheDadosService);` and replace every reference to the moved-to-service members (`this.campanha` → `this.dados.campanha`, `this.membros` → `this.dados.membros`, `this.fichas` → `this.dados.fichas`, `this.membrosOrdenados` → `this.dados.membrosOrdenados`, `this.fichasPorMembro` → `this.dados.fichasPorMembro`, `this.usuarioAtivoId` → `this.dados.usuarioAtivoId`, `this.ehMestre` → always `false` here — **delete every `ehMestre()` branch/reference entirely**, since this component only ever renders for a jogador (the shell already gated on it) —, `this.inventarioEsquadrao`/`this.carregarInventario` → `this.dados.inventarioEsquadrao`/`this.dados.carregarInventario()`, `this.rolagensFeed` → `this.dados.rolagensFeed`, `this.carregandoRolagens` → `this.dados.carregandoRolagens`, `this.agora` → `this.dados.agora`, `this.textoAtualizacao` → `this.dados.textoAtualizacao` (unused by jogador template, drop the reference if the template doesn't need it — verify against Step 2), `this.id` → `this.dados.id`, `this.sincronizarSalasFicha`/`this.salasFichaAtivas` stay gone (service-owned), `this.recarregarMembrosEFichas()` → `this.dados.recarregarMembrosEFichas()`).
- Remove the constructor's tempo-real wiring block entirely (now in the service) **except** the two jogador-specific subscriptions that must stay local: the `fichaAlterada$` filter→`absorverFichaExibidaRemota` subscription, and the `FichaRolagemRegistroService.registrada$`→`onRolagemRegistradaEmbutida` subscription (both need `this.fichaExibidaId()`, jogador-local state) — keep `private readonly tempoRealService = inject(TempoRealService);` only for these two.
- Keep the `effect()` that resets `destinoMobileFicha` on `fichaExibidaId()` change, and the `effect()` + `this.fichaEdicao.inicializar(...)`/`this.fichaRolagemRegistro.inicializar(...)` wiring exactly as-is (jogador-local providers, unchanged).
- Keep the `carregar(mostrarEsqueleto: boolean)` **seeding logic** for `fichaExibidaId` (today embedded in `CampanhaDetalhe.carregar()`'s `next` callback) — but since fetching now lives in the shared service, replace it with an `effect()` here that seeds `fichaExibidaId` the first time `this.dados.fichas()` becomes non-empty and `fichaExibidaId()` is still `null`:
  ```typescript
  effect(() => {
    const fichas = this.dados.fichas();
    if (this.fichaExibidaId() !== null || fichas.length === 0) return;
    const propria = fichas.find((ficha) => ficha.usuarioId === this.dados.usuarioAtivoId());
    if (propria) untracked(() => this.fichaExibidaId.set(propria.id));
  });
  ```
- `@Component` decorator: `selector: 'app-campanha-detalhe-jogador'`, same `imports` array as today minus anything now proven mestre-only (`InventarioEsquadraoSidebar` stays — jogador uses it too for `exibindoInventarioJogador`; verify against the HTML in Step 2 which imports survive), `providers: [FichaEdicaoService, FichaRolagemRegistroService]` (unchanged, jogador-local).

- [ ] **Step 2: Create `detalhe-jogador.page.html`**

Copy `detalhe.page.html` lines 92–193 (jogador esqueleto branch, the `} @else {` at line 92 through its closing `}` at line 193) and lines 1060–1370 (the jogador `@else` content branch) **verbatim**, replacing every `campanha()`/`membros()`/`fichas()`/`membrosOrdenados()`/`ehMestre()`/`usuarioAtivoId()`/`inventarioEsquadrao()`/`fichasDestinoInventario()` reference with `dados.campanha()`/`dados.membros()`/etc (drop `ehMestre()` calls — always in the jogador template path here, so any `@if (ehMestre())`/`@else` pair collapses to just its `@else` content, and any bare `ehMestre()` check gating a jogador-only action, e.g. inside the "⋯" menu block, is simply always-true and its condition can be dropped). Wrap the whole thing in the same outer `<section class="detalhe" [class.detalhe--lateral-aberta]="...">` structure (reuse `historicoSidebarAberto()`/`inventarioSidebarAberto()`, now local signals — unaffected by the split, they were already page-local, not campanha-wide). Keep the header (`detalhe__cabecalho`) exactly as it is for the jogador path today: voltar, `HistoricoRolagensSidebar` (bound to `dados.rolagensFeed()`/`dados.carregandoRolagens()`), `CalculadoraFlutuante`, `CadernoFlutuante` (bound to `dados.usuarioAtivoId()`/`dados.membros()`, with `[ehMestre]="false"` hardcoded), the jogador's own "⋯" kebab (lines 352–440 of the original, `menuAberto` replacing `menuCampanhaAberto`). Keep the description paragraph and the `fichaCritica()` banner (both un-gated by role today — see Ownership Map note). Do **not** include the `editando()`/`formularioEdicao` inline-edit block, nor the `detalhe__estatisticas` stripe, nor the "Rolagens Recentes" tira (all three are `ehMestre()`-gated today, per the structural analysis in this plan's preamble — confirm this against the actual file one more time while porting, since a misread here would silently regress the jogador view).

Also copy `dialogVincular` modal (lines 1376–1432), the ficha-menu-fora-da-lista block is **not needed** (that belongs to the mestre's `.detalhe__esquadrao-grid`, jogador never had it), `previewAvatar`'s portal **is** needed (jogador's Equipe sidebar uses `agendarPreviewAvatar`/`cancelarPreviewAvatar` on teammate avatars — keep the `@if (previewAvatar(); as preview)` block, lines 1492–1500), and skip `confirmandoDuplicar`/`dialogAcessoFicha` — wait, `dialogAcessoFicha` **is** jogador-owned (Ownership Map confirms it), so copy that modal block (lines 1535–1595) too. `confirmandoDuplicar` is mestre-only (ficha duplication from the Esquadrão menu) — do not copy it.

- [ ] **Step 3: Create `detalhe-jogador.page.scss`**

Copy the full `detalhe.page.scss` **as-is** for now (Task 6 will strip out mestre-only selectors after the mestre page has its own stylesheet and both are verified working — don't prematurely trim shared BEM classes like `.detalhe__jogador*`/`.rolagem-pill*`/`.acesso__*`/`.dialogo__*` that both pages might still reference by the same class names; duplication here is temporary and resolved in Task 6's cleanup step, not left permanently).

- [ ] **Step 4: Port the spec**

Take `detalhe.page.spec.ts`'s jogador-focused test cases (grep the file for `describe`/`it` blocks that set up a jogador role membro and assert jogador-only behavior — e.g. ficha exibida, vincular ficha, acesso de visualização, sessão/rolagens) into `detalhe-jogador.page.spec.ts`. Provide `CampanhaDetalheDadosService` via `TestBed`'s `providers` with a **test double** (a plain object satisfying the signals the component reads, or the real service backed by mocked `CampanhaService`/`FichaService`/etc — prefer the real service with mocked HTTP providers, matching how `detalhe.page.spec.ts` already mocks `CampanhaService.recuperarCampanha` etc., since that's proven to work and avoids re-deriving a fake signal surface).

- [ ] **Step 5: Run the focused test**

Run: `npm run test --workspace=frontend -- --include='**/detalhe-jogador.page.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe-jogador
git commit -m "$(cat <<'EOF'
feat(campanha): extrai CampanhaDetalheJogador do CampanhaDetalhe

Reproducao byte-a-byte do ramo jogador do CampanhaDetalhe atual, agora
consumindo CampanhaDetalheDadosService — nenhuma mudanca visual ou
funcional (campanha-detalhe-mestre-coluna-acoes.spec.md, entregavel 1).
Ainda sem rota propria (Task 6 desta serie).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `CampanhaDetalheShell` + route split + delete old `CampanhaDetalhe`

**Files:**
- Create: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe-shell.page.ts`
- Create: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe-shell.page.html`
- Create: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe-shell.page.spec.ts`
- Modify: `frontend/src/app/modules/campanha/campanha.routes.ts`
- Delete: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`, `.html`, `.scss`, `.spec.ts`

**Interfaces:**
- Produces: `CampanhaDetalheShell`, selector `app-campanha-detalhe-shell`, `providers: [CampanhaDetalheDadosService]`. Calls `dados.inicializar(Number(route.snapshot.paramMap.get('id')))` in its constructor, then the template renders `@if (dados.carregando()) { <esqueleto genérico ou reusa um dos dois esqueletos existentes> } @else if (dados.ehMestre()) { <app-campanha-detalhe-mestre /> } @else { <app-campanha-detalhe-jogador /> }`.

- [ ] **Step 1: Create the shell component**

```typescript
// detalhe-shell.page.ts
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { CampanhaDetalheDadosService } from './campanha-detalhe-dados.service';
import { CampanhaDetalheMestre } from '../detalhe-mestre/detalhe-mestre.page';
import { CampanhaDetalheJogador } from '../detalhe-jogador/detalhe-jogador.page';

/**
 * Casca de `/campanhas/:id` — resolve o papel do usuário (`CampanhaDetalheDadosService.ehMestre`)
 * e monta `CampanhaDetalheMestre` ou `CampanhaDetalheJogador`. Único ponto de fetch/assinatura de
 * socket compartilhado entre os dois papéis (`campanha-detalhe-mestre-coluna-acoes.spec.md`,
 * entregável 1) — a instância de `CampanhaDetalheDadosService` vive e morre com esta rota.
 */
@Component({
  selector: 'app-campanha-detalhe-shell',
  imports: [CampanhaDetalheMestre, CampanhaDetalheJogador],
  providers: [CampanhaDetalheDadosService],
  templateUrl: './detalhe-shell.page.html',
})
export class CampanhaDetalheShell {
  private readonly rotaAtiva = inject(ActivatedRoute);
  protected readonly dados = inject(CampanhaDetalheDadosService);

  constructor() {
    this.dados.inicializar(Number(this.rotaAtiva.snapshot.paramMap.get('id')));
  }
}
```

```html
<!-- detalhe-shell.page.html -->
@if (dados.carregando()) {
  <!-- Esqueleto genérico enquanto o papel ainda não é conhecido — o autor confirmou no POC visual
       que cair sempre no esqueleto de JOGADOR (mesma decisão que o comentário original de
       `CampanhaDetalhe` já documentava) é aceitável, já que `membros()` chega e resolve o papel
       antes de qualquer conteúdo real aparecer. -->
  <app-campanha-detalhe-jogador />
} @else if (dados.ehMestre()) {
  <app-campanha-detalhe-mestre />
} @else {
  <app-campanha-detalhe-jogador />
}
```

Note: `<app-campanha-detalhe-jogador>` rendered during `carregando()` will itself run its own constructor logic against an empty `dados.fichas()`/`dados.membros()` — verify this doesn't throw (it shouldn't: every `@if (campanha(); as campanhaAtual)` gate in the jogador template already handles the `null` case with its own esqueleto branch, mirroring today's behavior where the single component handled both states). If this proves awkward in Step 3's live check, the fallback is to keep the esqueleto markup **inline in the shell** (duplicating the ~40 lines of skeleton markup from the old `detalhe.page.html`'s jogador esqueleto branch) instead of mounting a real child component prematurely — prefer that if any warning/error surfaces.

- [ ] **Step 2: Update `campanha.routes.ts`**

```typescript
import { Routes } from '@angular/router';

export const campanhaRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./paginas/lista/lista.page').then((modulo) => modulo.CampanhaLista),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./paginas/detalhe/detalhe-shell.page').then((modulo) => modulo.CampanhaDetalheShell),
  },
];
```

- [ ] **Step 3: Delete the old monolithic component**

```bash
git rm frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
```

- [ ] **Step 4: Trim `detalhe-jogador.page.scss`**

Now that `detalhe.page.scss` no longer exists as a shared source, review `detalhe-jogador.page.scss` (copied wholesale in Task 5 Step 3) and remove every selector block that is provably mestre-only per the Ownership Map (`&__coluna--membros`, `&__membro*` outside `.acesso__*`, `&__esquadrao-grid`/`&__ficha-card*`/`&__ficha-avatar*`/`&__ficha-recurso*`/`&__ficha-rodape*`/`&__ficha-reacoes*`/`&__ficha-menu*`/`&__nova-ficha`/`&__estatisticas`/`&__stat-*`/`&__convite*`/`&__codigo`/`&__copiar*`/`&__regenerar*`/`&__abrir-painel-espectador`/`&__encontro*`/`&__rolagens` (the tira, not `&__rolagens-painel` which is jogador's own card)/`&__banner-*` — **keep** `&__banner-*` (fichaCritica banner is jogador-visible too!) — cross-check every removal against the Ownership Map's "stays for jogador" note before deleting. When uncertain about one selector, leave it in rather than guess — a few unused bytes of CSS are a much smaller risk than silently breaking the jogador view.

- [ ] **Step 5: Build, run the campanha module's full spec suite**

Run: `npm run build --workspace=frontend`
Expected: clean compile.

Run: `npm run test --workspace=frontend -- --include='**/modules/campanha/**/*.spec.ts'`
Expected: PASS (includes `detalhe-shell.page.spec.ts` — write it now if not already: a minimal spec asserting the shell renders `app-campanha-detalhe-jogador` when `dados.ehMestre()` is false and `app-campanha-detalhe-mestre` when true, using the same `CampanhaService`/`FichaService` mock pattern as the other specs in this module).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(campanha): divide /campanhas/:id em shell + mestre/jogador

CampanhaDetalheShell resolve o papel e monta CampanhaDetalheMestre ou
CampanhaDetalheJogador; o CampanhaDetalhe monolitico antigo sai
(campanha-detalhe-mestre-coluna-acoes.spec.md, entregavel 1). O redesenho
de mestre ainda esta pendente (proximas tasks desta serie) — por ora
CampanhaDetalheMestre eh so um esqueleto minimo para o shell compilar.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

> **Sequencing note:** Task 6 references `CampanhaDetalheMestre` before it fully exists with the redesigned UI. Create a **minimal placeholder** `detalhe-mestre.page.ts/.html` in this task (just enough to compile: injects `CampanhaDetalheDadosService`, renders the campaign name and a "TODO redesenho" placeholder `<p>`) so the shell and its spec compile and pass, then Task 7 replaces the placeholder body with the real redesign. This keeps every task's build/test gate green rather than leaving the tree broken between tasks.

---

## Task 7: `CampanhaDetalheMestre` skeleton (header, coluna-acoes shell, Esquadrão/Criaturas grid)

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.ts` (replace placeholder from Task 6)
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.html`
- Create: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.scss`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.spec.ts`

**Interfaces:**
- Consumes: `CampanhaDetalheDadosService` (injected), `ColunaAcoes`/`ColunaAcoesItem`, `EspectadorFichaCard` (with `[mostrarAcoes]="true"`), `FichaFlutuante` (from its new `modules/ficha` home), `CalculadoraFlutuante`, `CadernoFlutuante`, `Icone`, `Botao`, `BotaoIcone`, `Cartao`, `Tooltip`, `OverflowFade`.
- Produces: `CampanhaDetalheMestre`, selector `app-campanha-detalhe-mestre`. This task ships the header + Esquadrão/Criaturas grid + `FichaFlutuante` wiring; dialogs (Membros/Convites) and the fixed Rolagens⇆Inventário panel are stubbed as empty `@if (false)` placeholders here and filled in Tasks 8–10 (each of those tasks is independently testable on top of this one, per the file-structure principle).

- [ ] **Step 1: Write/extend the component spec for the pieces this task ships**

```typescript
// detalhe-mestre.page.spec.ts — focus on what Task 7 delivers
it('renderiza a coluna de ações com Iniciativa, Editar, Excluir, Calculadora, Caderno', () => {
  // fixture com dados.ehMestre() true, dados.campanha() preenchida
  const itens = fixture.nativeElement.querySelectorAll('[app-coluna-acoes-item]');
  const rotulos = Array.from(itens).map((el) => (el as HTMLElement).textContent?.trim());
  expect(rotulos).toContain('Iniciativa');
  expect(rotulos).toContain('Editar');
  expect(rotulos).toContain('Excluir');
  expect(rotulos).toContain('Calculadora');
  expect(rotulos).toContain('Caderno');
});

it('não renderiza mais o banner de ficha crítica nem a coluna Membros ao lado do Esquadrão', () => {
  expect(fixture.nativeElement.querySelector('.detalhe-mestre__banner-alerta')).toBeNull();
  expect(fixture.nativeElement.querySelector('.detalhe-mestre__coluna--membros')).toBeNull();
});

it('renderiza o Esquadrão em grid de 3 colunas usando app-espectador-ficha-card interativo', () => {
  const cartoes = fixture.nativeElement.querySelectorAll('app-espectador-ficha-card');
  expect(cartoes.length).toBeGreaterThan(0);
});

it('abre a ficha flutuante ao clicar em "Abrir ficha" de um cartão do Esquadrão', () => {
  const spy = spyOn(fixture.componentInstance.fichaFlutuanteRef()!, 'abrir');
  const cartao = fixture.debugElement.query(By.directive(EspectadorFichaCard));
  cartao.componentInstance.abrirFicha.emit();
  expect(spy).toHaveBeenCalled();
});
```

(Adapt exact selectors/assertions to whatever class names Steps 3–4 below actually produce — write these first, expect them to fail, then make the implementation match, not the reverse.)

- [ ] **Step 2: Run to confirm failure**

Run: `npm run test --workspace=frontend -- --include='**/detalhe-mestre.page.spec.ts'`
Expected: FAIL (placeholder from Task 6 doesn't have any of this markup).

- [ ] **Step 3: Implement `detalhe-mestre.page.ts`**

Port from the old `detalhe.page.ts` exactly the members listed under "`CampanhaDetalheMestre`-only" in the Ownership Map that Task 7 needs (defer the Membros/Convites-dialog-only members to Tasks 8–9, and the painel-lateral toggle to Task 10 — but it's fine to bring all mestre-only state in now if simpler; **do not** wire the not-yet-built dialog templates to it until their own tasks land, to keep each task's diff reviewable against its own spec). At minimum for this task:

```typescript
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';
import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { CadernoFlutuante } from '../../../pagina-caderno/caderno-flutuante.component';
import { FichaFlutuante } from '../../../ficha/componentes/ficha-flutuante/ficha-flutuante.component';
import type { FichaFlutuanteAlvo } from '../../../ficha/componentes/ficha-flutuante/ficha-flutuante.model';
import { EspectadorFichaCard } from '../../componentes/espectador-ficha-card/espectador-ficha-card.component';
import { ColunaAcoes } from '../../../../shared/ui/coluna-acoes/coluna-acoes.component';
import { ColunaAcoesItem } from '../../../../shared/ui/coluna-acoes/coluna-acoes-item.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Cartao } from '../../../../shared/ui/cartao/cartao.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { rotuloNivelAmeaca } from '../../../ficha/rotulos-criatura';
import { TipoFichaEnum } from '@contratados-rpg/shared/enums';
// ... ItemCriatura interface copied verbatim from the old file ...

@Component({
  selector: 'app-campanha-detalhe-mestre',
  imports: [
    RouterLink, ColunaAcoes, ColunaAcoesItem, EspectadorFichaCard, FichaFlutuante,
    CalculadoraFlutuante, CadernoFlutuante, Botao, BotaoIcone, Cartao, Icone, OverflowFade,
  ],
  templateUrl: './detalhe-mestre.page.html',
  styleUrl: './detalhe-mestre.page.scss',
})
export class CampanhaDetalheMestre {
  protected readonly dados = inject(CampanhaDetalheDadosService);
  private readonly confirmacaoService = inject(ConfirmacaoService);

  protected readonly fichaFlutuanteRef = viewChild<FichaFlutuante>('fichaFlutuante');

  protected readonly fichasEsquadrao = /* copiado verbatim de CampanhaDetalhe.fichasEsquadrao,
    trocando this.membrosOrdenados()/this.fichasPorMembro() por this.dados.* */;
  protected readonly criaturasEsquadrao = /* copiado verbatim, trocando this.fichas() por this.dados.fichas() */;

  protected abrirFichaFlutuante(ficha: { id: number; usuarioId: number }, tipo: typeof TipoFichaEnum.JOGADOR | typeof TipoFichaEnum.CRIATURA): void {
    this.fichaFlutuanteRef()?.abrir({ fichaId: ficha.id, tipo, usuarioIdDono: ficha.usuarioId });
  }

  // menuFichaAberto/menuFichaPosicao/alternarMenuFicha/fecharMenuFicha/previewAvatar/
  // agendarPreviewAvatar/cancelarPreviewAvatar/confirmandoDuplicar/duplicando/pedirDuplicar/
  // cancelarDuplicar/confirmarDuplicar/removendo/pedirExcluirFicha/excluirFicha/caminhoFicha/
  // caminhoCriatura/abrirFichaDuploClique/abrirFichaCliqueDoMeio/abrirCriaturaDuploClique/
  // abrirCriaturaCliqueDoMeio/cliqueEmControlePropio/abrirCriarFicha/abrirCriarCriatura —
  // todos copiados verbatim do CampanhaDetalhe original, FichaService/Router injetados aqui.

  // editando/salvando/formularioEdicao/abrirEdicao/cancelarEdicao/salvarEdicao/pedirExclusao/
  // excluirCampanha — copiados verbatim (FormBuilder/Router injetados aqui).
}
```

- [ ] **Step 4: Implement `detalhe-mestre.page.html`**

Header: reuse the old mestre header structure (voltar, `HistoricoRolagensSidebar` — **wait**, per entregável 3 the Rolagens/Inventário sidebars are replaced by the always-mounted right panel (Task 10) — do **not** include `<app-historico-rolagens-sidebar>`/`<app-inventario-esquadrao-sidebar>` in the mestre header at all; they're jogador-only now), `CalculadoraFlutuante`, `CadernoFlutuante` — but per entregável 3, Calculadora and Caderno move into the **coluna de ações**, not the header. Header keeps only: voltar button, campaign title, estado Na Base/Em Missão toggle.

Root structure:
```html
<div class="detalhe-mestre" [class.detalhe-mestre--carregando]="dados.carregando()">
  @if (dados.carregando()) {
    <!-- esqueleto — reusar a mesma silhueta do antigo, adaptada às novas classes BEM -->
  } @else if (dados.campanha(); as campanhaAtual) {
    <app-coluna-acoes id="campanha-detalhe-mestre" rotulo="Ações da campanha">
      <button app-coluna-acoes-item icone="membros" appTooltip="Membros" (click)="dialogMembrosAberta.set(true)">Membros</button>
      <a app-coluna-acoes-item icone="combate" appTooltip="Iniciativa" [routerLink]="['/campanhas', campanhaAtual.id, 'iniciativa']">Iniciativa</a>
      <button app-coluna-acoes-item icone="convite" appTooltip="Convites" (click)="dialogConvitesAberta.set(true)">Convites</button>
      <button app-coluna-acoes-item icone="editar" appTooltip="Editar campanha" (click)="abrirEdicao()">Editar</button>
      <button app-coluna-acoes-item icone="excluir" appTooltip="Excluir campanha" (click)="pedirExclusao()">Excluir</button>
      <button app-coluna-acoes-item icone="calculadora" appTooltip="Calculadora" (click)="calculadoraAberta.set(true)">Calculadora</button>
      <button app-coluna-acoes-item icone="anotacoes" appTooltip="Caderno" (click)="cadernoAberto.set(true)">Caderno</button>
    </app-coluna-acoes>

    <div class="detalhe-mestre__conteudo">
      <header class="detalhe-mestre__cabecalho">
        <a app-botao-icone routerLink="/campanhas" aria-label="Voltar às campanhas" [appTooltip]="'Voltar às campanhas'">
          <app-icone nome="voltar" />
        </a>
        <h1 class="detalhe-mestre__titulo">{{ campanhaAtual.nome }}</h1>
        <button app-botao class="detalhe-mestre__estado-operacional" type="button" (click)="dados.alterarEstadoCampanha()">
          <!-- idem ao antigo -->
        </button>
      </header>

      @if (editando()) {
        <!-- form de edição, copiado verbatim -->
      } @else if (campanhaAtual.descricao) {
        <p class="detalhe-mestre__descricao">{{ campanhaAtual.descricao }}</p>
      }

      <section class="detalhe-mestre__esquadrao">
        <header class="detalhe-mestre__secao">
          <h2 class="detalhe-mestre__secao-titulo">Esquadrão</h2>
          <span class="detalhe-mestre__secao-regua"></span>
          <span class="detalhe-mestre__secao-contagem" aria-hidden="true">{{ fichasEsquadrao().length }}</span>
          <button app-botao variante="secundario" type="button" (click)="abrirCriarCriatura()">
            <app-icone nome="alerta" /> Nova Criatura
          </button>
          <button app-botao variante="primario" type="button" (click)="abrirCriarFicha()">
            <app-icone nome="novo-agente" /> Novo Agente
          </button>
          @if (dados.textoAtualizacao(); as texto) { <span class="detalhe-mestre__secao-atualizado">{{ texto }}</span> }
        </header>

        <ul class="detalhe-mestre__esquadrao-grid" appOverflowFade>
          @for (ficha of fichasEsquadrao(); track ficha.id) {
            <li>
              <app-espectador-ficha-card
                [ficha]="ficha"
                [mostrarAcoes]="true"
                [menuAberto]="menuFichaAberto()?.id === ficha.id"
                (abrirFicha)="abrirFichaFlutuante(ficha, TipoFichaEnum.JOGADOR)"
                (alternarMenu)="alternarMenuFicha(ficha, $event)"
              />
            </li>
          }
        </ul>

        <!-- Criaturas: mesma grid, cartão próprio (EspectadorFichaCard espera ItemFicha — uma
             criatura não tem essa forma; manter a marcação de criatura própria copiada do antigo
             `.detalhe__ficha-card` para criaturas, já que o card novo não cobre esse tipo de dado
             — a spec só pede reuso do EspectadorFichaCard para as fichas de JOGADOR). -->
        <header class="detalhe-mestre__secao detalhe-mestre__secao--criaturas">
          <h2 class="detalhe-mestre__secao-titulo">Criaturas</h2>
          <span class="detalhe-mestre__secao-regua"></span>
          <span class="detalhe-mestre__secao-contagem" aria-hidden="true">{{ criaturasEsquadrao().length }}</span>
        </header>
        <ul class="detalhe-mestre__esquadrao-grid" appOverflowFade>
          @for (criatura of criaturasEsquadrao(); track criatura.id) {
            <!-- estrutura de card de criatura copiada verbatim do detalhe.page.html antigo
                 (linhas 1001-1057), com (click) de abrir substituído por
                 abrirFichaFlutuante(criatura, TipoFichaEnum.CRIATURA) no lugar do routerLink,
                 já que criatura agora abre na janela flutuante também (spec entregável 3 não
                 restringe "Abrir ficha" a fichas de jogador — o texto fala em "cada card"). -->
          }
        </ul>
      </section>

      <!-- Painel fixo Rolagens⇆Inventário: Task 10 -->
      <!-- Dialog Membros: Task 8 -->
      <!-- Dialog Convites: Task 9 -->
    </div>
  }

  <app-ficha-flutuante #fichaFlutuante [ehMestre]="true" />
  <app-calculadora-flutuante [(aberta)]="calculadoraAberta" />
  @if (dados.usuarioAtivoId(); as usuarioId) {
    <app-caderno-flutuante
      [campanhaId]="dados.campanha()!.id"
      [campanhaNome]="dados.campanha()!.nome"
      [usuarioAtivoId]="usuarioId"
      [ehMestre]="true"
      [membros]="dados.membros()"
      (abrirFicha)="abrirAnotacoesFicha($event)"
    />
  }
</div>
```

Note: since `abrirFichaFlutuante`'s signature takes `(ficha, tipo)`, and `criaturasEsquadrao()` items don't carry `usuarioId` (an `ItemCriatura` has no owner), decide the `usuarioIdDono` for a criatura — criaturas belong to the mestre (per `FichaFlutuanteConteudo.ajustavel`'s rule, "mestre sempre edita"), so pass `usuarioIdDono: dados.usuarioAtivoId()!` for criaturas specifically (the mestre is always the viewer here, so `ajustavel` resolves `true` either way, but keep the value semantically correct — check `FichaService`'s criatura resumo DTO for an actual owner field before hardcoding; if `FichaResumoDto` already carries `usuarioId` for criaturas too, e.g. the mestre's own id, use that instead of a synthetic value).

- [ ] **Step 5: SCSS**

Create `detalhe-mestre.page.scss` from scratch, reusing tokens the same way `espectador.page.scss`/old `detalhe.page.scss` do (`--largura-painel-lateral` is NOT used here — the right panel's width is its own new value, ~380–410px, introduced in Task 10). For this task, style: `.detalhe-mestre` as a flex row (`app-coluna-acoes` + `.detalhe-mestre__conteudo`), `.detalhe-mestre__conteudo` with **no `max-width`/no `90vw` centering** (per acceptance criteria — this is the one page in the app that intentionally breaks the `90vw` convention), `.detalhe-mestre__esquadrao-grid` as `grid-template-columns: repeat(3, minmax(0, 1fr))` collapsing to 2 at `bp.tablet` and 1 at `bp.mobile` (mirror `.espectador__ficha-grid`'s pattern, 3 columns instead of 2), `.detalhe-mestre__cabecalho`/`__titulo`/`__estado-operacional`/`__secao*` copied from the old `.detalhe__*` equivalents (token-driven, same visual language — this is the "componente análogo aprovado" comparison point for the design-fidelity gate).

- [ ] **Step 6: Run the spec from Step 1, iterate until green**

Run: `npm run test --workspace=frontend -- --include='**/detalhe-mestre.page.spec.ts'`
Expected: PASS.

- [ ] **Step 7: Build**

Run: `npm run build --workspace=frontend`
Expected: clean (catches any leftover reference to removed `ehMestre()`/`encontros` state, unused imports, etc).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe-mestre
git commit -m "$(cat <<'EOF'
feat(campanha): redesenha CampanhaDetalheMestre — coluna de acoes + grid 3col

Cabecalho enxuto, app-coluna-acoes substituindo o menu kebab + os botoes
flutuantes de calculadora/caderno, Esquadrao/Criaturas em grid de 3
colunas reusando EspectadorFichaCard (modo interativo), "Abrir ficha" via
FichaFlutuante (agora em modules/ficha). Sem banner de critico, sem
coluna Membros ao lado (campanha-detalhe-mestre-coluna-acoes.spec.md,
entregavel 3). Dialogs Membros/Convites e o painel fixo Rolagens/
Inventario ainda pendentes (proximas tasks desta serie).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Dialog "Membros" (com ação "Prévia de jogador" por linha)

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.html`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.scss`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.spec.ts`

**Interfaces:**
- Consumes: `Modal` (`shared/ui/modal`), `ConfirmacaoService`, `Router` (for `abrirPreviaJogador`'s navigation).
- Produces: `dialogMembrosAberta = signal(false)` (already wired as the "Membros" coluna-acoes item's click target in Task 7), plus all the mestre-only membro-management members from the Ownership Map.

- [ ] **Step 1: Extend the spec (failing)**

```typescript
it('abre a dialog Membros ao clicar no item da coluna de ações', () => {
  const itemMembros = fixture.debugElement.query(By.css('[app-coluna-acoes-item]'));
  (itemMembros.nativeElement as HTMLElement).click();
  fixture.detectChanges();
  expect(fixture.componentInstance.dialogMembrosAberta()).toBe(true);
  expect(fixture.nativeElement.querySelector('app-modal[titulo="Membros"]')).not.toBeNull();
});

it('lista os membros com a carteirinha compacta, sem clique', () => {
  fixture.componentInstance.dialogMembrosAberta.set(true);
  fixture.detectChanges();
  const carteirinhas = fixture.nativeElement.querySelectorAll('.detalhe-mestre__membro-carteirinha');
  expect(carteirinhas.length).toBeGreaterThan(0);
});

it('mostra a ação "Prévia" só para membros com papel JOGADOR', () => {
  fixture.componentInstance.dialogMembrosAberta.set(true);
  fixture.detectChanges();
  const acoesPreVia = fixture.nativeElement.querySelectorAll('[aria-label^="Pré-visualizar como"]');
  expect(acoesPreVia.length).toBe(/* número de membros JOGADOR no fixture */);
});

it('navega para a rota de prévia ao clicar na ação', () => {
  const router = TestBed.inject(Router);
  const navigateSpy = spyOn(router, 'navigate');
  fixture.componentInstance.dialogMembrosAberta.set(true);
  fixture.detectChanges();
  (fixture.nativeElement.querySelector('[aria-label^="Pré-visualizar como"]') as HTMLElement).click();
  expect(navigateSpy).toHaveBeenCalledWith(['/campanhas', jasmine.any(Number), 'previa', jasmine.any(Number)]);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm run test --workspace=frontend -- --include='**/detalhe-mestre.page.spec.ts'`
Expected: FAIL on the 4 new assertions.

- [ ] **Step 3: Implement the TS members**

Add to `detalhe-mestre.page.ts` (copied verbatim from the old `CampanhaDetalhe`, adjusting `this.membros`/`this.membrosOrdenados`/`this.fichasPorMembro` → `this.dados.*`):

```typescript
protected readonly dialogMembrosAberta = signal(false);
protected readonly acaoMembro = signal<number | null>(null);
protected readonly processandoMembro = signal(false);
protected readonly alterandoPapel = signal<number | null>(null);

protected readonly jogadoresDaCampanha = computed<readonly CampanhaMembroResumoDto[]>(() =>
  this.dados.membrosOrdenados().filter((membro) => membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR),
);

protected podeGerenciarMembro(membro: CampanhaMembroResumoDto): boolean {
  return membro.papel !== TipoCampanhaMembroPapelEnum.MESTRE;
}

// pedirRemocaoMembro/removerMembro/pedirTransferenciaMestre/cancelarAcaoMembro/
// confirmarTransferenciaMestre/papelAlvo/pedirAlterarPapelMembro/alterarPapelMembro —
// copiados verbatim, this.campanhaService injetado aqui, this.dados.recarregarMembrosEFichas()
// no lugar de this.recarregarMembrosEFichas().

protected abrirPreviaJogador(membro: CampanhaMembroResumoDto): void {
  this.dialogMembrosAberta.set(false);
  void this.router.navigate(['/campanhas', this.dados.id, 'previa', membro.usuarioId]);
}
```

Also copy `fichasPorMembro`-based lookup for the carteirinha (no `equipeExibicao` needed — see plan preamble's resolution: iterate `this.dados.membrosOrdenados()`, for each membro read `this.dados.fichasPorMembro().get(membro.usuarioId) ?? []`, render with `.detalhe-mestre__membro-carteirinha`).

- [ ] **Step 4: Implement the dialog template**

Add before the closing of `detalhe-mestre.page.html`'s root (sibling to the esquadrão section, still inside the `@else if (dados.campanha(); as campanhaAtual)` block so `campanhaAtual.id` is in scope):

```html
@if (dialogMembrosAberta()) {
  <app-modal [aberto]="true" titulo="Membros" (fechou)="dialogMembrosAberta.set(false)">
    <span modalIcone class="dialogo__icone"><app-icone nome="membros" /></span>

    <ul class="detalhe-mestre__membros-lista" appOverflowFade>
      @for (membro of dados.membrosOrdenados(); track membro.usuarioId) {
        <li class="detalhe-mestre__membro">
          <div class="detalhe-mestre__membro-linha">
            <span class="detalhe-mestre__avatar" aria-hidden="true"></span>
            <div class="detalhe-mestre__membro-identidade">
              <span class="detalhe-mestre__membro-nome">{{ membro.nome }}</span>
              <span class="chip-papel">
                <app-icone [nome]="membro.papel === TipoCampanhaMembroPapelEnum.MESTRE ? 'coroa' : membro.papel === TipoCampanhaMembroPapelEnum.ESPECTADOR ? 'fantasma' : 'protecoes'" />
                {{ membro.papel }}
              </span>
            </div>

            @if (membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR) {
              <button
                app-botao-icone
                tamanho="padrao"
                type="button"
                [attr.aria-label]="'Pré-visualizar como ' + membro.nome"
                [appTooltip]="'Prévia de jogador'"
                (click)="abrirPreviaJogador(membro)"
              >
                <app-icone nome="olho" />
              </button>
            }

            @if (podeGerenciarMembro(membro) && acaoMembro() !== membro.usuarioId) {
              <div class="detalhe-mestre__membro-acoes">
                @if (membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR) {
                  <button app-botao-icone tamanho="padrao" type="button" [attr.aria-label]="'Transferir o papel de mestre para ' + membro.nome" [appTooltip]="'Transferir mestre'" (click)="pedirTransferenciaMestre(membro)">
                    <app-icone nome="coroa" />
                  </button>
                }
                <button app-botao-icone tamanho="padrao" type="button" [disabled]="alterandoPapel() === membro.usuarioId" [attr.aria-label]="'Tornar ' + membro.nome + ' ' + (papelAlvo(membro) === TipoCampanhaMembroPapelEnum.ESPECTADOR ? 'Espectador' : 'Jogador')" [appTooltip]="papelAlvo(membro) === TipoCampanhaMembroPapelEnum.ESPECTADOR ? 'Tornar espectador' : 'Tornar jogador'" (click)="pedirAlterarPapelMembro(membro)">
                  <app-icone [nome]="papelAlvo(membro) === TipoCampanhaMembroPapelEnum.ESPECTADOR ? 'olho' : 'protecoes'" />
                </button>
                <button app-botao-icone tamanho="padrao" type="button" [attr.aria-label]="'Remover ' + membro.nome + ' da campanha'" [appTooltip]="'Remover'" (click)="pedirRemocaoMembro(membro)">
                  <app-icone nome="excluir" />
                </button>
              </div>
            }
          </div>

          @if (acaoMembro() === membro.usuarioId) {
            <!-- confirmação de transferência de mestre, copiada verbatim do antigo `.detalhe__membro-confirmacao` -->
          }

          @if (dados.fichasPorMembro().get(membro.usuarioId); as fichasDoMembro) {
            @for (ficha of fichasDoMembro; track ficha.id) {
              <span class="detalhe-mestre__membro-carteirinha" [attr.aria-label]="'Ficha de ' + ficha.nome">
                <span class="detalhe-mestre__membro-carteirinha-avatar" aria-hidden="true" [style.--cor-ficha]="ficha.cor">
                  @if (ficha.imagemUrl; as urlImagem) { <img [src]="urlImagem" alt="" /> }
                </span>
                <span class="detalhe-mestre__membro-carteirinha-corpo">
                  <span class="detalhe-mestre__membro-carteirinha-nome">{{ ficha.nome }}</span>
                  <span class="detalhe-mestre__membro-carteirinha-classe">{{ ficha.classeTexto }}</span>
                </span>
              </span>
            }
          }
        </li>
      }
    </ul>
  </app-modal>
}
```

- [ ] **Step 5: SCSS**

Add `.detalhe-mestre__membros-lista`/`__membro*`/`__avatar`/`__membro-carteirinha*` to `detalhe-mestre.page.scss`, copying the token usage from the old `.detalhe__membro*`/`.detalhe__equipe-carteirinha` rules (same visual language, same tokens — this is exactly the kind of block `design-fidelity` expects to be lifted from an approved analog, not invented).

- [ ] **Step 6: Run the spec, iterate to green**

Run: `npm run test --workspace=frontend -- --include='**/detalhe-mestre.page.spec.ts'`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe-mestre
git commit -m "$(cat <<'EOF'
feat(campanha): dialog Membros no CampanhaDetalheMestre

Gestao de membros (transferir mestre, alternar papel, remover) sai da
coluna sempre visivel e vira dialog aberta pela coluna de acoes; cada
jogador ganha a acao "Previa" (decisao do autor: por linha na dialog,
2026-09-08) — substitui o fluxo de 2 passos do menu kebab antigo
(campanha-detalhe-mestre-coluna-acoes.spec.md, entregavel 4).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Dialog "Convites"

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.html`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.scss`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.spec.ts`

**Interfaces:**
- Produces: `dialogConvitesAberta = signal(false)` (already wired in Task 7's coluna-acoes item), plus `regenerando`/`regenerado`/`copiado`/`regenerarConvite()`/`pedirRegenerarConvite()`/`copiarConvite()`/`regenerandoEspectador`/`regeneradoEspectador`/`copiadoEspectador`/`regenerarConviteEspectador()`/`pedirRegenerarConviteEspectador()`/`copiarConviteEspectador()`/`rotuloCopiarConvite()`/`rotuloRegenerarConvite()`.

- [ ] **Step 1: Extend the spec (failing)**

```typescript
it('abre a dialog Convites e mostra os dois códigos', () => {
  fixture.componentInstance.dialogConvitesAberta.set(true);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain(campanhaBase.codigoConvite);
  expect(fixture.nativeElement.textContent).toContain(campanhaBase.codigoConviteEspectador);
});

it('copia o código de jogador ao clicar em copiar', async () => {
  spyOn(navigator.clipboard, 'writeText').and.resolveTo();
  fixture.componentInstance.dialogConvitesAberta.set(true);
  fixture.detectChanges();
  fixture.componentInstance.copiarConvite();
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(campanhaBase.codigoConvite);
});

it('pede confirmação antes de regenerar o convite de espectador', () => {
  const confirmacao = TestBed.inject(ConfirmacaoService);
  const spy = spyOn(confirmacao, 'confirmar').and.resolveTo(false);
  fixture.componentInstance.pedirRegenerarConviteEspectador();
  expect(spy).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm run test --workspace=frontend -- --include='**/detalhe-mestre.page.spec.ts'`
Expected: FAIL.

- [ ] **Step 3: Implement the TS members**

Copy verbatim from the old `CampanhaDetalhe` (all 12 members listed above) — `this.campanha` → `this.dados.campanha`.

- [ ] **Step 4: Implement the dialog template**

```html
@if (dialogConvitesAberta()) {
  <app-modal [aberto]="true" titulo="Convites" (fechou)="dialogConvitesAberta.set(false)">
    <span modalIcone class="dialogo__icone"><app-icone nome="convite" /></span>

    <div class="detalhe-mestre__convite">
      <span class="detalhe-mestre__convite-rotulo">Convite de jogador</span>
      <div class="detalhe-mestre__convite-linha">
        <code class="detalhe-mestre__codigo">{{ campanhaAtual.codigoConvite }}</code>
        <button app-botao-icone tamanho="padrao" type="button" [class.detalhe-mestre__copiar--copiado]="copiado()" [attr.aria-label]="rotuloCopiarConvite(copiado(), 'jogador')" [appTooltip]="copiado() ? 'Código copiado' : 'Copiar código de convite'" (click)="copiarConvite()">
          <app-icone [nome]="copiado() ? 'check' : 'copiar'" />
        </button>
        <button app-botao-icone tamanho="padrao" type="button" [disabled]="regenerando()" [attr.aria-label]="rotuloRegenerarConvite(regenerando(), 'jogador')" [appTooltip]="'Regenerar convite'" (click)="pedirRegenerarConvite()">
          <app-icone [nome]="regenerado() ? 'check' : 'atualizar'" />
        </button>
      </div>
    </div>

    <div class="detalhe-mestre__convite">
      <span class="detalhe-mestre__convite-rotulo">Convite de espectador</span>
      <div class="detalhe-mestre__convite-linha">
        <code class="detalhe-mestre__codigo">{{ campanhaAtual.codigoConviteEspectador }}</code>
        <button app-botao-icone tamanho="padrao" type="button" [class.detalhe-mestre__copiar--copiado]="copiadoEspectador()" [attr.aria-label]="rotuloCopiarConvite(copiadoEspectador(), 'espectador')" [appTooltip]="copiadoEspectador() ? 'Código copiado' : 'Copiar código de convite'" (click)="copiarConviteEspectador()">
          <app-icone [nome]="copiadoEspectador() ? 'check' : 'copiar'" />
        </button>
        <button app-botao-icone tamanho="padrao" type="button" [disabled]="regenerandoEspectador()" [attr.aria-label]="rotuloRegenerarConvite(regenerandoEspectador(), 'espectador')" [appTooltip]="'Regenerar convite'" (click)="pedirRegenerarConviteEspectador()">
          <app-icone [nome]="regeneradoEspectador() ? 'check' : 'atualizar'" />
        </button>
        <a app-botao variante="secundario" [routerLink]="['/campanhas', campanhaAtual.id, 'espectador']" [appTooltip]="'Abrir o Painel do espectador em modo de prévia'">
          <app-icone nome="fantasma" /> Painel
        </a>
      </div>
    </div>
  </app-modal>
}
```

(`campanhaAtual` must be in scope — reference the `@if (dados.campanha(); as campanhaAtual)` binding established in Task 7's root template; if this dialog block sits outside that block's braces, either nest it inside or re-read `dados.campanha()!` directly.)

- [ ] **Step 5: SCSS**

Add `.detalhe-mestre__convite*`/`__codigo`/`__copiar--copiado` to the stylesheet, same token usage as the old `.detalhe__stat-convite*`.

- [ ] **Step 6: Run the spec, iterate to green**

Run: `npm run test --workspace=frontend -- --include='**/detalhe-mestre.page.spec.ts'`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe-mestre
git commit -m "$(cat <<'EOF'
feat(campanha): dialog Convites no CampanhaDetalheMestre

Os dois codigos de convite (jogador/espectador) saem da tira de
estatisticas sempre visivel e viram dialog aberta pela coluna de acoes —
mesmo conteudo e comportamento de copiar/regenerar de hoje, so de local
(campanha-detalhe-mestre-coluna-acoes.spec.md, entregavel 5).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Painel fixo Rolagens ⇆ Inventário (segmentado, sempre montado)

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.html`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.scss`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe-mestre/detalhe-mestre.page.spec.ts`

**Interfaces:**
- Consumes: `Segmentado`/`SegmentadoItem` (`shared/ui/segmentado`), `InventarioEsquadrao` (`modules/campanha/componentes/inventario-esquadrao`), the **content** of `HistoricoRolagensSidebar` — not the component itself (that component owns its own gatilho+overlay chrome, which this task explicitly does *not* want; port its `<ul>`/item markup inline instead, or extract a shared presentational sub-piece — see Step 3 for the concrete decision).
- Produces: `painelLateralAtivo = signal<'rolagens' | 'inventario'>('rolagens')`.

- [ ] **Step 1: Extend the spec (failing)**

```typescript
it('mostra o painel lateral sempre montado, alternando entre Rolagens e Inventário', () => {
  expect(fixture.nativeElement.querySelector('.detalhe-mestre__painel-lateral')).not.toBeNull();
  const itemInventario = fixture.nativeElement.querySelector('[app-segmentado-item]:nth-child(2)') as HTMLButtonElement;
  itemInventario.click();
  fixture.detectChanges();
  expect(fixture.componentInstance.painelLateralAtivo()).toBe('inventario');
  expect(fixture.nativeElement.querySelector('app-inventario-esquadrao')).not.toBeNull();
});

it('preserva o scroll de quem não está ativo ao alternar (os dois ficam montados)', () => {
  const painelRolagens = fixture.nativeElement.querySelector('.detalhe-mestre__painel-rolagens');
  const painelInventario = fixture.nativeElement.querySelector('.detalhe-mestre__painel-inventario');
  expect(painelRolagens).not.toBeNull();
  expect(painelInventario).not.toBeNull();
  // ambos existem no DOM simultaneamente — a alternância é por [hidden]/CSS, não @if
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm run test --workspace=frontend -- --include='**/detalhe-mestre.page.spec.ts'`
Expected: FAIL.

- [ ] **Step 3: Decide and implement the Rolagens content**

`HistoricoRolagensSidebar` is a self-contained gatilho+overlay component (`:host { display: contents }`, owns its own `aberto`/`painelRenderizado`/`saindo` slide animation) — wrong shape for "always mounted, no gatilho, no overlay chrome." Read `historico-rolagens-sidebar.component.html` to extract just its **item list markup** (the `<ul>`/`<li>` loop over `itens()`, the `RolagemVisibilidadeEnum` privacy chip, the `ResultadoRolagem` usage, empty/loading states) and inline an equivalent `<ul>` directly in `detalhe-mestre.page.html`, bound to `dados.rolagensFeed()`/`dados.carregandoRolagens()` — do **not** try to force-mount `<app-historico-rolagens-sidebar>` with `[aberto]="true"` permanently, since its slide-in/overlay CSS assumes a `position: fixed` panel that doesn't fit "second grid column, sempre montado." This is a legitimate, spec-sanctioned divergence (entregável 3 literally says "conteúdo de HistoricoRolagensSidebar, mas sem o gatilho/overlay").

```typescript
protected readonly painelLateralAtivo = signal<'rolagens' | 'inventario'>('rolagens');
protected readonly RolagemVisibilidadeEnum = RolagemVisibilidadeEnum;
```

```html
<aside class="detalhe-mestre__painel-lateral">
  <app-segmentado rotulo="Painel lateral">
    <button app-segmentado-item [ativo]="painelLateralAtivo() === 'rolagens'" (click)="painelLateralAtivo.set('rolagens')">
      <app-icone nome="d20" /> Rolagens
    </button>
    <button app-segmentado-item [ativo]="painelLateralAtivo() === 'inventario'" (click)="painelLateralAtivo.set('inventario')">
      <app-icone nome="inventario" /> Inventário
    </button>
  </app-segmentado>

  <div class="detalhe-mestre__painel-rolagens" [hidden]="painelLateralAtivo() !== 'rolagens'" appOverflowFade>
    @if (dados.carregandoRolagens()) {
      <!-- esqueleto, copiado do padrão de HistoricoRolagensSidebar -->
    } @else if (dados.rolagensFeed().length === 0) {
      <app-estado-vazio icone="d20" titulo="Nenhuma rolagem ainda." linhaApoio="Rolagens feitas nesta campanha aparecem aqui." />
    } @else {
      <ul class="detalhe-mestre__rolagens-lista">
        @for (item of dados.rolagensFeed(); track item.id) {
          <li class="historico-item"> <!-- reaproveitar a mesma classe/estrutura visual do item de HistoricoRolagensSidebar, copiada do seu .html --> </li>
        }
      </ul>
    }
  </div>

  <div class="detalhe-mestre__painel-inventario" [hidden]="painelLateralAtivo() !== 'inventario'">
    <app-inventario-esquadrao
      [campanhaId]="campanhaAtual.id"
      [itens]="dados.inventarioEsquadrao()"
      [fichas]="dados.fichasDestinoInventario()"
      [somenteLeitura]="!campanhaAtual.naBase"
      (alterado)="dados.inventarioEsquadrao.set($event)"
    />
  </div>
</aside>
```

Note `(alterado)="dados.inventarioEsquadrao.set($event)"` writes directly into the service's signal from the mestre page — this is fine since `inventarioEsquadrao` is a plain public `signal()` on the service, same mutability contract the old code had via a component-local signal.

- [ ] **Step 4: SCSS — the grid layout**

This is where `.detalhe-mestre__conteudo` becomes a 2-column grid (main content + fixed panel), per entregável 3's ASCII diagram. Update `.detalhe-mestre__conteudo` (Task 7) or wrap it: the actual page grid is `app-coluna-acoes` (flex item 1) + a flex/grid container with 2 children (main scroll area, painel lateral fixed ~380–410px). Add:

```scss
.detalhe-mestre {
    display: flex;
    align-items: stretch;
    min-height: calc(100dvh - var(--altura-topbar));
}

.detalhe-mestre__corpo {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 400px;
    gap: var(--space-16);
    flex: 1;
    min-width: 0;
    padding: var(--space-20);

    @include bp.tablet {
        grid-template-columns: minmax(0, 1fr);
    }
}

.detalhe-mestre__painel-lateral {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: var(--space-16);

    @include bp.tablet {
        display: none; // painel fixo sai no tablet/mobile — decisão a confirmar no gate visual;
                        // se o autor preferir mantê-lo abaixo do conteúdo em vez de sumir, ajustar
                        // aqui antes do fecho da task (registrar a escolha feita no HISTORY.md).
    }
}
```

Wrap the header + descricao + Esquadrão section (Task 7/8/9's markup) in a `<div class="detalhe-mestre__corpo"><div class="detalhe-mestre__principal">...</div><aside class="detalhe-mestre__painel-lateral">...</aside></div>` — revise Task 7's root template structure accordingly (this task's diff touches that wrapping).

- [ ] **Step 5: Run the spec, iterate to green**

Run: `npm run test --workspace=frontend -- --include='**/detalhe-mestre.page.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe-mestre
git commit -m "$(cat <<'EOF'
feat(campanha): painel fixo Rolagens/Inventario no CampanhaDetalheMestre

Segunda coluna sempre montada (app-segmentado alternando Rolagens/
Inventario, nunca overlay) substitui os dois utilitario-flutuante de
historico/inventario do mestre — a visao de jogador continua com o
padrao atual (campanha-detalhe-mestre-coluna-acoes.spec.md, entregavel 3).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Gate de integração — testes completos, lint, build

**Files:** none new — verification only.

- [ ] **Step 1: Full test suites**

Run: `npm run test --workspace=shared`
Run: `npm run test --workspace=backend`
Run: `npm run test --workspace=frontend`
Expected: all green except any **pre-existing** failure already tracked in `docs/context/PROBLEMS.md` (check the file first — report any such failure separately, never blended into this task's result).

- [ ] **Step 2: Lint**

Run: `npm run lint` (root — all 3 workspaces)
Expected: no new errors/warnings beyond the repository's known historical count (check `CONTEXT.md`'s last recorded warning count before comparing).

- [ ] **Step 3: Build**

Run: `npm run build --workspace=frontend`
Run: `npm run build --workspace=backend`
Expected: clean (frontend may show the known budget warning, `P-004`).

- [ ] **Step 4: Grep for dead references**

Run `Grep` for `CampanhaDetalhe\b` (word boundary) across `frontend/src` — every remaining hit should be `CampanhaDetalheShell`/`CampanhaDetalheMestre`/`CampanhaDetalheJogador`/`CampanhaDetalheDadosService`, never the bare old name. Run `Grep` for `encontro/componentes/ficha-flutuante` — zero hits expected (Task 2 fully relocated it).

- [ ] **Step 5: Commit (only if Steps 1–4 required any fix)**

If everything was already green, skip — no empty commit. If a fix was needed, commit it with a message describing exactly what the integration gate caught.

---

## Task 12: Verificação visual ao vivo + fecho da spec

**Files:**
- Move: `docs/specs/active/campanha-detalhe-mestre-coluna-acoes.spec.md` → `docs/specs/done/`
- Modify: `docs/context/HISTORY.md` (new block at the top)
- Modify: `docs/context/CONTEXT.md` (affected sections only)
- Modify: `docs/context/PROBLEMS.md` (remove any item this task fixed, if applicable — none expected)
- Modify: `docs/context/IDEAS.md` (only if the "Prévia de jogador" placement decision, or the tablet/mobile fallback for the fixed panel called out in Task 10 Step 4, surfaces a follow-up worth tracking)

**Interfaces:** none — this is the mandatory visual gate from `CLAUDE.md`, not code.

- [ ] **Step 1: Invoke the `verify` skill and start the real stack**

Follow `.claude/skills/verify/SKILL.md` — Postgres + `npm run backend:dev` + `npm run frontend:dev`, real REST (no mocks). Seed a campaign with: a mestre user, ≥2 jogador members (one with a ficha, one without), an espectador member, ≥1 criatura, and enough rolagens to populate the feed.

- [ ] **Step 2: Compare `CampanhaDetalheMestre` against the analog (`CampanhaEspectador`)**

Per the spec's header: the approved analog is `CampanhaEspectador` (`modules/campanha/paginas/espectador/`) — cabeçalho, 2-column grid with an always-open lateral panel, `EspectadorFichaCard` with square avatar. At `1920×1080` and `360×800`, confirm: same density/hierarchy as the analog; `app-coluna-acoes` expands/retracts pushing content (measure the gap stays constant in both states, never zero); no `max-width` artificially constraining the main content area; Esquadrão grid is 3 columns at desktop (2 at tablet width, 1 at mobile); avatar squares ~100–125px; no inline Vida/Energia steppers on the cards; "Abrir ficha" is an icon-only chip anchored top-right of the avatar and opens the floating window without navigating; the "⋯" menu still runs duplicar/remover/excluir; Membros/Convites dialogs open and close correctly, contain everything the old stat stripe/kebab had; the "Prévia" per-row action navigates correctly; the right panel toggles Rolagens⇆Inventário without losing the inactive one's scroll position; focus/contrast/touch targets are correct in both viewports; no horizontal overflow anywhere.

- [ ] **Step 3: Regression-check `CampanhaDetalheJogador`**

At the same two viewports, confirm the jogador view is pixel-for-pixel unchanged from what `CampanhaDetalhe`'s old `@else` branch produced: own ficha embedded, Equipe/Inventário toggle, Rolagens/Sessão lateral, "⋯" ficha-actions menu, banner de ficha crítica when applicable, mobile bottom-bar `.ficha-nav` destino switching.

- [ ] **Step 4: Fix anything the live gate found, before closing**

Per `CLAUDE.md`'s mandatory process — correct any divergence found in Steps 2–3 **before** declaring the task done, then re-verify only the corrected surface (not a full re-run of every viewport/state unless the fix was structural).

- [ ] **Step 5: Move the spec, write the `HISTORY.md` entry, update `CONTEXT.md`**

Move: `git mv docs/specs/active/campanha-detalhe-mestre-coluna-acoes.spec.md docs/specs/done/`. Write a `HISTORY.md` block (title format `## 2026-09-08 — campanha-detalhe-mestre-coluna-acoes: <resumo de uma linha>`) covering: what changed and why, per-task test counts, the live-verification findings from Steps 2–4 (including anything fixed only during the gate), and the "Prévia de jogador" decision with its date. Update `CONTEXT.md`'s "Próxima Task" section (prepend, following the existing entries' format) and its `docs/design/DESIGN.md`-adjacent pointer if `MEMORY.md` needs a new entry for where `app-coluna-acoes`/`CampanhaDetalheDadosService` now live.

- [ ] **Step 6: Final commit**

```bash
git add docs/specs docs/context
git commit -m "$(cat <<'EOF'
docs(context): fecha campanha-detalhe-mestre-coluna-acoes

Spec movida para done/; HISTORY.md e CONTEXT.md atualizados com o relato
completo da task, gates rodados e achados da verificacao ao vivo.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Entregável 1 (split de rota) → Tasks 1, 5, 6.
- Entregável 2 (`app-coluna-acoes`) → Task 3.
- Entregável 3 (redesenho mestre: coluna, painel fixo, Esquadrão grid, Abrir ficha, `FichaFlutuante` relocation) → Tasks 2, 4, 7, 10.
- Entregável 4 (dialog Membros) → Task 8.
- Entregável 5 (dialog Convites) → Task 9.
- Critérios de Aceite → covered across Tasks 6–10, verified live in Task 12.
- Fora de Escopo (jogador redesign, other 5 `.utilitario-flutuante` consumers, criaturas-as-membros, business rules, `90vw`→ change) → explicitly not touched by any task; Task 11's grep step guards against accidental scope creep into those areas.
- Dependências (`m8-07`, `ui-17`, `P-056`, `ui-28`…`ui-32`, `m2-19`/`m2-20`) → all referenced by name in the relevant task's rationale.

**Placeholder scan:** every task's steps name exact files, exact signal/method names to port, and (for new code) full implementations — the only intentionally-open decision points are Task 6's esqueleto fallback and Task 10 Step 4's tablet/mobile panel behavior, both flagged explicitly as "verify live, adjust if needed" rather than left vague.

**Type consistency:** `FichaFlutuanteAlvo` (`{ fichaId, tipo, usuarioIdDono }`) used identically in Task 7's `abrirFichaFlutuante` and Task 2's relocated model. `CampanhaDetalheDadosService`'s public signal names (`campanha`, `membros`, `fichas`, `membrosOrdenados`, `fichasPorMembro`, `inventarioEsquadrao`, `rolagensFeed`, `carregandoRolagens`, `agora`, `textoAtualizacao`, `usuarioAtivoId`, `ehMestre`, `id`, `carregando`, `fichasDestinoInventario`) are used with those exact names across Tasks 5, 7, 8, 9, 10 — cross-checked against the Ownership Map.
