import { DestroyRef, Injectable, Injector, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
 * para `/campanhas/:id`), nunca `providedIn: 'root'`.
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
  /**
   * Capturado no construtor (contexto de injeção válido garantido) para permitir `effect()` fora
   * do construtor em `inicializar()` — chamado explicitamente pelo `CampanhaDetalheShell` depois
   * que o `id` da rota é conhecido, então não roda mais dentro do contexto de injeção implícito.
   */
  private readonly injector = inject(Injector);

  private idInterno = 0;

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

  /** "Atualizado agora/há Xs/há X min" — `null` antes do primeiro fetch completar. */
  readonly textoAtualizacao = computed<string | null>(() => {
    const em = this.ultimaAtualizacaoEm();
    if (em === null) {
      return null;
    }
    return `Atualizado ${rotuloRelativo(em, this.agora())}`;
  });

  /** `id` do usuário autenticado — exposto para os dois papéis (seletor de dono etc). */
  readonly usuarioAtivoId = computed(() => this.sessaoService.usuario()?.id ?? null);

  /** `true` quando o usuário autenticado é o `MESTRE` desta campanha (deriva dos membros). */
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
    return this.idInterno;
  }

  /** Chamado uma vez por `CampanhaDetalheShell` com o `id` resolvido do parâmetro de rota. */
  inicializar(id: number): void {
    this.idInterno = id;

    // Slot de contexto da topbar (ui-21): nome da campanha, sempre que `campanha()` mudar
    // (carregamento inicial, rename) — some ao sair da tela.
    effect(() => this.topbarContexto.definir(this.campanha()?.nome ?? null), {
      injector: this.injector,
    });
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    this.carregar();
    this.carregarRolagens();

    // Tempo real (m3-05/m3-08): entra na sala `campanha:<id>` para as fichas/membros atualizarem
    // ao vivo. O recorte visível (§14) continua arbitrado pelo backend — o front só refaz o fetch.
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
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.recarregarMembrosEFichas() });

    // Feed de rolagens em tempo real (m3-27): só rolagens `PUBLICA` chegam por aqui (o backend não
    // broadcasta privadas — §9); prepend direto, sem refetch (o payload já vem completo).
    this.tempoRealService.rolagemRegistrada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rolagem) => this.rolagensFeed.update((atuais) => [rolagem, ...atuais]) });

    this.tempoRealService.estadoAlterado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (evento) => {
          if (evento.id === id) {
            this.recarregarCampanhaEInventario();
          }
        },
      });

    this.tempoRealService.inventarioAlterado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (evento) => {
          if (evento.campanhaId === id) {
            this.carregarInventario();
          }
        },
      });

    // Ressincronização ao reconectar (§9): refaz o fetch.
    effect(
      () => {
        if (this.tempoRealService.reconexao() > 0) {
          this.recarregarMembrosEFichas();
        }
      },
      { injector: this.injector },
    );

    // Relógio do "Atualizado há Xs" — só recomputa o texto, nunca refaz fetch.
    const relogio = setInterval(() => this.agoraInterno.set(Date.now()), 5000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }

  /**
   * Ingressa nas salas `ficha:<id>` das fichas hoje visíveis e sai das que deixaram de aparecer —
   * mantém `ficha:alterada` chegando exatamente pro conjunto de fichas que a tela mostra agora.
   */
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
      campanha: this.campanhaService.recuperarCampanha(this.idInterno),
      membros: this.campanhaService.listarMembros(this.idInterno),
      fichas: this.fichaService.listarFichas(this.idInterno),
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
      .recuperarInventario(this.idInterno)
      .subscribe((inventario) => this.inventarioEsquadrao.set(inventario.itens));
  }

  recarregarCampanhaEInventario(): void {
    this.campanhaService.recuperarCampanha(this.idInterno).subscribe((campanha) => {
      this.campanha.set(campanha);
      this.carregarInventario();
    });
  }

  /**
   * Recarrega membros e fichas (após transferir mestre, duplicar ficha, ou ao receber
   * `ficha:criada`/`ficha:alterada`/`membro:entrou` em tempo real) — só a `campanha` (nome/
   * descrição/convite) fica de fora, ela não muda por esses eventos.
   */
  recarregarMembrosEFichas(): void {
    forkJoin({
      membros: this.campanhaService.listarMembros(this.idInterno),
      fichas: this.fichaService.listarFichas(this.idInterno),
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
      .listarPorCampanha(this.idInterno)
      .pipe(finalize(() => this.carregandoRolagens.set(false)))
      .subscribe({ next: (itens) => this.rolagensFeed.set(itens), error: () => undefined });
  }
}
