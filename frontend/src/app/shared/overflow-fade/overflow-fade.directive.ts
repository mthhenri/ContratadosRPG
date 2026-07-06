import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';

/**
 * Esmaece as bordas de uma lista rolável **só onde o conteúdo está de fato cortado**, marcando o
 * elemento hospedeiro com `overflow-fade--topo` e/ou `overflow-fade--base` conforme a posição do
 * scroll:
 * - no topo da lista → sem fade superior (nada cortado acima);
 * - no fim da lista → sem fade inferior (nada cortado abaixo);
 * - no meio → os dois;
 * - sem overflow → nenhum (corte reto).
 *
 * O estilo do esmaecimento (máscara em gradiente) fica no SCSS do consumidor, que consome essas
 * classes. Reavalia em scroll, mudança de tamanho (`ResizeObserver`) e de conteúdo
 * (`MutationObserver`), coalescido por `requestAnimationFrame`. Observadores/listeners só no
 * browser (`afterNextRender`) e desligados na destruição.
 */
@Directive({
  selector: '[appOverflowFade]',
  host: {
    '[class.overflow-fade--topo]': 'fadeTopo()',
    '[class.overflow-fade--base]': 'fadeBase()',
  },
})
export class OverflowFade {
  private readonly elemento: ElementRef<HTMLElement> = inject(ElementRef);
  protected readonly fadeTopo = signal(false);
  protected readonly fadeBase = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const alvo = this.elemento.nativeElement;
      let frameAgendado = 0;

      const reavaliar = (): void => {
        cancelAnimationFrame(frameAgendado);
        frameAgendado = requestAnimationFrame(() => {
          const restanteAbaixo = alvo.scrollHeight - alvo.clientHeight - alvo.scrollTop;
          // Epsilon de 1px absorve arredondamentos sub-pixel.
          this.fadeTopo.set(alvo.scrollTop > 1);
          this.fadeBase.set(restanteAbaixo > 1);
        });
      };

      const observadorTamanho = new ResizeObserver(reavaliar);
      observadorTamanho.observe(alvo);

      const observadorConteudo = new MutationObserver(reavaliar);
      observadorConteudo.observe(alvo, { childList: true, subtree: true, characterData: true });

      alvo.addEventListener('scroll', reavaliar, { passive: true });

      reavaliar();

      destroyRef.onDestroy(() => {
        cancelAnimationFrame(frameAgendado);
        observadorTamanho.disconnect();
        observadorConteudo.disconnect();
        alvo.removeEventListener('scroll', reavaliar);
      });
    });
  }
}
