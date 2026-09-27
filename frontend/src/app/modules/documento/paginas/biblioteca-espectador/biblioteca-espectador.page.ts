import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import type { CampanhaPainelEspectadorDto } from '@contratados-rpg/shared/dtos/campanha';

import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { BibliotecaLayout } from '../../componentes/biblioteca-layout/biblioteca-layout.component';
import { BibliotecaLeituraStore } from '../../biblioteca-leitura.store';

/**
 * Biblioteca do espectador (m9-05) — `campanhas/:id/espectador/documentos`, atrás do
 * `espectadorCampanhaResolver`, como as outras páginas do espectador. A mesma leitura do jogador
 * (`BibliotecaLeituraStore` + `BibliotecaLayout`): só o revelado, sem controles.
 *
 * O `ESPECTADOR` não pode chamar `recuperarCampanha`/`listarMembros`/`GET /ficha?campanhaId` (403
 * desde a m8-02): o nome da campanha vem do painel já resolvido (`campanha`, a identidade segura),
 * e o resto sai só da API de documento. O "voltar" leva ao painel do espectador.
 */
@Component({
  selector: 'app-biblioteca-espectador',
  imports: [BibliotecaLayout],
  providers: [BibliotecaLeituraStore],
  templateUrl: './biblioteca-espectador.page.html',
})
export class BibliotecaEspectador {
  protected readonly store = inject(BibliotecaLeituraStore);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly rotaAtiva = inject(ActivatedRoute);

  protected readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('id'));
  protected readonly campanhaNome =
    (this.rotaAtiva.snapshot.data?.['painelEspectador'] as CampanhaPainelEspectadorDto | undefined)
      ?.campanha.nome ?? '';

  constructor() {
    this.topbarContexto.definir(this.campanhaNome || null);
    inject(DestroyRef).onDestroy(() => this.topbarContexto.limpar());
    this.store.iniciar(this.campanhaId);
  }
}
