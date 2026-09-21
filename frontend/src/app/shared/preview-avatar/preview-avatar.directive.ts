import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';

/** Hover sustentado antes de abrir o preview (ms) — o mesmo do Esquadrão da campanha e do Acervo. */
const MS_PREVIEW_AVATAR = 600;

/** Lado do quadrado do preview (px) — o mesmo do Esquadrão da campanha e do Acervo. */
const PX_PREVIEW_AVATAR = 300;

/** Folga mínima entre o preview e a borda da janela / o avatar âncora (px). */
const FOLGA = 8;

/**
 * Preview ampliado de um avatar em **hover sustentado** de mouse: a foto inteira (`contain`, sem
 * recorte) num quadrado de 300px ao lado do avatar — a mesma apresentação que o Esquadrão da
 * campanha (visão do jogador e do mestre) e o Acervo já têm, agora reutilizável sem repetir o
 * estado e o cálculo de posição na página.
 *
 * Sem URL (`null`/vazio) a diretiva não faz nada — o avatar de siglas continua como sempre.
 * Toque não tem hover, então só o ponteiro fino (`pointerType: mouse`) abre. Fecha ao sair do
 * avatar, ao clicar, ao rolar qualquer container, ao redimensionar, ao trocar/limpar a URL e ao
 * destruir o host.
 *
 * O preview é portado para o `<body>` com `position: fixed`, então uma lista com `overflow`
 * (a trilha de turnos rola por dentro) nunca o recorta. `pointer-events: none`: é só apresentação
 * e não pode roubar o `pointerleave` do avatar por baixo. Estilizado só com tokens do tema.
 *
 * @example
 * ```html
 * <span class="avatar" [appPreviewAvatar]="combatente.imagemUrl">…</span>
 * ```
 */
@Directive({
  selector: '[appPreviewAvatar]',
  host: {
    '(pointerenter)': 'aoEntrar($event)',
    '(pointerleave)': 'esconder()',
    '(pointerdown)': 'esconder()',
    '(window:resize)': 'esconder()',
    '(window:blur)': 'esconder()',
  },
})
export class PreviewAvatar {
  /** URL da foto a ampliar. Vazio/`null` desliga o preview naquele avatar. */
  readonly appPreviewAvatar = input<string | null | undefined>(null);

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly renderer = inject(Renderer2);
  private readonly documento = inject(DOCUMENT);

  private preview: HTMLElement | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private encerrarRolagem: (() => void) | null = null;

  constructor() {
    // Trocar ou limpar a foto com o preview aberto (ex.: o encontro mudou por tempo real).
    effect(() => {
      this.appPreviewAvatar();
      this.esconder();
    });
    inject(DestroyRef).onDestroy(() => this.esconder());
  }

  protected aoEntrar(evento: PointerEvent): void {
    if (evento.pointerType !== 'mouse') {
      return;
    }
    this.esconder();
    const url = this.appPreviewAvatar();
    if (!url) {
      return;
    }
    this.temporizador = setTimeout(() => this.mostrar(url), MS_PREVIEW_AVATAR);
  }

  protected esconder(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    this.encerrarRolagem?.();
    this.encerrarRolagem = null;
    if (this.preview) {
      this.renderer.removeChild(this.documento.body, this.preview);
      this.preview = null;
    }
  }

  private mostrar(url: string): void {
    this.temporizador = null;
    const janela = this.documento.defaultView;
    if (!janela) {
      return;
    }

    const ancora = this.host.getBoundingClientRect();
    const centroVertical = ancora.top + ancora.height / 2 - PX_PREVIEW_AVATAR / 2;
    const topo = Math.min(
      Math.max(centroVertical, FOLGA),
      janela.innerHeight - PX_PREVIEW_AVATAR - FOLGA,
    );
    const espacoDireita = janela.innerWidth - ancora.right;
    const esquerda =
      espacoDireita >= PX_PREVIEW_AVATAR + FOLGA
        ? ancora.right + FOLGA
        : Math.max(ancora.left - PX_PREVIEW_AVATAR - FOLGA, FOLGA);

    const caixa = this.renderer.createElement('div') as HTMLElement;
    this.renderer.setAttribute(caixa, 'aria-hidden', 'true');
    const estilosCaixa: Record<string, string> = {
      position: 'fixed',
      top: `${Math.round(topo)}px`,
      left: `${Math.round(esquerda)}px`,
      width: `${PX_PREVIEW_AVATAR}px`,
      height: `${PX_PREVIEW_AVATAR}px`,
      padding: '4px',
      background: 'var(--surface)',
      border: '1px solid var(--border-strong)',
      'border-radius': 'var(--radius-card)',
      'box-shadow': '0 8px 24px rgb(0 0 0 / 35%)',
      'z-index': '3000',
      'pointer-events': 'none',
    };
    for (const [propriedade, valor] of Object.entries(estilosCaixa)) {
      this.renderer.setStyle(caixa, propriedade, valor);
    }

    const imagem = this.renderer.createElement('img') as HTMLImageElement;
    this.renderer.setAttribute(imagem, 'src', url);
    this.renderer.setAttribute(imagem, 'alt', '');
    const estilosImagem: Record<string, string> = {
      display: 'block',
      width: '100%',
      height: '100%',
      'object-fit': 'contain',
      'border-radius': 'calc(var(--radius-card) - 4px)',
    };
    for (const [propriedade, valor] of Object.entries(estilosImagem)) {
      this.renderer.setStyle(imagem, propriedade, valor);
    }
    this.renderer.appendChild(caixa, imagem);

    this.renderer.appendChild(this.documento.body, caixa);
    this.preview = caixa;

    // Rolagem de qualquer container (a trilha rola por dentro) desloca o avatar de sob o preview.
    const aoRolar = () => this.esconder();
    this.documento.addEventListener('scroll', aoRolar, { capture: true, passive: true });
    this.encerrarRolagem = () => this.documento.removeEventListener('scroll', aoRolar, true);
  }
}
