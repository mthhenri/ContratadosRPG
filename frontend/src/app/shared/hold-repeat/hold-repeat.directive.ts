import { DestroyRef, Directive, inject, input, output } from '@angular/core';

/**
 * Repetição por pressão contínua ("segurar para repetir") num controle, no padrão de um spinner
 * numérico nativo: um toque/clique curto dá **um** passo; **segurar** dispara um passo imediato e,
 * após um atraso, passa a repetir em intervalo fixo até soltar.
 *
 * Emite `passo` a cada incremento — o consumidor decide o que cada passo faz (ex.: −1/+1 de Vida).
 * Usa **pointer events** (mouse/toque/caneta) para o hold e `keydown` (Enter/Espaço) para o
 * teclado, **sem** ouvir `click`: assim um mesmo gesto nunca conta um passo a mais. O `window:blur`
 * e o `window:pointerup` garantem a parada mesmo se o ponteiro for solto fora do elemento (ou se ele
 * ficar desabilitado ao atingir um limite no meio do hold). Os temporizadores são limpos na
 * destruição.
 *
 * @example
 * ```html
 * <button appHoldRepeat (passo)="ajustar('vidaAtual', -1)">−</button>
 * ```
 */
@Directive({
  selector: '[appHoldRepeat]',
  host: {
    '(pointerdown)': 'aoPressionar($event)',
    '(pointerup)': 'aoSoltar()',
    '(pointerleave)': 'aoSoltar()',
    '(pointercancel)': 'aoSoltar()',
    '(keydown)': 'aoTecla($event)',
    '(window:pointerup)': 'aoSoltar()',
    '(window:blur)': 'aoSoltar()',
  },
})
export class HoldRepeat {
  /** Quanto segurar antes de começar a repetir (ms). Abaixo disso é um toque/clique de um passo. */
  readonly atrasoInicial = input(400);
  /** Intervalo entre as repetições enquanto se mantém pressionado (ms). */
  readonly intervaloRepeticao = input(90);

  /** Um passo: um toque/clique curto (ou Enter/Espaço) e cada repetição durante o hold. */
  readonly passo = output<void>();

  private temporizadorInicial: ReturnType<typeof setTimeout> | null = null;
  private temporizadorRepeticao: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.aoSoltar());
  }

  /** Inicia o gesto: passo imediato e, após o atraso, começa a repetir. */
  protected aoPressionar(evento: PointerEvent): void {
    // Só o botão primário (mouse esquerdo; toque/caneta reportam 0 no contato principal).
    if (evento.button !== 0) {
      return;
    }
    this.aoSoltar();
    this.passo.emit();
    this.temporizadorInicial = setTimeout(() => {
      this.passo.emit();
      this.temporizadorRepeticao = setInterval(
        () => this.passo.emit(),
        this.intervaloRepeticao(),
      );
    }, this.atrasoInicial());
  }

  /** Para qualquer repetição em andamento (soltou, saiu do elemento, perdeu o foco…). */
  protected aoSoltar(): void {
    if (this.temporizadorInicial !== null) {
      clearTimeout(this.temporizadorInicial);
      this.temporizadorInicial = null;
    }
    if (this.temporizadorRepeticao !== null) {
      clearInterval(this.temporizadorRepeticao);
      this.temporizadorRepeticao = null;
    }
  }

  /** Teclado: Enter/Espaço dão um passo (o auto-repeat do teclado gera a repetição naturalmente). */
  protected aoTecla(evento: KeyboardEvent): void {
    if (evento.key !== 'Enter' && evento.key !== ' ') {
      return;
    }
    // Impede o scroll do Espaço e o `click` sintético que duplicaria o passo.
    evento.preventDefault();
    this.passo.emit();
  }
}
