import { Component, ElementRef, computed, input, linkedSignal, output, viewChild } from '@angular/core';

import { Tooltip } from '../../tooltip/tooltip.directive';

/**
 * Texto fixo ou derivado do valor exibido. A função existe para o texto acompanhar o rascunho
 * enquanto o slider é arrastado — um texto fixo do consumidor descreveria o valor salvo ao lado
 * de um número que já mudou.
 */
export type BarraEscalaTexto = string | ((valor: number) => string);

/**
 * Primitivo de escala com faixa (`m4-17`): rótulo + número + texto curto da faixa sobre um trilho
 * em degradê (`corInicio` → `corMeio?` → `corFim`), com um marcador de **forma** (losango) na
 * posição do valor e ticks opcionais nos limites de faixa. Genérico — não sabe nada de NPC nem de
 * Cooperação; o consumidor passa limites, cores (tokens) e textos.
 *
 * Diferente de `app-barra-recurso` (atual/máximo de um recurso que se gasta), aqui o valor é uma
 * **posição** numa escala fechada: não há "cheio" nem alerta.
 *
 * Modo `editavel`: o primitivo é dono de um `<input type="range">` nativo (semântica de slider,
 * teclado completo — setas, Home/End, PageUp/PageDown) invisível sobre o trilho; o desenho continua
 * o do modo leitura. O valor arrastado/teclado é só rascunho local: `valorConfirmado` sai **uma
 * vez** ao soltar o ponteiro, no Enter ou ao perder o foco — nunca a cada passo — e Esc restaura o
 * valor recebido. Sem `editavel`, é um `role="meter"`.
 */
@Component({
  selector: 'app-barra-escala',
  imports: [Tooltip],
  templateUrl: './barra-escala.component.html',
  styleUrl: './barra-escala.component.scss',
})
export class BarraEscala {
  readonly rotulo = input.required<string>();
  readonly valor = input.required<number>();
  readonly minimo = input(0);
  readonly maximo = input(10);
  readonly passo = input(1);
  readonly editavel = input(false);
  /** Consumidor ocupado (salvando, outra edição aberta) — o slider não responde. */
  readonly desabilitado = input(false);
  /** Cores do degradê — o consumidor passa tokens (`var(--vida)`), nunca hex. */
  readonly corInicio = input.required<string>();
  readonly corFim = input.required<string>();
  /** Parada central opcional; sem ela, o degradê vai direto de início a fim. */
  readonly corMeio = input<string | null>(null);
  /** Texto curto ao lado do número (ex.: "Neutro"). */
  readonly textoValor = input<BarraEscalaTexto>('');
  /** Frase mais longa — vai ao `appTooltip` e ao `aria-valuetext`. */
  readonly descricao = input<BarraEscalaTexto>('');
  /** Valores da escala onde desenhar um tick (limites de faixa). */
  readonly marcadores = input<readonly number[]>([]);

  readonly valorConfirmado = output<number>();

  private readonly entrada = viewChild<ElementRef<HTMLInputElement>>('entrada');

  /**
   * Rascunho do slider. Volta ao `valor` recebido quando o consumidor o troca **ou** sai do estado
   * ocupado — depois de uma falha de salvamento o valor não muda, e o trilho não pode ficar
   * mostrando a posição que não foi gravada.
   */
  protected readonly rascunho = linkedSignal({
    source: () => [this.valor(), this.desabilitado()] as const,
    computation: ([valor]) => valor,
  });

  /** Último valor já emitido — Enter/soltar seguidos do blur não podem emitir duas vezes. */
  private readonly emitido = linkedSignal({
    source: () => [this.valor(), this.desabilitado()] as const,
    computation: ([valor]) => valor,
  });

  /** Valor exibido: o rascunho enquanto o mestre arrasta, senão o recebido. */
  protected readonly exibido = computed(() => (this.editavel() ? this.rascunho() : this.valor()));

  protected readonly percentual = computed(() => this.posicao(this.exibido()));

  protected readonly texto = computed(() => this.resolver(this.textoValor()));

  protected readonly descricaoExibida = computed(() => this.resolver(this.descricao()));

  protected readonly ticks = computed(() =>
    this.marcadores()
      .filter((marcador) => marcador > this.minimo() && marcador < this.maximo())
      .map((marcador) => this.posicao(marcador)),
  );

  protected readonly degrade = computed(() => {
    const paradas = [this.corInicio(), this.corMeio(), this.corFim()].filter(Boolean);
    return `linear-gradient(to right, ${paradas.join(', ')})`;
  });

  protected readonly textoAcessivel = computed(() =>
    [`${this.exibido()} de ${this.maximo()}`, this.texto(), this.descricaoExibida()]
      .filter(Boolean)
      .join(' — '),
  );

  /** Ajusta ao passo e aos limites — o número exibido no modo leitura continua o recebido. */
  arredondar(valor: number): number {
    const minimo = this.minimo();
    const passo = this.passo() > 0 ? this.passo() : 1;
    const ajustado = minimo + Math.round((valor - minimo) / passo) * passo;
    return Math.min(this.maximo(), Math.max(minimo, ajustado));
  }

  protected aoMover(entrada: HTMLInputElement): void {
    this.rascunho.set(this.arredondar(entrada.valueAsNumber));
  }

  protected confirmar(): void {
    if (!this.editavel() || this.desabilitado()) return;
    const valor = this.rascunho();
    if (valor === this.emitido()) return;
    this.emitido.set(valor);
    this.valorConfirmado.emit(valor);
  }

  /**
   * Volta o trilho ao `valor` recebido — para o consumidor que **não** gravou o último valor
   * emitido (falha de rede, edição bloqueada). Sem isso, uma falha que não chega a trocar nenhum
   * input entre dois ciclos de detecção deixaria o marcador na posição não gravada.
   */
  descartar(): void {
    this.rascunho.set(this.valor());
    this.emitido.set(this.valor());
    // O `[value]` só reescreve o nativo quando o valor ligado muda entre ciclos — aqui pode não ter.
    const entrada = this.entrada()?.nativeElement;
    if (entrada) entrada.value = String(this.valor());
  }

  protected restaurar(entrada: HTMLInputElement): void {
    this.rascunho.set(this.valor());
    entrada.value = String(this.valor());
  }

  private resolver(texto: BarraEscalaTexto): string {
    return typeof texto === 'function' ? texto(this.exibido()) : texto;
  }

  private posicao(valor: number): number {
    const amplitude = this.maximo() - this.minimo();
    if (amplitude <= 0) return 0;
    return Math.max(0, Math.min(100, ((valor - this.minimo()) / amplitude) * 100));
  }
}
