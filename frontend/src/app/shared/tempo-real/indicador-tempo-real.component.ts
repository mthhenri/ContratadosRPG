import { Component, inject } from '@angular/core';

import { TempoRealService } from '../../core/services/tempo-real.service';
import { Chip } from '../ui/chip/chip.component';

/**
 * Selo discreto de estado do tempo real (m3-08). **Silêncio quando conectado**; quando a conexão
 * cai (o Render free tier dorme e derruba o socket — §9), mostra um aviso `TEMPO REAL OFFLINE` em
 * `--warning`. Consome os Signals `conectado`/`ativo` do `TempoRealService` (já existentes) —
 * nenhuma lógica de socket aqui, só apresentação.
 *
 * Montado uma única vez na topbar (`Layout`, ui-21) — antes cada página de ficha/campanha
 * posicionava a própria cópia, disputando espaço com os botões do próprio cabeçalho (achado ao
 * vivo em `visualizar.page`/`painel-encontro.page`). Só aparece quando `ativo()`: a página que
 * chamou `conectar()` ao menos uma vez nesta sessão está — ou já esteve — em uso; sem isso, toda
 * tela apareceria "offline" antes de qualquer ficha/campanha ter sido aberta. O **debounce** que
 * evita piscar em micro-quedas é 100% SCSS (o elemento só surge após ~1,5s desconectado —
 * reconexões rápidas o desmontam antes de aparecer), mesmo padrão do `.carregando-global`
 * (ux-loading). Enquanto offline o ao-vivo está suspenso, mas a ressincronização refaz o fetch ao
 * reconectar — o aviso só informa a defasagem temporária.
 */
@Component({
  selector: 'app-indicador-tempo-real',
  imports: [Chip],
  templateUrl: './indicador-tempo-real.component.html',
  styleUrl: './indicador-tempo-real.component.scss',
})
export class IndicadorTempoReal {
  private readonly tempoRealService = inject(TempoRealService);

  /** `true` com o socket conectado (nada é exibido); `false` mostra o aviso após o debounce. */
  protected readonly conectado = this.tempoRealService.conectado;
  /** `true` desde a primeira `conectar()` desta sessão — guarda contra falso alarme antes disso. */
  protected readonly ativo = this.tempoRealService.ativo;
}
