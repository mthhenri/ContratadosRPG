import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';

/**
 * Esmaece as bordas de uma lista rolável **só onde o conteúdo está de fato cortado**, marcando o
 * elemento hospedeiro com classes conforme a posição do scroll — nos dois eixos:
 * - vertical: `overflow-fade--topo` (rolou para baixo) / `overflow-fade--base` (há mais abaixo);
 * - horizontal: `overflow-fade--esquerda` (rolou para a direita) / `overflow-fade--direita` (há
 *   mais à direita).
 *
 * A regra é a mesma em cada eixo: no início da lista não há fade na borda inicial (nada cortado
 * antes), no fim não há fade na borda final, no meio há os dois, e sem overflow naquele eixo →
 * nenhuma classe (corte reto). Um consumidor de lista vertical só estiliza topo/base; um de lista
 * horizontal, esquerda/direita — o mesmo elemento pode até rolar nos dois eixos.
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
    '[class.overflow-fade--esquerda]': 'fadeEsquerda()',
    '[class.overflow-fade--direita]': 'fadeDireita()',
  },
})
export class OverflowFade {
  private readonly elemento: ElementRef<HTMLElement> = inject(ElementRef);
  protected readonly fadeTopo = signal(false);
  protected readonly fadeBase = signal(false);
  protected readonly fadeEsquerda = signal(false);
  protected readonly fadeDireita = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const alvo = this.elemento.nativeElement;
      let frameAgendado = 0;

      const reavaliar = (): void => {
        cancelAnimationFrame(frameAgendado);
        frameAgendado = requestAnimationFrame(() => {
          const restanteAbaixo = alvo.scrollHeight - alvo.clientHeight - alvo.scrollTop;
          const restanteDireita = alvo.scrollWidth - alvo.clientWidth - alvo.scrollLeft;
          // Epsilon de 1px absorve arredondamentos sub-pixel.
          this.fadeTopo.set(alvo.scrollTop > 1);
          this.fadeBase.set(restanteAbaixo > 1);
          this.fadeEsquerda.set(alvo.scrollLeft > 1);
          this.fadeDireita.set(restanteDireita > 1);
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
