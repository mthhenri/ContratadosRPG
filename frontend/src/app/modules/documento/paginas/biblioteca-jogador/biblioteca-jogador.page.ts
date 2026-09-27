import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { BibliotecaLayout } from '../../componentes/biblioteca-layout/biblioteca-layout.component';
import { BibliotecaLeituraStore } from '../../biblioteca-leitura.store';

/**
 * Biblioteca do jogador (m9-05) — montada pela casca `BibliotecaDocumentos` quando o papel é
 * `JOGADOR`. A mesma estrutura da página do mestre (`BibliotecaLayout`), **sem** os controles dele:
 * sem "Novo documento", chips de estado, setas nem Editar/Revelar/Remover. O documento abre no
 * `LeitorDocumento`, somente leitura; a lista, o documento aberto e o tempo real são do
 * `BibliotecaLeituraStore`, o mesmo do espectador.
 */
@Component({
  selector: 'app-biblioteca-jogador',
  imports: [BibliotecaLayout],
  providers: [BibliotecaLeituraStore],
  templateUrl: './biblioteca-jogador.page.html',
})
export class BibliotecaJogador {
  protected readonly store = inject(BibliotecaLeituraStore);
  private readonly campanhaService = inject(CampanhaService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly rotaAtiva = inject(ActivatedRoute);

  protected readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('campanhaId'));
  protected readonly campanhaNome = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.topbarContexto.limpar());
    this.campanhaService.recuperarCampanha(this.campanhaId).subscribe({
      next: (campanha) => {
        this.campanhaNome.set(campanha.nome);
        this.topbarContexto.definir(campanha.nome);
      },
    });
    this.store.iniciar(this.campanhaId);
  }
}
