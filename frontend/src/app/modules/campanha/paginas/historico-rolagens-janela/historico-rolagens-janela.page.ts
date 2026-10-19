import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { filter, map, merge, Subscription } from 'rxjs';

import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { JanelaExternaCabecalho } from '../../../../shared/ui/janela-externa-cabecalho/janela-externa-cabecalho.component';
import { CampanhaProjecaoService } from '../../campanha-projecao.service';
import { RolagemService } from '../../../ficha/rolagem.service';

/** Feed isolado da campanha; a API conserva a visibilidade da identidade autenticada. */
@Component({
  selector: 'app-historico-rolagens-campanha-janela',
  imports: [HistoricoRolagensSidebar, JanelaExternaCabecalho],
  templateUrl: './historico-rolagens-janela.page.html',
  styleUrl: './historico-rolagens-janela.page.scss',
})
export class HistoricoRolagensCampanhaJanela {
  private readonly rota = inject(ActivatedRoute);
  private readonly projecao = inject(CampanhaProjecaoService);
  private geracao = 0;
  private carga?: Subscription;
  private readonly excluidas = new Set<number>();
  private readonly rolagemService = inject(RolagemService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly campanhaId = Number(this.rota.snapshot.paramMap.get('campanhaId'));
  /** Aberta a partir de uma visão de espectador (real ou prévia do mestre). */
  private readonly origemEspectador = this.rota.snapshot.queryParamMap.get('origem') === 'espectador';
  /** O espectador volta ao próprio painel: `/campanhas/:id` é só de membros que jogam/mestram. */
  protected readonly voltarPara = this.origemEspectador
    ? `/campanhas/${this.campanhaId}/espectador`
    : `/campanhas/${this.campanhaId}`;
  protected readonly itens = signal<readonly RolagemResumoDto[]>([]);
  protected readonly carregando = signal(true);
  protected readonly acessoNegado = signal(false);

  constructor() {
    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.campanhaId));
    this.carregar();
    this.tempoRealService.rolagemRegistrada$
      .pipe(filter((rolagem) => rolagem.campanhaId === this.campanhaId), takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.inserir(rolagem) });
    this.tempoRealService.rolagemExcluida$
      .pipe(filter((rolagem) => rolagem.campanhaId === this.campanhaId), takeUntilDestroyed())
      .subscribe({ next: (rolagem) => {
        this.excluidas.add(rolagem.id);
        this.itens.update((atuais) => atuais.filter((item) => item.id !== rolagem.id));
      } });
    // `reconexao$` (P-083) — só reconexões futuras à montagem, nunca uma já ocorrida antes de
    // abrir esta janela (`effect(() => reconexao() > 0)` duplicava a carga inicial nesse caso).
    merge(
      this.tempoRealService.reconexao$,
      this.tempoRealService.rolagemRecortesAlterados$.pipe(filter(evento => evento.campanhaId === this.campanhaId)),
    ).pipe(takeUntilDestroyed())
      .subscribe({ next: () => { if (!this.acessoNegado()) this.carregar(); } });
  }

  private carregar(): void {
    const geracao = ++this.geracao;
    this.carga?.unsubscribe();
    this.itens.set([]);
    this.carregando.set(true);
    const consulta = this.origemEspectador
      ? this.projecao.recuperarPainelEspectador(this.campanhaId, 1, 50)
          .pipe(map(painel => painel.rolagens.itens))
      : this.rolagemService.listarPorCampanha(this.campanhaId);
    this.carga = consulta
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (itens) => {
          if (geracao !== this.geracao) return;
          this.itens.set(itens.filter((rolagem) => this.rolagemNoRecorte(rolagem) && !this.excluidas.has(rolagem.id)));
          this.carregando.set(false);
        },
        error: () => { if (geracao !== this.geracao) return; this.acessoNegado.set(true); this.carregando.set(false); },
      });
  }

  /**
   * Vinda do espectador, só as `PUBLICA` — o espectador real já só recebe essas; o mestre em
   * prévia do Painel do espectador receberia também as privadas (REST e sala `:mestre`).
   */
  private rolagemNoRecorte(rolagem: RolagemResumoDto): boolean {
    return !this.origemEspectador || rolagem.visibilidade === RolagemVisibilidadeEnum.PUBLICA;
  }

  private inserir(rolagem: RolagemResumoDto): void {
    if (!this.rolagemNoRecorte(rolagem)) {
      return;
    }
    if (this.origemEspectador) {
      this.carregar();
      return;
    }
    if (this.excluidas.has(rolagem.id)) return;
    this.itens.update((atuais) => atuais.some((item) => item.id === rolagem.id) ? atuais : [rolagem, ...atuais]);
  }
}
