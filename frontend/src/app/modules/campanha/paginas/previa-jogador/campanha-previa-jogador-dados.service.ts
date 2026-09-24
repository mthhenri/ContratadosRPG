import { Injectable, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  bufferTime,
  EMPTY,
  filter,
  finalize,
  merge,
  type Observable,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaPreviaJogadorDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaProjecaoService } from '../../campanha-projecao.service';
import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';

type IntencaoInvalidacao = 'projecao' | 'inventario' | 'encontro';

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
 * redigida; rolagem só entra no feed se o alvo também a receberia (`PUBLICA`, ou a própria
 * `PRIVADA` dele) — a sala `campanha:<id>:mestre` entrega as privadas de todo mundo ao mestre.
 */
@Injectable()
export class CampanhaPreviaJogadorDadosService extends CampanhaDetalheDadosService {
  private readonly campanhaProjecaoService = inject(CampanhaProjecaoService);
  private readonly invalidacoes = new Subject<IntencaoInvalidacao>();
  private geracaoInvalidacao = 0;
  private usuarioAlvoId = 0;

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

    if (previaInicial) {
      this.aplicarPrevia(previaInicial);
      this.carregando.set(false);
      this.carregandoRolagens.set(false);
      this.carregarInventario();
    } else {
      this.carregarPrevia();
    }

    this.entrarSalas(id);
    this.assinarTempoReal(id);
    this.configurarCoordenadorInvalidacao();

    effect(
      () => {
        if (this.tempoRealService.reconexao() > 0) {
          this.invalidacoes.next('projecao');
        }
      },
      { injector: this.injector },
    );

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
  override carregarInventario(): void {
    if (!this.previa()?.podeAcessarInventarioEsquadrao) {
      this.inventarioEsquadrao.set([]);
      return;
    }
    super.carregarInventario();
  }

  /** Membros e fichas vêm juntos na projeção — refazê-la cobre os dois. */
  override recarregarMembrosEFichas(): void {
    this.invalidacoes.next('projecao');
  }

  override recarregarCampanhaEInventario(): void {
    this.invalidacoes.next('projecao');
    this.invalidacoes.next('inventario');
  }

  private carregarPrevia(): void {
    this.carregando.set(true);
    this.campanhaProjecaoService
      .recuperarPreviaJogador(this.idInterno, this.usuarioAlvoId)
      .pipe(
        finalize(() => {
          this.carregando.set(false);
          this.carregandoRolagens.set(false);
        }),
      )
      .subscribe({
        next: (previa) => {
          this.aplicarPrevia(previa);
          this.carregarInventario();
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
    this.tempoRealService.rolagemRegistrada$
      .pipe(
        filter((rolagem) => this.rolagemVisivelAoAlvo(rolagem)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rolagem) =>
          this.rolagensFeed.update((atuais) =>
            atuais.some((atual) => atual.id === rolagem.id) ? atuais : [rolagem, ...atuais],
          ),
      });
    this.tempoRealService.rolagemExcluida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (excluida) =>
          this.rolagensFeed.update((atuais) => atuais.filter((rolagem) => rolagem.id !== excluida.id)),
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
      this.tempoRealService.fichaCondicoesAlteradas$.pipe(
        filter((evento) => evento.campanhaId === id),
      ),
      this.tempoRealService.fichaAlterada$.pipe(
        filter((ficha) => this.fichas().some(({ id: fichaId }) => fichaId === ficha.id)),
      ),
      this.tempoRealService.estadoAlterado$.pipe(filter((evento) => evento.id === id)),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.invalidacoes.next('projecao') });

    this.tempoRealService.inventarioAlterado$
      .pipe(filter((evento) => evento.campanhaId === id), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.invalidacoes.next('inventario') });

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
        bufferTime(25),
        filter((intencoes) => intencoes.length > 0),
        switchMap((intencoes) => {
          const incluiProjecao = intencoes.includes('projecao');
          const geracao = ++this.geracaoInvalidacao;
          const requisicoes: Observable<unknown>[] = [];

          if (incluiProjecao) {
            requisicoes.push(
              this.campanhaProjecaoService
                .recuperarPreviaJogador(this.idInterno, this.usuarioAlvoId)
                .pipe(tap((previa) => this.aplicarPrevia(previa))),
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

          if (intencoes.includes('inventario')) {
            requisicoes.push(
              this.campanhaService.recuperarInventario(this.idInterno).pipe(
                tap((inventario) => {
                  if (this.previa()?.podeAcessarInventarioEsquadrao) {
                    this.inventarioEsquadrao.set(inventario.itens);
                  }
                }),
              ),
            );
          }

          return requisicoes.length > 0
            ? merge(...requisicoes).pipe(
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

  private aplicarPrevia(previa: CampanhaPreviaJogadorDto): void {
    const alvo = previa.membros.find((membro) => membro.usuarioId === this.usuarioAlvoId);
    this.previa.set({
      usuarioAlvoId: this.usuarioAlvoId,
      nomeAlvo: alvo?.nome ?? '',
      podeAcessarInventarioEsquadrao: previa.podeAcessarInventarioEsquadrao,
      encontroAtivo: previa.encontroAtivo,
    });
    // A identidade segura não traz convites — o jogador também nunca os recebe (`null`).
    this.campanha.set({ ...previa.campanha, codigoConvite: null, codigoConviteEspectador: null });
    this.membros.set([...previa.membros]);
    this.fichas.set([...previa.fichas]);
    this.sincronizarSalasFicha(previa.fichas);
    this.rolagensFeed.set(previa.rolagens);
    this.ultimaAtualizacaoEm.set(Date.now());
  }
}
