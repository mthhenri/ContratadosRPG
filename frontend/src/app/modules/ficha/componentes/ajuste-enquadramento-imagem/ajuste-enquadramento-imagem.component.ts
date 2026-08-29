import { Component, DestroyRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';

import type { FichaImagemFocoDto } from '@contratados-rpg/shared/dtos/ficha';

import { deslocarPan, escalaMinimaPorEixo, type Proporcao } from '../../../../shared/enquadramento-imagem.util';
import { FocoImagem } from '../../../../shared/foco-imagem.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';

/** Proporção real do avatar que está sendo enquadrado (jogador 100×100, criatura 86×96). */
export type ProporcaoAvatar = Proporcao;

const ESCALA_MINIMA = 1;
const ESCALA_MAXIMA = 3;
const ALTURA_PRE_VISUALIZACAO_PX = 220;

/**
 * Seletor de enquadramento do avatar (crop-pan, retrabalho pós-quebra do zoom `object-position` +
 * `transform: scale()` original) — retomada do que `m3-62` deixou fora de escopo ("crop/editor de
 * imagem no client"), sem processamento de imagem no servidor: o usuário dá zoom no slider e
 * arrasta pra posicionar dentro da margem que o zoom abriu, e só o metadado (`FichaImagemFocoDto`,
 * percentual + escala) é confirmado — a imagem em si nunca é recortada de verdade, o recorte é
 * sempre visual (`estiloTransformEnquadramento`, um único `translate()+scale()`), tanto aqui
 * quanto no avatar renderizado (`FichaVisualizacao`/`CriaturaVisualizacao`).
 *
 * Reusado pelos dois avatares (jogador e criatura) — evita duplicar a lógica de arrasto/zoom em
 * cada componente. Renderiza como painel sobreposto (`position: absolute`, ver SCSS), ancorado
 * pelo host — não deve empurrar/realinhar o resto da coluna.
 */
@Component({
  selector: 'app-ajuste-enquadramento-imagem',
  imports: [Botao, FocoImagem],
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

  /** Diretiva que renderiza o `translate()+scale()` da pré-visualização (`#focoImg`, no HTML) —
   * o arrasto reusa a MESMA proporção que ela mediu da imagem, nunca remede por conta própria. */
  private readonly focoImg = viewChild<FocoImagem>('focoImg');

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
  // revela mais do lado esquerdo da imagem, então `x` diminui — sinal invertido em relação ao
  // deslocamento do ponteiro. `escalaMinimaPorEixo` soma a folga que uma foto não-quadrada já tem
  // de graça (`object-fit: cover`) à escala do slider — numa foto quadrada ela é sempre 1 e o
  // resultado é igual a usar a escala pura; sem NENHUMA margem naquele eixo, `deslocarPan` devolve
  // o valor inalterado (mesma regra de qualquer crop-pan: nada pra arrastar).
  protected aoMoverArrasto(evento: PointerEvent, caixa: HTMLElement): void {
    if (!this.arrastando) {
      return;
    }
    const deltaXPercentual = ((evento.clientX - this.inicioPonteiroX) / caixa.clientWidth) * 100;
    const deltaYPercentual = ((evento.clientY - this.inicioPonteiroY) / caixa.clientHeight) * 100;
    const escalaAtual = this.escala();
    const minima = escalaMinimaPorEixo(this.focoImg()?.proporcaoImagem() ?? null, this.proporcao());
    this.x.set(deslocarPan(this.inicioX, deltaXPercentual, escalaAtual * minima.x));
    this.y.set(deslocarPan(this.inicioY, deltaYPercentual, escalaAtual * minima.y));
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
