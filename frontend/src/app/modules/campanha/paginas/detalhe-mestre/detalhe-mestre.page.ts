import { Component, inject } from '@angular/core';

import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';

/**
 * Visão do MESTRE em `/campanhas/:id` — redesenho em andamento
 * (`campanha-detalhe-mestre-coluna-acoes.spec.md`). Placeholder mínimo nesta task (só o suficiente
 * para `CampanhaDetalheShell` compilar) — o redesenho completo (coluna de ações, Esquadrão em
 * grid, dialogs Membros/Convites, painel fixo Rolagens/Inventário) chega nas próximas tasks desta
 * série.
 */
@Component({
  selector: 'app-campanha-detalhe-mestre',
  templateUrl: './detalhe-mestre.page.html',
})
export class CampanhaDetalheMestre {
  protected readonly dados = inject(CampanhaDetalheDadosService);
}
