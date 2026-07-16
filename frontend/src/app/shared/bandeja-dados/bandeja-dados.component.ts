import { Component, inject } from '@angular/core';

import { BandejaDadosService } from './bandeja-dados.service';

/**
 * Bandeja de dados flutuante (m3-22): fixa na base central da tela, exibe as rolagens recentes
 * empilhadas (teste de atributo da Visão Geral, passos de preset). Lê o estado de
 * `BandejaDadosService`; não rola nada — só apresenta. Container preparado para "dados físicos" (3D)
 * numa feature futura. Só tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-bandeja-dados',
  imports: [],
  templateUrl: './bandeja-dados.component.html',
  styleUrl: './bandeja-dados.component.scss',
})
export class BandejaDados {
  protected readonly bandeja = inject(BandejaDadosService);

  /** Opacidade por posição: a mais nova (índice 0, à direita) cheia; o histórico à esquerda esmaece. */
  protected opacidade(indice: number): number {
    return Math.max(0.3, 1 - indice * 0.22);
  }
}
