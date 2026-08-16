import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';

import type { FichaImagemFocoDto } from '@contratados-rpg/shared/dtos/ficha';

/** Proporção real do avatar que está sendo enquadrado (jogador 100×100, criatura 86×96). */
export interface ProporcaoAvatar {
  readonly largura: number;
  readonly altura: number;
}

const ESCALA_MINIMA = 1;
const ESCALA_MAXIMA = 3;
const ALTURA_PRE_VISUALIZACAO_PX = 220;

const limitar = (valor: number, minimo: number, maximo: number): number =>
  Math.min(maximo, Math.max(minimo, valor));

/**
 * Seletor de enquadramento do avatar (pan/zoom, ajuste pós-mockup) — retomada do que `m3-62`
 * deixou fora de escopo ("crop/editor de imagem no client"), sem processamento de imagem no
 * servidor: o usuário arrasta pra posicionar e usa um slider pra dar zoom, e só o metadado
 * (`FichaImagemFocoDto`, percentual + escala) é confirmado — a imagem em si nunca é recortada de
 * verdade, o recorte é sempre visual (`object-position` + `transform: scale()`), tanto aqui
 * quanto no avatar renderizado (`FichaVisualizacao`/`CriaturaVisualizacao`).
 *
 * Reusado pelos dois avatares (jogador e criatura) — evita duplicar a lógica de arrasto/zoom em
 * cada componente. Renderiza como painel sobreposto (`position: absolute`, ver SCSS), ancorado
 * pelo host — não deve empurrar/realinhar o resto da coluna.
 */
@Component({
  selector: 'app-ajuste-enquadramento-imagem',
  templateUrl: './ajuste-enquadramento-imagem.component.html',
  styleUrl: './ajuste-enquadramento-imagem.component.scss',
})
export class AjusteEnquadramentoImagem {
  private readonly destroyRef = inject(DestroyRef);

  /** Arquivo recém-selecionado (ainda não enviado) ou URL da imagem já salva. */
  readonly origem = input.required<File | string>();
  readonly proporcao = input<ProporcaoAvatar>({ largura: 100, altura: 100 });
  readonly focoInicial = input<FichaImagemFocoDto | null>(null);

  readonly confirmar = output<FichaImagemFocoDto>();
  readonly cancelar = output<void>();

  protected readonly x = signal(50);
  protected readonly y = signal(50);
  protected readonly escala = signal(ESCALA_MINIMA);
  protected readonly previewUrl = signal('');

  protected readonly escalaMinima = ESCALA_MINIMA;
  protected readonly escalaMaxima = ESCALA_MAXIMA;

  protected readonly larguraPreVisualizacao = computed(() => {
    const { largura, altura } = this.proporcao();
    return Math.round((ALTURA_PRE_VISUALIZACAO_PX * largura) / altura);
  });
  protected readonly alturaPreVisualizacao = ALTURA_PRE_VISUALIZACAO_PX;

  private objectUrlCriada: string | null = null;
  private arrastando = false;
  private inicioPonteiroX = 0;
  private inicioPonteiroY = 0;
  private inicioX = 50;
  private inicioY = 50;

  constructor() {
    effect(() => {
      const foco = this.focoInicial();
      this.x.set(foco?.x ?? 50);
      this.y.set(foco?.y ?? 50);
      this.escala.set(foco?.escala ?? ESCALA_MINIMA);
    });

    effect(() => {
      const fonte = this.origem();
      if (typeof fonte === 'string') {
        this.previewUrl.set(fonte);
        return;
      }
      const url = URL.createObjectURL(fonte);
      this.objectUrlCriada = url;
      this.previewUrl.set(url);
    });

    this.destroyRef.onDestroy(() => {
      if (this.objectUrlCriada) {
        URL.revokeObjectURL(this.objectUrlCriada);
      }
    });
  }

  protected aoIniciarArrasto(evento: PointerEvent): void {
    (evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId);
    this.arrastando = true;
    this.inicioPonteiroX = evento.clientX;
    this.inicioPonteiroY = evento.clientY;
    this.inicioX = this.x();
    this.inicioY = this.y();
  }

  // Arrastar move o conteúdo visível, como puxar uma foto sob uma máscara: o cursor pra direita
  // revela mais do lado esquerdo da imagem, então `x` (object-position) diminui — sinal invertido
  // em relação ao deslocamento do ponteiro.
  protected aoMoverArrasto(evento: PointerEvent, caixa: HTMLElement): void {
    if (!this.arrastando) {
      return;
    }
    const deltaXPercentual = ((evento.clientX - this.inicioPonteiroX) / caixa.clientWidth) * 100;
    const deltaYPercentual = ((evento.clientY - this.inicioPonteiroY) / caixa.clientHeight) * 100;
    this.x.set(limitar(this.inicioX - deltaXPercentual, 0, 100));
    this.y.set(limitar(this.inicioY - deltaYPercentual, 0, 100));
  }

  protected aoSoltarArrasto(evento: PointerEvent): void {
    this.arrastando = false;
    (evento.currentTarget as HTMLElement).releasePointerCapture(evento.pointerId);
  }

  protected aoAjustarEscala(evento: Event): void {
    this.escala.set((evento.target as HTMLInputElement).valueAsNumber);
  }

  protected confirmarEnquadramento(): void {
    this.confirmar.emit({ x: this.x(), y: this.y(), escala: this.escala() });
  }
}
