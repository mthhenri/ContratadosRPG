import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';

import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { JanelaExternaCabecalho } from '../../../../shared/ui/janela-externa-cabecalho/janela-externa-cabecalho.component';
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
  private readonly rolagemService = inject(RolagemService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly campanhaId = Number(this.rota.snapshot.paramMap.get('campanhaId'));
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
      .subscribe({ next: (rolagem) => this.itens.update((atuais) => atuais.filter((item) => item.id !== rolagem.id)) });
    effect(() => {
      if (this.tempoRealService.reconexao() > 0 && !this.acessoNegado()) this.carregar();
    });
  }

  private carregar(): void {
    this.carregando.set(true);
    this.rolagemService.listarPorCampanha(this.campanhaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (itens) => { this.itens.set(itens); this.carregando.set(false); },
        error: () => { this.acessoNegado.set(true); this.carregando.set(false); },
      });
  }

  private inserir(rolagem: RolagemResumoDto): void {
    this.itens.update((atuais) => atuais.some((item) => item.id === rolagem.id) ? atuais : [rolagem, ...atuais]);
  }
}
