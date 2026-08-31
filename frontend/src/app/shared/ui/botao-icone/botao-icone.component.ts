import { Component, computed, input } from '@angular/core';

import { Tooltip } from '../../tooltip/tooltip.directive';

/** Tamanhos reais das ações compactas encontradas na auditoria visual UI-06. */
export type BotaoIconeTamanho = 'compacto' | 'padrao';

/**
 * Primitivo para uma ação unitária apresentada apenas por ícone (UI-08).
 *
 * O host continua sendo o `<button>` nativo: `type`, `disabled`, foco e a semântica do controle
 * permanecem no consumidor. Toda chamada deve fornecer `aria-label` e `appTooltip`, pois o ícone
 * não oferece um rótulo visual. Teclas, steppers, abas, fundo de modal e controles compostos de
 * domínio têm semântica própria e não usam este primitivo.
 */
@Component({
  selector: 'button[app-botao-icone]',
  hostDirectives: [{ directive: Tooltip, inputs: ['appTooltip'] }],
  template: '<ng-content />',
  styleUrl: './botao-icone.component.scss',
  host: {
    '[class]': 'classes()',
  },
})
export class BotaoIcone {
  /** `compacto` cobre fechar/copiar; `padrao` cobre ações dentro de campos. */
  readonly tamanho = input<BotaoIconeTamanho>('compacto');

  protected readonly classes = computed(() => `botao-icone botao-icone--${this.tamanho()}`);
}
