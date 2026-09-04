import { Component, computed, input } from '@angular/core';

import { Tooltip } from '../../tooltip/tooltip.directive';

/**
 * Tamanhos reais das ações compactas encontradas na auditoria visual UI-06, mais `mini` (`P-048`,
 * ui-28): ícone inline dentro de outro controle (ex.: o dadinho de um pill de rolagem) — sem
 * borda, distinto dos outros dois, pensados para ação isolada.
 */
export type BotaoIconeTamanho = 'mini' | 'compacto' | 'padrao';

/**
 * Primitivo para uma ação unitária apresentada apenas por ícone (UI-08).
 *
 * O host aceita `<button>` **ou** `<a>` (ui-28): `type`/`disabled` (só faz sentido em `<button>`),
 * `routerLink`/`href`, foco e a semântica do controle permanecem no consumidor — `:disabled` no
 * SCSS não tem efeito sobre `<a>` (pseudo-classe não se aplica a âncora), o que é aceitável: nenhum
 * consumidor de âncora precisa de estado desabilitado. Toda chamada deve fornecer `aria-label` e
 * `appTooltip`, pois o ícone não oferece um rótulo visual. Teclas, steppers, abas, fundo de modal e
 * controles compostos de domínio têm semântica própria e não usam este primitivo.
 */
@Component({
  selector: 'button[app-botao-icone], a[app-botao-icone]',
  hostDirectives: [{ directive: Tooltip, inputs: ['appTooltip'] }],
  template: '<ng-content />',
  styleUrl: './botao-icone.component.scss',
  host: {
    '[class]': 'classes()',
  },
})
export class BotaoIcone {
  /** `mini` cobre ícone inline sem borda; `compacto` cobre fechar/copiar; `padrao` cobre ações dentro de campos. */
  readonly tamanho = input<BotaoIconeTamanho>('compacto');

  /**
   * Selo circular (ui-30, `P-048`): raio 50% em vez do raio de controle padrão — para os badges
   * sobre canto de foto/card (enquadrar e remover avatar, "i" de informação), que sempre foram
   * círculos, não retângulos arredondados. Opt-in porque a maioria das ações unitárias do produto
   * usa o raio de controle padrão.
   */
  readonly redondo = input(false);

  protected readonly classes = computed(() => {
    const partes = ['botao-icone', `botao-icone--${this.tamanho()}`];
    if (this.redondo()) partes.push('botao-icone--redondo');
    return partes.join(' ');
  });
}
