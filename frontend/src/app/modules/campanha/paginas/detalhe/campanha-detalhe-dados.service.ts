import { DestroyRef, Injectable, Injector, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { bufferTime, filter, finalize, forkJoin, merge, Subject, type Observable } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  CampanhaInventarioItemDto,
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { FichaRecuperadaDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { mesclarFeedRolagens } from '../../../../shared/rolagem-feed.util';
import { rotuloRelativo } from '../../../../shared/rotulo-relativo.util';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { agruparFichasPorMembro, ordenarMembros, type ItemFicha } from '../../campanha-equipe.util';

/**
 * Contexto da prévia de jogador (m8-04) — preenchido só por `CampanhaPreviaJogadorDadosService`,
 * quando o mestre abre `/campanhas/:id/previa/:usuarioAlvoId`. `null` na visão real.
 */
export interface CampanhaDetalhePreviaContexto {
  readonly usuarioAlvoId: number;
  readonly nomeAlvo: string;
  readonly podeAcessarInventarioEsquadrao: boolean;
  /** Encontro não-encerrado já redigido com a identidade do alvo (m8-05) — `null` sem combate. */
  readonly encontroAtivo: EncontroRecuperadoDto | null;
}

/**
 * Dado e tempo real compartilhados entre `CampanhaDetalheMestre`/`CampanhaDetalheJogador`
 * (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 1) — extraído do antigo
 * `CampanhaDetalhe` monolítico para não duplicar fetch/assinaturas de socket entre os dois papéis.
 * Provido por `CampanhaDetalheShell` (`providers`, escopo de rota — uma instância por navegação
 * para `/campanhas/:id`), nunca `providedIn: 'root'`.
 */
@Injectable()
export class CampanhaDetalheDadosService {
  protected readonly campanhaService = inject(CampanhaService);
  private readonly fichaService = inject(FichaService);
  private readonly rolagemService = inject(RolagemService);
  private readonly sessaoService = inject(SessaoService);
  protected readonly tempoRealService = inject(TempoRealService);
  protected readonly topbarContexto = inject(TopbarContextoService);
  protected readonly destroyRef = inject(DestroyRef);
  /**
   * Capturado no construtor (contexto de injeção válido garantido) para permitir `effect()` fora
   * do construtor em `inicializar()` — chamado explicitamente pelo `CampanhaDetalheShell` depois
   * que o `id` da rota é conhecido, então não roda mais dentro do contexto de injeção implícito.
   */
  protected readonly injector = inject(Injector);

  protected idInterno = 0;

  /**
   * Prévia de jogador (m8-04): com contexto, a visão de jogador vira somente leitura e passa a
   * enxergar a campanha como o alvo — `usuarioAtivoId` passa a ser o do alvo. `null` na visão real.
   */
  readonly previa = signal<CampanhaDetalhePreviaContexto | null>(null);

  readonly campanha = signal<CampanhaRecuperadaDto | null>(null);
  readonly inventarioEsquadrao = signal<readonly CampanhaInventarioItemDto[]>([]);
  readonly membros = signal<CampanhaMembroResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly fichas = signal<FichaResumoDto[]>([]);
  readonly rolagensFeed = signal<readonly RolagemResumoDto[]>([]);
  readonly carregandoRolagens = signal(true);

  protected readonly ultimaAtualizacaoEm = signal<number | null>(null);
  protected readonly agoraInterno = signal(Date.now());
  readonly agora = this.agoraInterno.asReadonly();

  /** "Atualizado agora/há Xs/há X min" — `null` antes do primeiro fetch completar. */
  readonly textoAtualizacao = computed<string | null>(() => {
    const em = this.ultimaAtualizacaoEm();
    if (em === null) {
      return null;
    }
    return `Atualizado ${rotuloRelativo(em, this.agora())}`;
  });

  /**
   * `id` do usuário autenticado — exposto para os dois papéis (seletor de dono etc). Na prévia de
   * jogador, o do alvo: é por ele que a tela decide "minha ficha", nunca pelo mestre que olha.
   */
  readonly usuarioAtivoId = computed(
    () => this.previa()?.usuarioAlvoId ?? this.sessaoService.usuario()?.id ?? null,
  );

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
  /**
   * Ids de rolagens excluídas nesta instância (ADMIN) — nunca esquecido enquanto a tela vive:
   * uma releitura do feed disparada antes da exclusão chegar (reconexão, P-084) não pode
   * ressuscitar o item quando a resposta antiga finalmente volta (`mesclarFeedRolagens`).
   */
  private readonly idsRolagensExcluidas = new Set<number>();
  private readonly invalidacoesListas = new Subject<'fichas' | 'membros'>();
  private fichasEmLeitura = false;
  private fichasInvalidas = false;
  private membrosEmLeitura = false;
  private membrosInvalidos = false;

  /**
   * Geração do `naBase` aplicado por `estadoAlterado$` (P-086) — incrementada a cada evento.
   * Qualquer leitura de `campanha` (`carregar`/`recarregarCampanhaEInventario`, e a projeção da
   * prévia) captura a geração antes de disparar o GET; se um evento mais novo chegar enquanto
   * o GET está em voo, `mesclarEstadoOperacional` troca o `naBase` da resposta (desatualizada)
   * pelo último valor conhecido, em vez de deixar a leitura antiga restaurar estado velho.
   */
  protected geracaoEstadoOperacional = 0;
  private naBaseMaisRecente: boolean | null = null;

  get id(): number {
    return this.idInterno;
  }

  /**
   * Aplica `naBase` direto no signal — chamado tanto pela resposta do PUT (`detalhe-mestre.page.
   * ts`, autor da mutação) quanto pelo eco de `estadoAlterado$` (demais consumidores da sala);
   * nenhum dos dois busca campanha nem inventário de novo (P-086). Público (não só o `protected`
   * que bastaria para o próprio `inicializar`) porque a página do mestre, dona da mutação, precisa
   * chamá-lo de fora para que sua leitura otimista entre na mesma reconciliação de geração que
   * protege contra uma leitura antiga (reconexão) em voo restaurar o `naBase` anterior.
   */
  aplicarEstadoOperacional(naBase: boolean): void {
    this.naBaseMaisRecente = naBase;
    this.geracaoEstadoOperacional++;
    this.campanha.update((atual) => (atual ? { ...atual, naBase } : atual));
  }

  /** Reconcilia o `naBase` de uma leitura contra um evento mais recente chegado durante o voo. */
  protected mesclarEstadoOperacional<T extends { naBase: boolean }>(
    entidade: T,
    geracaoNoInicio: number,
  ): T {
    return geracaoNoInicio === this.geracaoEstadoOperacional
      ? entidade
      : { ...entidade, naBase: this.naBaseMaisRecente! };
  }

  /**
   * Documento completo de uma ficha visível — a visão real usa a própria permissão do usuário;
   * a prévia sobrescreve para a rota redigida para o alvo.
   */
  recuperarFicha(fichaId: number): Observable<FichaRecuperadaDto> {
    return this.fichaService.recuperarFicha(fichaId);
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
    this.configurarInvalidacoesListas();

    // Tempo real (m3-05/m3-08): entra na sala `campanha:<id>` para as fichas/membros atualizarem
    // ao vivo. O recorte visível (§14) continua arbitrado pelo backend — o front só refaz o fetch.
    this.entrarSalas(id);

    merge(
      this.tempoRealService.fichaCriada$.pipe(filter((ficha) => ficha.campanhaId === id)),
      this.tempoRealService.fichaVisibilidadeAlterada$.pipe(
        filter((evento) => evento.campanhaId === id),
      ),
      this.tempoRealService.fichaRemovidaDaCampanha$.pipe(
        filter((evento) => evento.campanhaId === id),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.recarregarFichas() });
    this.tempoRealService.membroEntrou$
      .pipe(filter((evento) => evento.campanhaId === id), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.recarregarMembros() });
    this.tempoRealService.fichaRecortesAlterados$
      .pipe(filter((evento) => evento.campanhaId === id), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (evento) => {
          if (evento.fichas) this.invalidacoesListas.next('fichas');
          if (evento.membros) this.invalidacoesListas.next('membros');
        },
      });

    // Feed de rolagens em tempo real (m3-27; correção): rolagens `PUBLICA` chegam para qualquer
    // membro; `PRIVADA` só chega aqui quando esta tela é a do mestre (backend emite só na sala
    // `campanha:<id>:mestre` — jogador/espectador nunca recebem). Prepend direto, sem refetch (o
    // payload já vem completo).
    this.tempoRealService.rolagemRegistrada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rolagem) => this.rolagensFeed.update((atuais) => [rolagem, ...atuais]) });

    this.tempoRealService.rolagemExcluida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (excluida) => {
          this.idsRolagensExcluidas.add(excluida.id);
          this.rolagensFeed.update((atuais) => atuais.filter((rolagem) => rolagem.id !== excluida.id));
        },
      });

    // P-086: `CampanhaEstadoAlteradaDto` só carrega `{ id, naBase }` — aplica direto no signal em
    // vez de refazer campanha+inventário; o inventário não muda por este evento (só
    // `campanha:inventario-alterado`, tratado abaixo, invalida o inventário de verdade).
    this.tempoRealService.estadoAlterado$
      .pipe(filter((evento) => evento.id === id), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (evento) => this.aplicarEstadoOperacional(evento.naBase) });

    this.tempoRealService.inventarioAlterado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (evento) => {
          if (evento.campanhaId === id) {
            this.carregarInventario();
          }
        },
      });

    // Ressincronização ao reconectar (§9): refaz o fetch de tudo que pode ter mudado durante a
    // queda sem chegar por broadcast (nenhum evento tem replay) — membros/fichas, campanha/estado
    // + inventário (o mesmo par de `estadoAlterado$`) e o feed de rolagens (P-084: antes só
    // membros/fichas refaziam aqui, deixando estado, inventário e rolagens da queda perdidos).
    // `reconexao$` (não `reconexao()` num `effect`, P-083) — só dispara em reconexões futuras à
    // assinatura; um consumidor montado depois de uma reconexão já ocorrida não duplica a carga
    // inicial.
    this.tempoRealService.reconexao$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.recarregarMembrosEFichas();
          this.recarregarCampanhaEInventario();
          this.recarregarRolagensFeed();
        },
      });

    // Relógio do "Atualizado há Xs" — só recomputa o texto, nunca refaz fetch.
    const relogio = setInterval(() => this.agoraInterno.set(Date.now()), 5000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }

  /** Entra na sala `campanha:<id>` e sai dela (e das salas de ficha) quando a tela morre. */
  protected entrarSalas(id: number): void {
    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(id);
    this.destroyRef.onDestroy(() => {
      this.tempoRealService.sairSalaCampanha(id);
      for (const fichaId of this.salasFichaAtivas) {
        this.tempoRealService.sairSalaFicha(fichaId);
      }
    });
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
    this.membrosEmLeitura = true;
    this.fichasEmLeitura = true;
    this.membrosInvalidos = false;
    this.fichasInvalidas = false;
    const geracaoEstadoNoInicio = this.geracaoEstadoOperacional;
    forkJoin({
      campanha: this.campanhaService.recuperarCampanha(this.idInterno),
      membros: this.campanhaService.listarMembros(this.idInterno),
      fichas: this.fichaService.listarFichas(this.idInterno),
    })
      .pipe(
        finalize(() => {
          this.carregando.set(false);
          this.membrosEmLeitura = false;
          this.fichasEmLeitura = false;
          if (this.membrosInvalidos) this.invalidarMembros();
          if (this.fichasInvalidas) this.invalidarFichas();
        }),
      )
      .subscribe({
        next: ({ campanha, membros, fichas }) => {
          this.campanha.set(this.mesclarEstadoOperacional(campanha, geracaoEstadoNoInicio));
          if (!this.membrosInvalidos) this.membros.set(membros);
          if (!this.fichasInvalidas) {
            this.fichas.set(fichas);
            this.sincronizarSalasFicha(fichas);
            this.ultimaAtualizacaoEm.set(Date.now());
          }
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
    const geracaoEstadoNoInicio = this.geracaoEstadoOperacional;
    this.campanhaService.recuperarCampanha(this.idInterno).subscribe((campanha) => {
      this.campanha.set(this.mesclarEstadoOperacional(campanha, geracaoEstadoNoInicio));
      this.carregarInventario();
    });
  }

  /**
   * Recarrega membros e fichas (após transferir mestre, duplicar ficha, ou ao receber
   * `ficha:criada`/`membro:entrou` em tempo real) — só a `campanha` (nome/
   * descrição/convite) fica de fora, ela não muda por esses eventos.
   */
  recarregarMembrosEFichas(): void {
    this.invalidarMembros();
    this.invalidarFichas();
  }

  private configurarInvalidacoesListas(): void {
    this.invalidacoesListas
      .pipe(
        bufferTime(25),
        filter((recursos) => recursos.length > 0),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((recursos) => {
        if (recursos.includes('fichas')) this.invalidarFichas();
        if (recursos.includes('membros')) this.invalidarMembros();
      });
  }

  private invalidarMembros(): void {
    this.membrosInvalidos = true;
    if (this.membrosEmLeitura) return;
    this.membrosEmLeitura = true;
    this.membrosInvalidos = false;
    this.campanhaService
      .listarMembros(this.idInterno)
      .pipe(
        finalize(() => {
          this.membrosEmLeitura = false;
          if (this.membrosInvalidos) this.invalidarMembros();
        }),
      )
      .subscribe((membros) => {
        if (!this.membrosInvalidos) this.membros.set(membros);
      });
  }

  private invalidarFichas(): void {
    this.fichasInvalidas = true;
    if (this.fichasEmLeitura) return;
    this.fichasEmLeitura = true;
    this.fichasInvalidas = false;
    this.fichaService
      .listarFichas(this.idInterno)
      .pipe(
        finalize(() => {
          this.fichasEmLeitura = false;
          if (this.fichasInvalidas) this.invalidarFichas();
        }),
      )
      .subscribe((fichas) => {
        if (this.fichasInvalidas) return;
        this.fichas.set(fichas);
        this.sincronizarSalasFicha(fichas);
        this.ultimaAtualizacaoEm.set(Date.now());
      });
  }

  private recarregarMembros(): void {
    this.invalidarMembros();
  }

  private recarregarFichas(): void {
    this.invalidarFichas();
  }

  private carregarRolagens(): void {
    this.rolagemService
      .listarPorCampanha(this.idInterno)
      .pipe(finalize(() => this.carregandoRolagens.set(false)))
      .subscribe({ next: (itens) => this.rolagensFeed.set(itens), error: () => undefined });
  }

  /**
   * Releitura do feed ao reconectar (P-084). A resposta do servidor é a base — **não** mescla
   * contra `rolagensFeed()` atual: esse array pode carregar itens de antes da própria queda (uma
   * ressincronização real, ao vivo, encontrou exatamente esse bug — uma rolagem excluída direto
   * no Postgres durante a queda, sem nenhum evento de socket possível pra registrar a exclusão,
   * "sobrevivia" porque só faltava no GET e nada a marcava como excluída). Só é preservado como
   * extra o que chegar por `rolagemRegistrada$` **durante esta releitura específica** (assinatura
   * com o mesmo tempo de vida do GET) — a única situação real em que a resposta pode ficar
   * defasada: pedida um instante antes de um registro concorrente comitar. `idsRolagensExcluidas`
   * (permanente) ainda filtra a resposta contra qualquer exclusão já vista nesta instância.
   */
  private recarregarRolagensFeed(): void {
    const chegadasDuranteRecuperacao: RolagemResumoDto[] = [];
    const assinatura = this.tempoRealService.rolagemRegistrada$.subscribe((rolagem) =>
      chegadasDuranteRecuperacao.push(rolagem),
    );
    this.rolagemService
      .listarPorCampanha(this.idInterno)
      .pipe(finalize(() => assinatura.unsubscribe()))
      .subscribe({
        next: (itens) =>
          this.rolagensFeed.set(
            mesclarFeedRolagens(itens, chegadasDuranteRecuperacao, this.idsRolagensExcluidas),
          ),
      });
  }
}
