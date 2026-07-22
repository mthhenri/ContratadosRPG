import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

/**
 * Foca o elemento hospedeiro assim que ele é renderizado — via script (`HTMLElement.focus()`),
 * não pelo atributo HTML `autofocus`. O `autofocus` declarativo só é honrado **uma vez por
 * documento** (a "autofocus processed flag" da spec): num SPA como este, a primeira vez que ele
 * dispara em qualquer elemento da página trava a flag, e todo `autofocus` inserido depois (ex.: um
 * botão de confirmação que troca de lugar com outro ao pedir confirmação de remover) é
 * silenciosamente ignorado — o elemento nunca ganha foco de verdade, então clicar fora nunca
 * dispara `(blur)` pra cancelar. Chamar `.focus()` via script não tem essa limitação.
 *
 * @example
 * ```html
 * <button appAutoFocus (blur)="cancelar()">✓</button>
 * ```
 */
@Directive({
  selector: '[appAutoFocus]',
})
export class AutoFocus {
  private readonly elemento = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => this.elemento.nativeElement.focus());
  }
}
