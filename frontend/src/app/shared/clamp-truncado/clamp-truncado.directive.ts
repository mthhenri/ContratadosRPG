import { afterNextRender, Directive, ElementRef, inject, signal } from '@angular/core';

/**
 * Detecta se um `-webkit-line-clamp` cortou o conteúdo do host, pra só oferecer "ver mais" (ou um
 * `appTooltip` com o texto inteiro) quando há de fato algo escondido (P-012).
 *
 * Mede **uma vez**, no primeiro render (`scrollHeight > clientHeight` do próprio host) — de
 * propósito sem `ResizeObserver`: o consumidor típico (`.seletor__opcao-desc--expandida`) remove o
 * clamp ao expandir, e uma remedição nesse momento zeraria `truncado()` e faria o botão "ver
 * mais"/"ver menos" desaparecer no meio do próprio gesto que ele disparou.
 */
@Directive({
  selector: '[appClampTruncado]',
  exportAs: 'appClampTruncado',
})
export class ClampTruncado {
  private readonly elemento = inject(ElementRef<HTMLElement>);
  protected readonly truncadoSignal = signal(false);
  readonly truncado = this.truncadoSignal.asReadonly();

  constructor() {
    afterNextRender(() => {
      const alvo = this.elemento.nativeElement;
      this.truncadoSignal.set(alvo.scrollHeight > alvo.clientHeight + 1);
    });
  }
}
