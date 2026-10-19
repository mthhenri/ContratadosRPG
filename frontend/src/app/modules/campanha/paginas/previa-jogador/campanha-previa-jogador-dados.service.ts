import { Injectable, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  bufferTime,
  catchError,
  EMPTY,
  filter,
  finalize,
  merge,
  map,
  type Observable,
  Subject,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaPreviaJogadorDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaProjecaoService } from '../../campanha-projecao.service';
import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';

type IntencaoInvalidacao = 'projecao' | 'encontro';

/**
 * Fonte de dados da prévia de jogador (m8-04) — o mestre abre a **mesma** `CampanhaDetalheJogador`
 * da visão real, só que alimentada pela projeção do alvo (`recuperarPreviaJogador`/
 * `recuperarFichaPreviaJogador`), nunca pelas rotas que respondem com o privilégio do mestre
 * (`listarMembros`, `GET /ficha?campanhaId`, `GET /campanha/:id`, `GET /rolagem`). Provida por
 * `CampanhaPreviaJogador` no lugar de `CampanhaDetalheDadosService`, então a tela não sabe de onde
 * o dado vem — só lê `previa()` para se colocar em somente leitura.
 *
 * Tempo real: o mestre continua nas salas dele, então **nenhum payload de socket é exibido como
 * veio** (pode carregar o recorte de mestre). Ficha, membro e encontro viram refetch da projeção
 * redigida; rolagens também invalidam a projeção, pois uma pública pode trazer
 * identidade estruturada autorizada apenas ao mestre.
 */
@Injectable()
export class CampanhaPreviaJogadorDadosService extends CampanhaDetalheDadosService {
  private readonly campanhaProjecaoService = inject(CampanhaProjecaoService);
  private readonly invalidacoes = new Subject<IntencaoInvalidacao>();
  private geracaoInvalidacao = 0;
  private projecaoPendente = false;
  private usuarioAlvoId = 0;
  private cargaInicial?: Subscription;
  private readonly rolagensExcluidas = new Set<number>();

  /**
   * Chamado uma vez por `CampanhaPreviaJogador`, no lugar de `inicializar`. `previaInicial` é a
   * projeção já buscada pelo resolver da rota — sem ela, busca aqui.
   */
  inicializarPrevia(
    id: number,
    usuarioAlvoId: number,
    previaInicial: CampanhaPreviaJogadorDto | undefined,
  ): void {
    this.idInterno = id;
    this.usuarioAlvoId = usuarioAlvoId;
    // A tela de Investigação da própria prévia já usa este recorte seguro da cena atual.
    this.observarCenaAtiva(() => this.campanhaProjecaoService
      .recuperarCenaAtivaPainelEspectador(id).pipe(map(cena => cena ? {
        id: cena.id, nome: cena.nome, tipo: cena.tipo, status: cena.status,
        temEncontro: cena.encontro !== null,
      } : null)));

    // Contexto antes de qualquer dado: `usuarioAtivoId` já aponta para o alvo quando as fichas
    // chegarem, então a tela nunca semeia a "própria ficha" com a do mestre.
    this.previa.set({
      usuarioAlvoId,
      nomeAlvo: '',
      podeAcessarInventarioEsquadrao: false,
      encontroAtivo: null,
    });

    effect(() => this.topbarContexto.definir(this.campanha()?.nome ?? null), {
      injector: this.injector,
    });
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    this.configurarCoordenadorInvalidacao();

    if (previaInicial) {
      this.aplicarPrevia(previaInicial);
      this.carregando.set(false);
      this.carregandoRolagens.set(false);
      // Inventário NÃO entra na carga inicial (requests-inventario-sob-demanda) — só na 1ª vez
      // que o painel "Inv. Esquadrão" fica visível, via `solicitarInventario`.
    } else {
      this.carregarPrevia();
    }

    this.entrarSalas(id);
    this.assinarTempoReal(id);

    // `reconexao$` (P-083) — só reconexões futuras à montagem; o coordenador de invalidação
    // acima já agrupa/serializa esta com qualquer outra intenção concorrente. Inventário fica de
    // fora do coordenador (requests-inventario-sob-demanda) — `invalidarInventario` (herdado) só
    // busca se o painel estiver aberto.
    this.tempoRealService.reconexao$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.invalidacoes.next('projecao');
        this.invalidarInventario();
      },
    });

    const relogio = setInterval(() => this.agoraInterno.set(Date.now()), 5000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }

  /** Ficha completa redigida/autorizada para o **alvo** — nunca a do mestre. */
  override recuperarFicha(fichaId: number): Observable<FichaRecuperadaDto> {
    return this.campanhaProjecaoService.recuperarFichaPreviaJogador(
      this.idInterno,
      this.usuarioAlvoId,
      fichaId,
    );
  }

  /** Inventário do esquadrão — só quando a projeção diz que o alvo o acessa. */
  protected override buscarInventario(): void {
    if (!this.previa()?.podeAcessarInventarioEsquadrao) {
      this.inventarioEsquadrao.set([]);
      this.estadoInventario.set('PRONTO');
      return;
    }
    super.buscarInventario();
  }

  /** Membros e fichas vêm juntos na projeção — refazê-la cobre os dois. */
  override recarregarMembrosEFichas(): void {
    this.invalidacoes.next('projecao');
  }

  override recarregarCampanhaEInventario(): void {
    this.invalidacoes.next('projecao');
    this.invalidarInventario();
  }

  private carregarPrevia(): void {
    this.carregando.set(true);
    const geracaoEstadoNoInicio = this.geracaoEstadoOperacional;
    const geracao = this.geracaoInvalidacao;
    this.cargaInicial = this.campanhaProjecaoService
      .recuperarPreviaJogador(this.idInterno, this.usuarioAlvoId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.carregando.set(false);
          this.carregandoRolagens.set(false);
        }),
      )
      .subscribe({
        next: (previa) => {
          if (geracao !== this.geracaoInvalidacao) return;
          this.aplicarPrevia(previa, geracaoEstadoNoInicio);
          // Inventário NÃO entra na carga inicial (requests-inventario-sob-demanda).
        },
      });
  }

  /** `true` quando o alvo também receberia esta rolagem — pública, ou privada feita por ele. */
  private rolagemVisivelAoAlvo(rolagem: RolagemResumoDto): boolean {
    return (
      rolagem.campanhaId === this.idInterno &&
      (rolagem.visibilidade === RolagemVisibilidadeEnum.PUBLICA ||
        rolagem.usuarioId === this.usuarioAlvoId)
    );
  }

  private assinarTempoReal(id: number): void {
    this.tempoRealService.cenaAlterada$
      .pipe(filter(evento => evento.campanhaId === id), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidacoes.next('projecao'));
    this.tempoRealService.rolagemRegistrada$
      .pipe(
        filter((rolagem) => this.rolagemVisivelAoAlvo(rolagem)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.invalidacoes.next('projecao'));
    this.tempoRealService.rolagemRecortesAlterados$
      .pipe(filter(evento => evento.campanhaId === id), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidacoes.next('projecao'));
    this.tempoRealService.rolagemExcluida$
      .pipe(filter(evento => evento.campanhaId === id), takeUntilDestroyed(this.destroyRef))
      .subscribe(excluida => {
        this.rolagensExcluidas.add(excluida.id);
        this.rolagensFeed.update(atuais => atuais.filter(rolagem => rolagem.id !== excluida.id));
      });

    merge(
      this.tempoRealService.fichaCriada$.pipe(filter((ficha) => ficha.campanhaId === id)),
      this.tempoRealService.membroEntrou$.pipe(filter((evento) => evento.campanhaId === id)),
      this.tempoRealService.fichaVisibilidadeAlterada$.pipe(
        filter((evento) => evento.campanhaId === id),
      ),
      this.tempoRealService.fichaRemovidaDaCampanha$.pipe(
        filter((evento) => evento.campanhaId === id),
      ),
      this.tempoRealService.fichaRecortesAlterados$.pipe(
        filter((evento) => evento.campanhaId === id && (evento.fichas || evento.membros)),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.invalidacoes.next('projecao') });

    // P-086: mesmo evento/payload da visão real — aplica `naBase` direto no `campanha` herdado
    // em vez de refazer a projeção inteira (campanha+membros+fichas+rolagens).
    // `podeAcessarInventarioEsquadrao` fica de fora de propósito: é campo só do backend
    // (`campanha-projecao.service.ts`), não uma regra pra duplicar aqui — continua atualizado
    // pela próxima invalidação real de `'projecao'` (ficha/membro, reconexão).
    this.tempoRealService.estadoAlterado$
      .pipe(filter((evento) => evento.id === id), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (evento) => this.aplicarEstadoOperacional(evento.naBase) });

    // requests-inventario-sob-demanda: fora do coordenador — `invalidarInventario` (herdado) só
    // busca se o painel estiver aberto, com a mesma reconciliação que o resto do fluxo real usa.
    this.tempoRealService.inventarioAlterado$
      .pipe(filter((evento) => evento.campanhaId === id), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.invalidarInventario() });

    this.tempoRealService.encontroAlterado$
      .pipe(
        filter((evento) => evento.encontro.campanhaId === id),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: () => this.invalidacoes.next('encontro') });
  }

  /** Agrupa intenções da mesma mutação e cancela a execução anterior ao chegar uma mais nova. */
  private configurarCoordenadorInvalidacao(): void {
    this.invalidacoes
      .pipe(
        tap(intencao => {
          if (intencao === 'projecao') {
            this.projecaoPendente = true;
            ++this.geracaoInvalidacao;
            this.cargaInicial?.unsubscribe();
            this.rolagensFeed.set([]);
          }
        }),
        bufferTime(25),
        filter((intencoes) => intencoes.length > 0),
        switchMap((intencoes) => {
          const incluiProjecao = this.projecaoPendente || intencoes.includes('projecao');
          const geracao = this.geracaoInvalidacao;
          const requisicoes: Observable<unknown>[] = [];

          if (incluiProjecao) {
            const geracaoEstadoNoInicio = this.geracaoEstadoOperacional;
            requisicoes.push(
              this.campanhaProjecaoService
                .recuperarPreviaJogador(this.idInterno, this.usuarioAlvoId)
                .pipe(tap((previa) => {
                  if (geracao === this.geracaoInvalidacao) {
                    this.projecaoPendente = false;
                    this.aplicarPrevia(previa, geracaoEstadoNoInicio);
                  }
                })),
            );
          } else if (intencoes.includes('encontro')) {
            requisicoes.push(
              this.campanhaProjecaoService
                .recuperarEncontroAtivoPreviaJogador(this.idInterno, this.usuarioAlvoId)
                .pipe(
                  tap((encontroAtivo) =>
                    this.previa.update((contexto) =>
                      contexto ? { ...contexto, encontroAtivo } : contexto,
                    ),
                  ),
                ),
            );
          }

          return requisicoes.length > 0
            ? merge(...requisicoes).pipe(
                catchError(() => EMPTY),
                finalize(() => {
                  if (incluiProjecao && geracao === this.geracaoInvalidacao) {
                    this.ultimaAtualizacaoEm.set(Date.now());
                  }
                }),
              )
            : EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /**
   * `geracaoEstadoNoInicio` (P-086, default = geração atual) reconcilia o `naBase` desta leitura
   * contra um evento `estadoAlterado$` mais novo, chegado enquanto o GET da projeção estava em
   * voo — sem isso, a resposta desatualizada restauraria o `naBase` velho em `campanha`.
   */
  private aplicarPrevia(
    previa: CampanhaPreviaJogadorDto,
    geracaoEstadoNoInicio: number = this.geracaoEstadoOperacional,
  ): void {
    const alvo = previa.membros.find((membro) => membro.usuarioId === this.usuarioAlvoId);
    this.previa.set({
      usuarioAlvoId: this.usuarioAlvoId,
      nomeAlvo: alvo?.nome ?? '',
      podeAcessarInventarioEsquadrao: previa.podeAcessarInventarioEsquadrao,
      encontroAtivo: previa.encontroAtivo,
    });
    // A identidade segura não traz convites — o jogador também nunca os recebe (`null`).
    this.campanha.set(
      this.mesclarEstadoOperacional(
        { ...previa.campanha, codigoConvite: null, codigoConviteEspectador: null },
        geracaoEstadoNoInicio,
      ),
    );
    this.membros.set([...previa.membros]);
    this.fichas.set([...previa.fichas]);
    this.sincronizarSalasFicha(previa.fichas);
    this.rolagensFeed.set(previa.rolagens.filter(rolagem => !this.rolagensExcluidas.has(rolagem.id)));
    this.ultimaAtualizacaoEm.set(Date.now());
  }
}
