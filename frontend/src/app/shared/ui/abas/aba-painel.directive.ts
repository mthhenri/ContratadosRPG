import { Directive } from '@angular/core';

/**
 * Marca o container de conteúdo de uma aba com o papel `tabpanel` (WAI-ARIA), companion de
 * `app-abas`/`app-aba` (`ui-03` · `P-034`). Focável (`tabindex="0"`) porque o padrão APG exige
 * que o próprio painel receba foco — o conteúdo interno (formulário, lista) mantém sua própria
 * ordem de tab.
 *
 * Sem estilo: o consumidor mantém o layout do próprio painel. A associação com a aba
 * (`[id]`/`[attr.aria-labelledby]`) fica com o consumidor, que já tem os dois ids em mãos.
 */
@Directive({
  selector: '[appAbaPainel]',
  host: {
    role: 'tabpanel',
    tabindex: '0',
  },
})
export class AbaPainel {}
