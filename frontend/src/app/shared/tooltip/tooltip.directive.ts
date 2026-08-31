import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, Renderer2, inject, input } from '@angular/core';

/** Margem mínima entre o balão e a borda da janela / o elemento âncora (px). */
const MARGEM = 8;

/** Quanto o dedo precisa segurar num host acionável para o balão abrir (ms). */
const MS_TOQUE_LONGO = 500;

/** Deslocamento do dedo que descaracteriza o toque (virou rolagem/arraste) — px. */
const PX_TOLERANCIA_ARRASTE = 10;

/** Janela em que o `click` sintetizado pelo toque ainda é esperado (ms). */
const MS_JANELA_CLIQUE = 700;

/** Janela após um toque em que o `focusin` é ignorado (o foco veio do próprio dedo) — ms. */
const MS_JANELA_FOCO_POR_TOQUE = 1000;

/**
 * Um host é **acionável** quando ele mesmo (ou um ancestro) é um controle de verdade: tocar nele
 * executa alguma coisa. Qualquer outro host é **informativo** — existe só para carregar o texto.
 */
const SELETOR_ACIONAVEL =
  'a[href], button, input, select, textarea, summary, label, [role="button"], [role="link"], ' +
  '[role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"], [contenteditable="true"]';

/** Sequência para gerar o `id` do balão (alvo do `aria-describedby` do host). */
let sequenciaBalao = 0;

/**
 * Tooltip de **duas modalidades** (m3-30 · m3-60): ponteiro fino abre por hover sustentado; toque
 * abre por gesto explícito. A modalidade é decidida **pelo evento** (`PointerEvent.pointerType`),
 * com `matchMedia('(hover: none)')` só como desempate quando o evento não informa o tipo — nunca
 * por user agent.
 *
 * ## Contrato do ponteiro fino (mouse) — inalterado
 * Passar o mouse por `appTooltipDelay` (padrão **300 ms**) abre; sair, clicar, rolar, redimensionar
 * ou tirar o foco fecha. O **foco de teclado também abre**, para acessibilidade.
 *
 * ## Contrato de toque (o ponto do entregável 8 da m3-60)
 * Antes, `pointerenter` agendava e `pointerdown` cancelava no mesmo toque — no celular o balão
 * **nunca** abria, e a informação que só existe no tooltip (DT do atributo, progressão de classe,
 * decomposição das resistências, Contra-ataque, requisito de Maestria…) simplesmente não existia.
 * O contrato agora é explícito e depende de **haver ou não uma ação a proteger**:
 *
 * 1. **Host informativo** (não é nem está dentro de `SELETOR_ACIONAVEL`): **um toque curto abre** o
 *    balão e o `click` sintetizado daquele toque é **suprimido** — o gesto foi "revelar o texto",
 *    e não há ação legítima para disparar. Um segundo toque no host fecha.
 * 2. **Host acionável** (o botão de rolar preset, o lápis de edição, o valor da resistência…):
 *    **o toque curto executa a ação normalmente** — o tooltip nunca fica no caminho. Para ler o
 *    rótulo sem acionar, **pressione e segure** (`MS_TOQUE_LONGO`): o balão abre durante o gesto e,
 *    aí sim, o `click` daquele toque é cancelado (o gesto foi "ler", não "acionar") — mesma
 *    convenção de long-press dos sistemas móveis.
 *
 * Em ambos os casos o balão fecha por: toque fora, `Escape`, rolagem, ou novo toque no host.
 * Arrastar mais de `PX_TOLERANCIA_ARRASTE` cancela o gesto (era rolagem), sem abrir e sem suprimir
 * clique. `appTooltipAcionavel` força a classificação quando a detecção automática não serve.
 *
 * ## Acessibilidade
 * Enquanto aberto, o host aponta para o balão por `aria-describedby` (preservando um valor já
 * existente), então o leitor de tela lê o texto além do rótulo. Transição respeita
 * `prefers-reduced-motion`.
 *
 * ## Posicionamento
 * O balão é **portado para o `<body>`** com `position: fixed` (z-index 3000) a partir do retângulo
 * do host, então **nunca é cortado** por um container com `overflow` (a lista de habilidades, um
 * diálogo…). Abre acima; vira para baixo se não couber, e é travado dentro da janela nos dois eixos
 * — no celular a largura também se limita à tela (`min(260px, 100vw - folga)`), sem estourar a
 * lateral. Estilizado **só com os tokens do tema** "Terminal de Contenção" (as CSS custom properties
 * cascateiam do `:root` até o `<body>`), respeitando a proibição #29 — sem hex/fonte/raio fixos.
 * Texto vazio/ausente **não** abre nada.
 *
 * @example
 * ```html
 * <button [appTooltip]="habilidade.descricao">{{ habilidade.nome }}</button>
 * ```
 */
@Directive({
  // `BotaoIcone` aplica esta diretiva como host directive. Excluir o seletor direto evita que
  // uma tela que também importe `Tooltip` a instancie duas vezes no mesmo `<button>`.
  selector: '[appTooltip]:not([app-botao-icone])',
  host: {
    '(pointerenter)': 'aoEntrarPonteiro($event)',
    '(pointerleave)': 'aoSairPonteiro($event)',
    '(pointerdown)': 'aoPressionar($event)',
    '(pointerup)': 'aoSoltar($event)',
    '(pointercancel)': 'aoCancelarPonteiro()',
    '(contextmenu)': 'aoMenuDeContexto($event)',
    '(focusin)': 'aoFocar()',
    '(focusout)': 'esconder()',
    '(window:resize)': 'esconder()',
    '(window:blur)': 'esconder()',
  },
})
export class Tooltip {
  /** Texto do balão. Vazio/`null` desliga o tooltip naquele elemento. */
  readonly appTooltip = input<string | null | undefined>('');
  /** Atraso do hover antes de abrir (ms). */
  readonly appTooltipDelay = input(300);
  /**
   * Força a classificação de toque do host: `true` = acionável (toque curto executa a ação, balão
   * só no pressionar-e-segurar), `false` = informativo (toque curto abre o balão e cancela o
   * clique). `null` (padrão) detecta pelo próprio DOM via `SELETOR_ACIONAVEL`.
   */
  readonly appTooltipAcionavel = input<boolean | null>(null);

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly renderer = inject(Renderer2);
  private readonly documento = inject(DOCUMENT);

  private balao: HTMLElement | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private temporizadorClique: ReturnType<typeof setTimeout> | null = null;

  /** Desregistradores dos ouvintes globais ativos enquanto o balão está aberto. */
  private encerradoresGlobais: (() => void)[] = [];
  /** Desregistrador do supressor de clique armado por um toque. */
  private encerradorClique: (() => void) | null = null;

  /** Ponto onde o dedo encostou, para distinguir toque de rolagem. */
  private inicioDoToque: { x: number; y: number } | null = null;
  /** O balão visível foi aberto pelo pressionar-e-segurar deste gesto? */
  private abertoAoSegurar = false;
  /** Instante do último toque no host — o `focusin` logo depois veio do dedo, não do teclado. */
  private instanteDoUltimoToque = 0;
  /** Valor original de `aria-describedby`, restaurado ao fechar. */
  private descricaoOriginal: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.esconder();
      this.desarmarSupressaoDeClique();
    });
  }

  // ---------------------------------------------------------------- ponteiro fino (mouse)

  /** Entrada do mouse agenda a abertura; toque tem caminho próprio (`aoPressionar`/`aoSoltar`). */
  protected aoEntrarPonteiro(evento: PointerEvent): void {
    if (this.ehToque(evento)) {
      return;
    }
    this.agendar();
  }

  /** Saída do mouse fecha. No toque, `pointerleave` chega junto com o dedo saindo — ignorar. */
  protected aoSairPonteiro(evento: PointerEvent): void {
    if (this.ehToque(evento)) {
      return;
    }
    this.esconder();
  }

  /** Foco de teclado abre; foco causado pelo próprio dedo, não (o toque já decidiu o que fazer). */
  protected aoFocar(): void {
    if (Date.now() - this.instanteDoUltimoToque < MS_JANELA_FOCO_POR_TOQUE) {
      return;
    }
    this.agendar();
  }

  /** Inicia o atraso do hover; ao fim, mostra o balão (se houver texto). */
  protected agendar(): void {
    this.cancelarTemporizador();
    if (!this.appTooltip()?.trim()) {
      return;
    }
    this.temporizador = setTimeout(() => this.mostrar(), this.appTooltipDelay());
  }

  // ---------------------------------------------------------------- toque

  /**
   * Dedo encostou: guarda a origem do gesto e, **só em host acionável**, agenda o
   * pressionar-e-segurar. Host informativo abre no `pointerup` (assim uma rolagem não abre nada).
   * Com mouse, mantém o comportamento antigo — pressionar fecha o balão.
   */
  protected aoPressionar(evento: PointerEvent): void {
    if (!this.ehToque(evento)) {
      this.esconder();
      return;
    }

    this.instanteDoUltimoToque = Date.now();
    this.inicioDoToque = { x: evento.clientX, y: evento.clientY };
    this.abertoAoSegurar = false;
    this.cancelarTemporizador();

    if (this.balao || !this.hostEhAcionavel()) {
      return;
    }
    this.temporizador = setTimeout(() => this.abrirAoSegurar(), MS_TOQUE_LONGO);
  }

  /** Dedo saiu: aplica o contrato de toque descrito no topo da diretiva. */
  protected aoSoltar(evento: PointerEvent): void {
    if (!this.ehToque(evento)) {
      return;
    }

    this.instanteDoUltimoToque = Date.now();
    this.cancelarTemporizador();
    const arrastou = this.arrastou(evento);
    this.inicioDoToque = null;

    if (arrastou) {
      this.abertoAoSegurar = false;
      return; // era rolagem: não abre, não fecha e não interfere no clique
    }

    // Host acionável que abriu segurando: o gesto foi "ler o rótulo" → a ação daquele toque cai.
    if (this.abertoAoSegurar) {
      this.abertoAoSegurar = false;
      this.armarSupressaoDeClique();
      return;
    }

    // Host acionável em toque curto: a ação passa intacta e o balão nem abre.
    if (this.hostEhAcionavel()) {
      return;
    }

    // Host informativo: o toque alterna o balão e nunca vira ação.
    if (this.balao) {
      this.esconder();
    } else {
      this.mostrar();
    }
    this.armarSupressaoDeClique();
  }

  /** Gesto cancelado pelo sistema (rolagem assumida, chamada…): não abre nada. */
  protected aoCancelarPonteiro(): void {
    this.cancelarTemporizador();
    this.inicioDoToque = null;
    this.abertoAoSegurar = false;
  }

  /** Com o balão aberto por pressionar-e-segurar, o menu de contexto do sistema só atrapalha. */
  protected aoMenuDeContexto(evento: Event): void {
    if (this.balao) {
      evento.preventDefault();
    }
  }

  /** Abre pelo pressionar-e-segurar num host acionável e marca o gesto para cancelar o clique. */
  private abrirAoSegurar(): void {
    this.mostrar();
    this.abertoAoSegurar = this.balao !== null;
  }

  /** `true` quando o dedo andou o bastante para o gesto virar rolagem/arraste. */
  private arrastou(evento: PointerEvent): boolean {
    const inicio = this.inicioDoToque;
    if (!inicio) {
      return false;
    }
    return (
      Math.abs(evento.clientX - inicio.x) > PX_TOLERANCIA_ARRASTE ||
      Math.abs(evento.clientY - inicio.y) > PX_TOLERANCIA_ARRASTE
    );
  }

  /** Modalidade pelo evento; sem `pointerType` (evento sintético), desempata pelo `matchMedia`. */
  private ehToque(evento: PointerEvent): boolean {
    const tipo = evento.pointerType;
    if (tipo === 'touch' || tipo === 'pen') {
      return true;
    }
    if (tipo === 'mouse') {
      return false;
    }
    return this.combina('(hover: none)');
  }

  /** Host é um controle de verdade (ou está dentro de um)? `appTooltipAcionavel` tem precedência. */
  private hostEhAcionavel(): boolean {
    const forcado = this.appTooltipAcionavel();
    if (forcado !== null) {
      return forcado;
    }
    return this.host.closest(SELETOR_ACIONAVEL) !== null;
  }

  /**
   * Derruba o `click` que o navegador sintetiza depois do toque, antes de ele chegar ao host (daí
   * a fase de captura no documento). Só derruba clique dentro do host; qualquer outro alvo apenas
   * desarma o supressor — nunca engole um clique alheio.
   */
  private armarSupressaoDeClique(): void {
    this.desarmarSupressaoDeClique();

    const suprimir = (evento: Event) => {
      const alvo = evento.target;
      if (alvo instanceof Node && this.host.contains(alvo)) {
        evento.preventDefault();
        evento.stopPropagation();
        evento.stopImmediatePropagation();
      }
      this.desarmarSupressaoDeClique();
    };

    this.documento.addEventListener('click', suprimir, true);
    this.encerradorClique = () => this.documento.removeEventListener('click', suprimir, true);
    this.temporizadorClique = setTimeout(() => this.desarmarSupressaoDeClique(), MS_JANELA_CLIQUE);
  }

  private desarmarSupressaoDeClique(): void {
    this.encerradorClique?.();
    this.encerradorClique = null;
    if (this.temporizadorClique !== null) {
      clearTimeout(this.temporizadorClique);
      this.temporizadorClique = null;
    }
  }

  // ---------------------------------------------------------------- abrir / fechar

  /** Fecha o balão e cancela qualquer abertura pendente. */
  protected esconder(): void {
    this.cancelarTemporizador();
    this.abertoAoSegurar = false;
    this.encerrarOuvintesGlobais();
    if (this.balao) {
      this.restaurarDescricao();
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
    const identificador = `app-tooltip-${++sequenciaBalao}`;
    this.renderer.setAttribute(balao, 'role', 'tooltip');
    this.renderer.setAttribute(balao, 'id', identificador);
    this.renderer.appendChild(balao, this.renderer.createText(texto));

    const semMovimento = this.combina('(prefers-reduced-motion: reduce)');
    const estilos: Record<string, string> = {
      position: 'fixed',
      // No celular a tela manda: o balão nunca passa da largura útil (folga dos dois lados).
      'max-width': `min(260px, calc(100vw - ${MARGEM * 2}px))`,
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
      opacity: semMovimento ? '1' : '0',
      transition: semMovimento ? 'none' : 'opacity 120ms ease',
    };
    for (const [propriedade, valor] of Object.entries(estilos)) {
      this.renderer.setStyle(balao, propriedade, valor);
    }

    this.renderer.appendChild(this.documento.body, balao);
    this.posicionar(balao);
    this.balao = balao;
    this.descrever(identificador);
    this.registrarOuvintesGlobais();

    if (semMovimento) {
      return;
    }
    // Fade-in após o layout (o balão já está medido/posicionado).
    requestAnimationFrame(() => {
      if (this.balao === balao) {
        this.renderer.setStyle(balao, 'opacity', '1');
      }
    });
  }

  /** Aponta o host para o balão sem perder um `aria-describedby` que já existisse. */
  private descrever(identificador: string): void {
    this.descricaoOriginal = this.host.getAttribute('aria-describedby');
    const valor = this.descricaoOriginal
      ? `${this.descricaoOriginal} ${identificador}`
      : identificador;
    this.renderer.setAttribute(this.host, 'aria-describedby', valor);
  }

  private restaurarDescricao(): void {
    if (this.descricaoOriginal) {
      this.renderer.setAttribute(this.host, 'aria-describedby', this.descricaoOriginal);
    } else {
      this.renderer.removeAttribute(this.host, 'aria-describedby');
    }
    this.descricaoOriginal = null;
  }

  /**
   * Enquanto aberto: toque/clique fora, `Escape` e rolagem (inclusive de container interno, por
   * isso captura no documento) fecham. Ouvintes nativos de propósito — o balão é DOM manual, não
   * depende de detecção de mudanças, e um `pointerdown` global via `Renderer2` acordaria o
   * agendador do Angular a cada toque da tela.
   */
  private registrarOuvintesGlobais(): void {
    this.encerrarOuvintesGlobais();

    const foraDoHost = (evento: Event) => {
      const alvo = evento.target;
      if (!(alvo instanceof Node) || !this.host.contains(alvo)) {
        this.esconder();
      }
    };
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        this.esconder();
      }
    };
    const aoRolar = () => this.esconder();

    this.documento.addEventListener('pointerdown', foraDoHost, true);
    this.documento.addEventListener('keydown', aoTeclar, true);
    this.documento.addEventListener('scroll', aoRolar, { capture: true, passive: true });

    this.encerradoresGlobais = [
      () => this.documento.removeEventListener('pointerdown', foraDoHost, true),
      () => this.documento.removeEventListener('keydown', aoTeclar, true),
      () => this.documento.removeEventListener('scroll', aoRolar, true),
    ];
  }

  private encerrarOuvintesGlobais(): void {
    for (const encerrar of this.encerradoresGlobais) {
      encerrar();
    }
    this.encerradoresGlobais = [];
  }

  /** `matchMedia` pode não existir (SSR/jsdom) — ausência significa "não combina". */
  private combina(consulta: string): boolean {
    const janela = this.documento.defaultView;
    return janela?.matchMedia?.(consulta).matches === true;
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
    // Trava vertical: em tela baixa (celular deitado) nem acima nem abaixo cabe inteiro.
    const topoMaximo = janela.innerHeight - altura - MARGEM;
    topo = Math.max(MARGEM, topoMaximo > MARGEM ? Math.min(topo, topoMaximo) : topo);

    const centro = ancora.left + ancora.width / 2 - largura / 2;
    const esquerda = Math.max(MARGEM, Math.min(centro, janela.innerWidth - largura - MARGEM));

    this.renderer.setStyle(balao, 'top', `${Math.round(topo)}px`);
    this.renderer.setStyle(balao, 'left', `${Math.round(esquerda)}px`);
  }
}
