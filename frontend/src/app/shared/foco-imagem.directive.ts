import { afterNextRender, Directive, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';

import type { FichaImagemFocoDto } from '@contratados-rpg/shared/dtos/ficha';

import { estiloTransformEnquadramento, type Proporcao } from './enquadramento-imagem.util';

/**
 * Aplica o crop-pan de {@link estiloTransformEnquadramento} direto numa `<img>`, medindo a
 * proporção real da imagem (`naturalWidth`/`naturalHeight`) pra abrir margem de arrasto extra no
 * eixo em que a foto não bate com a proporção da caixa — sem isso, uma foto retangular numa caixa
 * quadrada só dá pra reenquadrar depois de dar zoom manual (a folga que o `object-fit: cover` já
 * dá de graça, de outro modo, fica inalcançável).
 *
 * Também troca `object-fit`/`object-position` pra `contain`/`0% 0%` **só quando há `foco`** — o
 * `cover` (padrão do SCSS, mantido sem `foco`) pré-corta a imagem no próprio *paint*, descartando
 * pra sempre o que sobra além da caixa antes do `transform` rodar; `contain` nunca corta nada, e
 * `0% 0%` ancora a imagem no canto (o mesmo referencial que `estiloTransformEnquadramento`
 * assume) em vez do centralizado padrão. Sem `foco` (ficha sem ajuste), a diretiva não mexe em
 * nada disso — visual idêntico ao de sempre, sem depender de medir a imagem primeiro.
 *
 * Reusada pelo editor (`AjusteEnquadramentoImagem`) e pelos dois avatares finais
 * (`FichaVisualizacao`/`CriaturaVisualizacao`). `exportAs` expõe {@link proporcaoImagem} pra quem
 * hospeda a diretiva (o editor, no cálculo do arrasto) reusar a MESMA proporção medida aqui —
 * nunca remedir a imagem duas vezes.
 *
 * @example
 * ```html
 * <img [src]="url" [appFocoImagem]="foco()" />
 * ```
 */
@Directive({
  selector: '[appFocoImagem]',
  exportAs: 'appFocoImagem',
  host: {
    '[style.transform]': 'transform()',
    '[style.object-fit]': 'objectFit()',
    '[style.object-position]': 'objectPosition()',
  },
})
export class FocoImagem {
  private readonly elemento = inject(ElementRef<HTMLImageElement>);

  readonly appFocoImagem = input<FichaImagemFocoDto | null>(null);
  readonly appFocoImagemCaixa = input<Proporcao>({ largura: 1, altura: 1 });

  /** Proporção real da imagem carregada — `null` até o `load` (ou já `complete` no anexo, imagem em cache). */
  readonly proporcaoImagem = signal<Proporcao | null>(null);

  protected readonly transform = computed(() =>
    estiloTransformEnquadramento(this.appFocoImagem(), this.proporcaoImagem(), this.appFocoImagemCaixa()),
  );
  protected readonly objectFit = computed(() => (this.appFocoImagem() ? 'contain' : null));
  protected readonly objectPosition = computed(() => (this.appFocoImagem() ? '0% 0%' : null));

  constructor() {
    afterNextRender(() => this.medirSeJaCarregada());
  }

  @HostListener('load')
  protected aoCarregar(): void {
    this.medirSeJaCarregada();
  }

  private medirSeJaCarregada(): void {
    const img = this.elemento.nativeElement;
    if (img.complete && img.naturalWidth > 0) {
      this.proporcaoImagem.set({ largura: img.naturalWidth, altura: img.naturalHeight });
    }
  }
}
