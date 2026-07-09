import { Component, inject } from '@angular/core';

import { TempoRealService } from '../../core/services/tempo-real.service';

/**
 * Selo discreto de estado do tempo real (m3-08). **Silêncio quando conectado**; quando a conexão
 * cai (o Render free tier dorme e derruba o socket — §9), mostra um aviso `TEMPO REAL OFFLINE` em
 * `--warning`. Consome o Signal `conectado` do `TempoRealService` (já existente) — nenhuma lógica de
 * socket aqui, só apresentação.
 *
 * Vive nas telas de ficha (lista/visualização), onde a conexão foi aberta (`conectar()`); o
 * **debounce** que evita piscar em micro-quedas é 100% SCSS (o elemento só surge após ~1,5s
 * desconectado — reconexões rápidas o desmontam antes de aparecer), mesmo padrão do
 * `.carregando-global` (ux-loading). Enquanto offline o ao-vivo está suspenso, mas a
 * ressincronização refaz o fetch ao reconectar — o aviso só informa a defasagem temporária.
 */
@Component({
  selector: 'app-indicador-tempo-real',
  templateUrl: './indicador-tempo-real.component.html',
  styleUrl: './indicador-tempo-real.component.scss',
})
export class IndicadorTempoReal {
  private readonly tempoRealService = inject(TempoRealService);

  /** `true` com o socket conectado (nada é exibido); `false` mostra o aviso após o debounce. */
  protected readonly conectado = this.tempoRealService.conectado;
}
