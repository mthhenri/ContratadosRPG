import { Component, DestroyRef, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { JanelaExternaCabecalho } from '../../../../shared/ui/janela-externa-cabecalho/janela-externa-cabecalho.component';
import { CampanhaService } from '../../../campanha/campanha.service';
import { CadernoConteudo } from '../../caderno-conteudo.component';
import { CadernoEsquadraoColaborativoService } from '../../caderno-esquadrao-colaborativo.service';
import { consultarCadernoMobile } from '../../caderno-flutuante.model';
import { CadernoFlutuanteStore } from '../../caderno-flutuante.store';
import { CadernoSalvamento } from '../../caderno-salvamento.component';

/**
 * Caderno da campanha em janela externa (I-027): o mesmo corpo do painel flutuante
 * (`CadernoConteudo`), com store e sessão colaborativa próprios desta janela. Busca campanha e
 * membros sozinho para decidir mestre/jogador; o espectador (recusado pelo REST) e quem não é
 * membro veem acesso negado.
 */
@Component({
  selector: 'app-caderno-janela',
  imports: [CadernoConteudo, CadernoSalvamento, Esqueleto, EstadoVazio, JanelaExternaCabecalho],
  providers: [CadernoFlutuanteStore, CadernoEsquadraoColaborativoService],
  templateUrl: './caderno-janela.page.html',
  styleUrl: './caderno-janela.page.scss',
  host: {
    '(window:beforeunload)': 'avisarEdicaoPendente($event)',
    '(window:resize)': 'ehMobile.set(consultarMobile())',
  },
})
export class CadernoJanela implements OnDestroy {
  private readonly rota = inject(ActivatedRoute);
  private readonly campanhaService = inject(CampanhaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly store = inject(CadernoFlutuanteStore);
  private readonly colaboracaoEsquadrao = inject(CadernoEsquadraoColaborativoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly campanhaId = Number(this.rota.snapshot.paramMap.get('campanhaId'));
  protected readonly voltarPara = `/campanhas/${this.campanhaId}`;
  protected readonly contexto = signal('Caderno');
  protected readonly estado = signal<'carregando' | 'pronto' | 'negado'>('carregando');
  protected readonly ehMestre = signal(false);
  protected readonly membros = signal<readonly CampanhaMembroResumoDto[]>([]);
  protected readonly ehMobile = signal(consultarCadernoMobile());
  protected readonly consultarMobile = consultarCadernoMobile;

  constructor() {
    forkJoin({
      campanha: this.campanhaService.recuperarCampanha(this.campanhaId),
      membros: this.campanhaService.listarMembros(this.campanhaId),
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ campanha, membros }) => this.iniciar(campanha.nome, membros),
        error: () => this.estado.set('negado'),
      });
  }

  ngOnDestroy(): void {
    this.colaboracaoEsquadrao.fechar();
    this.store.descartarCampanha();
  }

  /** Um resultado "Ficha" da busca abre as anotações dela numa aba nova: a janela não comanda a aba
   *  principal, e o destino é o mesmo das páginas da campanha. */
  protected abrirFicha(fichaId: number): void {
    window.open(`/campanhas/${this.campanhaId}/ficha/${fichaId}#anotacoes`, '_blank', 'noopener');
  }

  /**
   * O autosave espera uma pausa: fechar a janela logo depois de escrever perderia o texto. Com
   * rascunho não salvo ou gravação em andamento, o navegador pede confirmação antes de fechar.
   */
  protected avisarEdicaoPendente(evento: BeforeUnloadEvent): void {
    if (this.store.temAlteracoesNaoSalvas() || this.store.estadoSalvamento() === 'SALVANDO') {
      evento.preventDefault();
    }
  }

  private iniciar(campanhaNome: string, membros: readonly CampanhaMembroResumoDto[]): void {
    const usuarioId = this.sessaoService.usuario()?.id;
    const vinculo = membros.find((membro) => membro.usuarioId === usuarioId);
    if (!vinculo || vinculo.papel === TipoCampanhaMembroPapelEnum.ESPECTADOR) {
      this.estado.set('negado');
      return;
    }
    this.ehMestre.set(vinculo.papel === TipoCampanhaMembroPapelEnum.MESTRE);
    this.membros.set(membros);
    this.contexto.set(`Caderno · ${campanhaNome}`);
    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.campanhaId));
    this.store.abrir(this.campanhaId);
    this.estado.set('pronto');
  }
}
