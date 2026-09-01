import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { BotaoIcone } from '../botao-icone/botao-icone.component';

export interface PainelFlutuantePosicao {
  readonly x: number;
  readonly y: number;
}

const PREFIXO_ARMAZENAMENTO = 'contratados-rpg:painel-flutuante:';
const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let proximoNivelEmpilhamento = 1200;

interface EstadoPersistido {
  readonly x: number;
  readonly y: number;
  readonly minimizado: boolean;
}

/**
 * Primitivo de janela flutuante arrastável (`ui-17`). Um único caminho de código para arraste,
 * posição (persistida em `localStorage` por `[id]`), empilhamento de z-index, minimizar e fechar —
 * os cinco comportamentos que `CalculadoraFlutuante`, `CadernoFlutuante` e `LeitorDocumentos`
 * reimplementavam cada um à sua maneira. Redimensionar por arraste e maximizar continuam do
 * consumidor (fora de escopo desta task): ele controla `[largura]`/`[altura]` e pode reposicionar
 * via `moverPara()` (usado por um maximizar próprio, por exemplo).
 *
 * Controlado como `app-modal`: `[aberto]` é do consumidor, `(fechar)` é o único jeito de fechar
 * (clique no "×", clique fora não existe — painel flutuante nunca bloqueia o resto da tela — e
 * `Escape`). Prende o foco (`Tab`/`Shift+Tab` circulam só dentro da janela) enquanto aberto e
 * devolve o foco a quem abriu ao fechar, igual ao `<dialog>` nativo do `app-modal` — mas sem
 * usar `<dialog>`, porque um painel flutuante continua interativo com o resto da tela atrás dele.
 *
 * Corpo projetado (`<ng-content>`) mais três slots: `[painelCabecalhoExtra]` (entre o título e os
 * botões — ex.: status de salvamento do caderno), `[painelAcoesExtras]` (botões extras antes de
 * minimizar/fechar — ex.: maximizar) e `[painelRedimensionar]` (alça de redimensionar do
 * consumidor, ancorada no canto inferior direito pelo próprio consumidor).
 */
@Component({
  selector: 'app-painel-flutuante',
  exportAs: 'appPainelFlutuante',
  imports: [BotaoIcone],
  templateUrl: './painel-flutuante.component.html',
  styleUrl: './painel-flutuante.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pointermove)': 'aoMoverPonteiro($event)',
    '(window:pointerup)': 'encerrarArraste()',
    '(window:pointercancel)': 'encerrarArraste()',
    '(window:resize)': 'aoRedimensionarViewport()',
  },
})
export class PainelFlutuante {
  /** Chave de persistência (`localStorage`) e do empilhamento — única por utilitário, não por instância. */
  readonly id = input.required<string>();
  readonly titulo = input.required<string>();
  /** Linha pequena acima do título (ex.: "Registro operacional"). Sem valor, o cabeçalho só mostra o título. */
  readonly kicker = input<string | null>(null);
  readonly aberto = input.required<boolean>();
  /** Janela pequena tipo popup (largura fixa de 280px, altura pelo conteúdo) — usado pela calculadora. */
  readonly compacta = input(false);
  /** No mobile a janela vira uma folha cheia (sem arraste); o consumidor decide o próprio breakpoint. */
  readonly mobile = input(false);
  readonly largura = input<number | null>(null);
  readonly altura = input<number | null>(null);
  /** Só acabamento (some o raio dos cantos) — o próprio maximizar (posição/tamanho) é do consumidor. */
  readonly maximizada = input(false);
  readonly posicaoInicial = input<PainelFlutuantePosicao>({ x: 16, y: 88 });

  readonly fechar = output<void>();
  /** Emitido a cada troca de minimizado — o consumidor decide focar o próprio gatilho ao minimizar. */
  readonly minimizadoChange = output<boolean>();

  private readonly minimizadoInterno = signal(false);
  readonly minimizado = this.minimizadoInterno.asReadonly();
  protected readonly nivel = signal(0);

  private readonly documento = inject(DOCUMENT);
  private readonly janela = viewChild<ElementRef<HTMLElement>>('janela');

  private readonly posicaoInterna = signal<PainelFlutuantePosicao>({ x: 16, y: 88 });
  protected readonly posicaoAtual = this.posicaoInterna.asReadonly();

  private origemFoco: HTMLElement | null = null;
  private abertoAnterior = false;
  private carregouEstadoPersistido = false;
  private arrastando = false;
  private origemArraste = { ponteiroX: 0, ponteiroY: 0, janelaX: 0, janelaY: 0 };

  constructor() {
    // Estado persistido depende de `[id]`, um input required — só fica disponível a partir do
    // primeiro `effect()`, nunca no corpo do construtor (NG8118). `carregouEstadoPersistido`
    // garante que só carrega uma vez, mesmo que o `effect` rode de novo por outro motivo.
    effect(() => {
      const id = this.id();
      const posicaoInicial = this.posicaoInicial();
      if (this.carregouEstadoPersistido) return;
      this.carregouEstadoPersistido = true;
      const persistido = carregarEstado(id);
      this.posicaoInterna.set(persistido ? { x: persistido.x, y: persistido.y } : posicaoInicial);
      this.minimizadoInterno.set(persistido?.minimizado ?? false);
    });

    effect(() => {
      const aberto = this.aberto();
      if (aberto && !this.abertoAnterior) {
        this.origemFoco = this.documento.activeElement as HTMLElement | null;
        this.trazerParaFrente();
        if (!this.minimizadoInterno()) {
          untracked(() => setTimeout(() => this.janela()?.nativeElement.focus()));
        }
      } else if (!aberto && this.abertoAnterior) {
        const destino = this.origemFoco;
        setTimeout(() => destino?.isConnected && destino.focus());
        this.origemFoco = null;
      }
      this.abertoAnterior = aberto;
    });
  }

  /** Elemento raiz da janela renderizada — o consumidor usa para medir a caixa real ao
   *  redimensionar (redimensionar por arraste continua fora do escopo deste primitivo). */
  obterElemento(): HTMLElement | null {
    return this.janela()?.nativeElement ?? null;
  }

  /** Posição atual — o consumidor lê antes de sobrescrever por comando externo (ex.: maximizar),
   *  para poder devolver com `moverPara()` depois. */
  obterPosicaoAtual(): PainelFlutuantePosicao {
    return this.posicaoInterna();
  }

  /** Reposiciona a janela por comando externo (ex.: maximizar do consumidor). */
  moverPara(posicao: PainelFlutuantePosicao, opcoes?: { readonly persistir?: boolean }): void {
    this.definirPosicao(posicao, opcoes?.persistir ?? true);
  }

  /** Restaura de minimizado, traz para frente e devolve o foco à janela — chamado pelo gatilho do consumidor. */
  restaurar(): void {
    this.definirMinimizado(false);
    this.trazerParaFrente();
    setTimeout(() => this.janela()?.nativeElement.focus());
  }

  protected alternarMinimizar(): void {
    this.definirMinimizado(true);
  }

  protected trazerParaFrente(): void {
    proximoNivelEmpilhamento += 1;
    this.nivel.set(proximoNivelEmpilhamento);
  }

  protected iniciarArraste(evento: PointerEvent): void {
    if (this.mobile() || evento.button !== 0 || this.alvoEhControle(evento.target)) return;
    const retangulo = this.janela()?.nativeElement.getBoundingClientRect();
    if (!retangulo) return;
    evento.preventDefault();
    this.arrastando = true;
    this.origemArraste = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      janelaX: retangulo.left,
      janelaY: retangulo.top,
    };
  }

  protected aoMoverPonteiro(evento: PointerEvent): void {
    if (!this.arrastando) return;
    const retangulo = this.janela()?.nativeElement.getBoundingClientRect();
    const largura = retangulo?.width ?? 0;
    const altura = retangulo?.height ?? 0;
    const x = limitarIntervalo(
      this.origemArraste.janelaX + evento.clientX - this.origemArraste.ponteiroX,
      0,
      Math.max(0, window.innerWidth - largura),
    );
    const y = limitarIntervalo(
      this.origemArraste.janelaY + evento.clientY - this.origemArraste.ponteiroY,
      0,
      Math.max(0, window.innerHeight - altura),
    );
    this.definirPosicao({ x, y });
  }

  protected encerrarArraste(): void {
    this.arrastando = false;
  }

  protected aoRedimensionarViewport(): void {
    if (this.mobile()) return;
    const retangulo = this.janela()?.nativeElement.getBoundingClientRect();
    if (!retangulo) return;
    const atual = this.posicaoInterna();
    const x = limitarIntervalo(atual.x, 0, Math.max(0, window.innerWidth - retangulo.width));
    const y = limitarIntervalo(atual.y, 0, Math.max(0, window.innerHeight - retangulo.height));
    if (x !== atual.x || y !== atual.y) this.definirPosicao({ x, y });
  }

  /**
   * Prende o foco (`Tab`/`Shift+Tab` circulam só dentro da janela) e fecha por `Escape` — os dois
   * que faltavam nos três utilitários originais (nenhum fazia os dois juntos).
   */
  protected aoTeclado(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      this.fechar.emit();
      return;
    }
    if (evento.key !== 'Tab') return;
    const elemento = this.janela()?.nativeElement;
    if (!elemento) return;
    const focaveis = Array.from(elemento.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL));
    if (focaveis.length === 0) {
      evento.preventDefault();
      return;
    }
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = this.documento.activeElement;
    if (evento.shiftKey && ativo === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && ativo === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    } else if (!elemento.contains(ativo)) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  private definirPosicao(posicao: PainelFlutuantePosicao, persistir = true): void {
    this.posicaoInterna.set(posicao);
    if (persistir) this.persistirEstado();
  }

  private definirMinimizado(minimizado: boolean): void {
    this.minimizadoInterno.set(minimizado);
    this.minimizadoChange.emit(minimizado);
    this.persistirEstado();
  }

  private persistirEstado(): void {
    const posicao = this.posicaoInterna();
    try {
      globalThis.localStorage?.setItem(
        PREFIXO_ARMAZENAMENTO + this.id(),
        JSON.stringify({ x: posicao.x, y: posicao.y, minimizado: this.minimizadoInterno() }),
      );
    } catch {
      // A janela continua funcional quando o armazenamento local está indisponível.
    }
  }

  private alvoEhControle(alvo: EventTarget | null): boolean {
    return alvo instanceof Element && Boolean(alvo.closest('button, a, input, select, textarea'));
  }
}

function carregarEstado(id: string): EstadoPersistido | null {
  try {
    const bruto = globalThis.localStorage?.getItem(PREFIXO_ARMAZENAMENTO + id);
    if (!bruto) return null;
    const estado = JSON.parse(bruto) as Partial<EstadoPersistido>;
    if (
      typeof estado.x === 'number' &&
      Number.isFinite(estado.x) &&
      typeof estado.y === 'number' &&
      Number.isFinite(estado.y) &&
      typeof estado.minimizado === 'boolean'
    ) {
      return estado as EstadoPersistido;
    }
  } catch {
    // Preferência local inválida ou indisponível: usa a posição inicial do consumidor.
  }
  return null;
}

function limitarIntervalo(valor: number, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor)) return minimo;
  return Math.min(Math.max(valor, minimo), maximo);
}
