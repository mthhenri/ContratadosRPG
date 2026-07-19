import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, Renderer2, inject, input } from '@angular/core';

/** Margem mínima entre o balão e a borda da janela / o elemento âncora (px). */
const MARGEM = 8;

/**
 * Tooltip por **hover sustentado** (m3-30): passar o mouse sobre o elemento por `appTooltipDelay`
 * (padrão **300 ms**) abre um balão com o texto passado; sair, clicar, rolar ou tirar o foco fecha.
 * Também abre por **teclado** (foco) para acessibilidade.
 *
 * O balão é **portado para o `<body>`** e posicionado com `position: fixed` a partir do retângulo do
 * elemento (acima; vira para baixo se não couber), então **nunca é cortado** por um container com
 * `overflow` (a lista de habilidades, um diálogo…). É estilizado **só com os tokens do tema**
 * "Terminal de Contenção" (as CSS custom properties cascateiam do `:root` até o `<body>`), respeitando
 * a proibição #29 — sem hex/fonte/raio fixos. Texto vazio/ausente **não** abre nada.
 *
 * @example
 * ```html
 * <button [appTooltip]="habilidade.descricao">{{ habilidade.nome }}</button>
 * ```
 */
@Directive({
  selector: '[appTooltip]',
  host: {
    '(pointerenter)': 'agendar()',
    '(pointerleave)': 'esconder()',
    '(pointerdown)': 'esconder()',
    '(focusin)': 'agendar()',
    '(focusout)': 'esconder()',
    '(window:scroll)': 'esconder()',
    '(window:resize)': 'esconder()',
    '(window:blur)': 'esconder()',
  },
})
export class Tooltip {
  /** Texto do balão. Vazio/`null` desliga o tooltip naquele elemento. */
  readonly appTooltip = input<string | null | undefined>('');
  /** Atraso do hover antes de abrir (ms). */
  readonly appTooltipDelay = input(300);

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly documento = inject(DOCUMENT);

  private balao: HTMLElement | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.esconder());
  }

  /** Inicia o atraso do hover; ao fim, mostra o balão (se houver texto). */
  protected agendar(): void {
    this.cancelarTemporizador();
    if (!this.appTooltip()?.trim()) {
      return;
    }
    this.temporizador = setTimeout(() => this.mostrar(), this.appTooltipDelay());
  }

  /** Fecha o balão e cancela qualquer abertura pendente. */
  protected esconder(): void {
    this.cancelarTemporizador();
    if (this.balao) {
      this.renderer.removeChild(this.documento.body, this.balao);
      this.balao = null;
    }
  }

  private cancelarTemporizador(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }

  /** Cria o balão no `<body>`, aplica o estilo do tema, posiciona e faz o fade-in. */
  private mostrar(): void {
    const texto = this.appTooltip()?.trim();
    if (!texto || this.balao) {
      return;
    }

    const balao = this.renderer.createElement('div') as HTMLElement;
    this.renderer.setAttribute(balao, 'role', 'tooltip');
    this.renderer.appendChild(balao, this.renderer.createText(texto));

    const estilos: Record<string, string> = {
      position: 'fixed',
      'max-width': '260px',
      padding: '8px 11px',
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      'border-radius': 'var(--radius-control)',
      color: 'var(--text)',
      font: '500 12px/1.45 var(--font-sans)',
      'letter-spacing': 'normal',
      'box-shadow': '0 8px 24px rgb(0 0 0 / 45%)',
      'z-index': '3000',
      'pointer-events': 'none',
      opacity: '0',
      transition: 'opacity 120ms ease',
    };
    for (const [propriedade, valor] of Object.entries(estilos)) {
      this.renderer.setStyle(balao, propriedade, valor);
    }

    this.renderer.appendChild(this.documento.body, balao);
    this.posicionar(balao);
    this.balao = balao;

    // Fade-in após o layout (o balão já está medido/posicionado).
    requestAnimationFrame(() => {
      if (this.balao === balao) {
        this.renderer.setStyle(balao, 'opacity', '1');
      }
    });
  }

  /** Posiciona o balão acima do âncora (centrado); vira para baixo se não couber, e trava na janela. */
  private posicionar(balao: HTMLElement): void {
    const ancora = this.host.getBoundingClientRect();
    const largura = balao.offsetWidth;
    const altura = balao.offsetHeight;
    const janela = this.documento.defaultView!;

    let topo = ancora.top - altura - MARGEM;
    if (topo < MARGEM) {
      topo = ancora.bottom + MARGEM; // sem espaço acima → abre embaixo
    }

    const centro = ancora.left + ancora.width / 2 - largura / 2;
    const esquerda = Math.max(MARGEM, Math.min(centro, janela.innerWidth - largura - MARGEM));

    this.renderer.setStyle(balao, 'top', `${Math.round(topo)}px`);
    this.renderer.setStyle(balao, 'left', `${Math.round(esquerda)}px`);
  }
}
