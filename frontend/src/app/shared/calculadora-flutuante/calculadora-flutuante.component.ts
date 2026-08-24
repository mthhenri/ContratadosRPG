import { Component, ElementRef, computed, model, signal, viewChild } from '@angular/core';

import { Icone } from '../icone/icone.component';
import { AutoFocus } from '../auto-focus/auto-focus.directive';
import {
  avaliarExpressao,
  formatarResultado,
  type EntradaHistoricoCalculadora,
} from './calculadora-flutuante.util';

const TECLAS_OPERADOR = ['+', '-', '×', '÷'] as const;

/** Largura de abertura (escala 1×) — referência pra derivar `--calc-escala` a partir da largura atual. */
const LARGURA_PADRAO = 280;

/** Tamanho mínimo do popup (px) — abaixo disso o teclado numérico deixa de caber decentemente. */
const LARGURA_MINIMA = 190;
const ALTURA_MINIMA = 250;

/** Limita `valor` ao intervalo `[minimo, maximo]` (usado para não deixar o popup sair da tela). */
function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));
}

/**
 * Calculadora comum flutuante (m3-54) — aritmética normal, **sem relação** com a calculadora do
 * sistema (M1) ou com os dados da ficha. Ícone fixo no canto inferior esquerdo abre um popup
 * arrastável (drag via pointer events próprios — sem CDK, não instalado neste repo); o histórico
 * de cálculos vive só em memória (Signals), então some no F5 (fora de escopo persistir).
 *
 * Autocontido: quem consome só declara `<app-calculadora-flutuante />` uma vez na tela — o gatilho
 * e o popup moram os dois aqui dentro.
 */
@Component({
  selector: 'app-calculadora-flutuante',
  imports: [Icone, AutoFocus],
  templateUrl: './calculadora-flutuante.component.html',
  styleUrl: './calculadora-flutuante.component.scss',
  host: {
    '(window:pointermove)': 'aoMoverPonteiro($event)',
    '(window:pointerup)': 'aoSoltarPonteiro()',
  },
})
export class CalculadoraFlutuante {
  /**
   * `model` (não `signal` interno) — P-021: no mobile, quando `HistoricoRolagensSidebar` cobre a
   * tela inteira, o próprio gatilho deste componente fica inacessível atrás do painel dela. A
   * correção move o botão "Abrir calculadora" para *dentro* do painel do histórico, que precisa
   * de um jeito de abrir esta calculadora de fora — daí o `model` em vez de estado só interno.
   * Continua funcionando sem nenhum binding externo (`<app-calculadora-flutuante />` sozinho,
   * como nas telas que não pareiam com o histórico).
   */
  readonly aberta = model(false);
  protected readonly expressao = signal('');
  protected readonly erro = signal(false);
  protected readonly historico = signal<readonly EntradaHistoricoCalculadora[]>([]);

  /** `null` até o primeiro arraste — o popup nasce ancorado por CSS (canto inferior esquerdo). */
  protected readonly posicao = signal<{ x: number; y: number } | null>(null);
  /** `null` até o primeiro redimensionamento — o popup nasce no tamanho fixo do CSS. */
  protected readonly tamanho = signal<{ width: number; height: number } | null>(null);

  /**
   * Fator aplicado via `--calc-escala` a fontes/controles no template (não só a caixa do popup) —
   * redimensionar pra baixo também encolhe os números, não só sobra em branco/rolagem.
   */
  protected readonly escala = computed(() => {
    const tamanhoAtual = this.tamanho();
    return tamanhoAtual ? tamanhoAtual.width / LARGURA_PADRAO : 1;
  });

  private readonly popupElemento = viewChild<ElementRef<HTMLElement>>('popup');
  private arrastando = false;
  private origemArraste = { x: 0, y: 0 };
  private redimensionando = false;
  private origemRedimensionamento = { x: 0, y: 0, largura: 0, altura: 0 };

  /** Gatilho: abre se fechada, fecha se aberta — o "x" no cabeçalho também fecha. */
  protected alternar(): void {
    this.aberta.update((atual) => !atual);
  }

  protected fechar(): void {
    this.aberta.set(false);
  }

  /** Anexa um dígito/operador/parêntese à expressão em edição, com pequenas guardas de digitação. */
  protected inserir(token: string): void {
    this.erro.set(false);
    const atual = this.expressao();

    // Um novo operador substitui o anterior em vez de encadear ("5+×" nunca é válido).
    const ultimoCaractere = atual.at(-1);
    if (
      (TECLAS_OPERADOR as readonly string[]).includes(token) &&
      ultimoCaractere !== undefined &&
      (TECLAS_OPERADOR as readonly string[]).includes(ultimoCaractere)
    ) {
      this.expressao.set(atual.slice(0, -1) + token);
      return;
    }

    // Sem ponto decimal duplicado dentro do número corrente.
    if (token === '.') {
      const numeroCorrente = atual.split(/[+\-×÷%()]/).pop() ?? '';
      if (numeroCorrente.includes('.')) {
        return;
      }
    }

    this.expressao.set(atual + token);
  }

  protected limpar(): void {
    this.expressao.set('');
    this.erro.set(false);
  }

  /** Esvazia o histórico da sessão (sem afetar a expressão em edição). */
  protected limparHistorico(): void {
    this.historico.set([]);
  }

  private apagarUltimo(): void {
    this.erro.set(false);
    this.expressao.update((atual) => atual.slice(0, -1));
  }

  /** Avalia a expressão corrente; em êxito, empilha no histórico da sessão (mais recente primeiro). */
  protected calcular(): void {
    const expressaoAtual = this.expressao();
    if (!expressaoAtual) {
      return;
    }
    try {
      const resultado = formatarResultado(avaliarExpressao(expressaoAtual));
      this.historico.update((lista) => [{ expressao: expressaoAtual, resultado }, ...lista]);
      this.expressao.set(resultado);
      this.erro.set(false);
    } catch {
      this.erro.set(true);
    }
  }

  /**
   * Teclado (além do clique — critério de aceite): só escuta enquanto o foco está dentro do
   * popup (`tabindex` + `appAutoFocus` no container), então não interfere com o resto da ficha.
   */
  protected aoTeclado(evento: KeyboardEvent): void {
    const tecla = evento.key;
    if (/^[0-9.]$/.test(tecla)) {
      this.inserir(tecla);
      evento.preventDefault();
      return;
    }
    const mapaOperadores: Record<string, string> = {
      '+': '+',
      '-': '-',
      '*': '×',
      '/': '÷',
      '%': '%',
      '(': '(',
      ')': ')',
    };
    if (tecla in mapaOperadores) {
      this.inserir(mapaOperadores[tecla]);
      evento.preventDefault();
      return;
    }
    if (tecla === 'Enter' || tecla === '=') {
      this.calcular();
      evento.preventDefault();
      return;
    }
    if (tecla === 'Backspace') {
      this.apagarUltimo();
      evento.preventDefault();
      return;
    }
    if (tecla === 'Escape') {
      this.limpar();
      evento.preventDefault();
    }
  }

  /** Início do arraste (pointerdown no cabeçalho) — guarda o offset do ponteiro dentro do popup. */
  protected iniciarArraste(evento: PointerEvent): void {
    if (evento.button !== 0) {
      return;
    }
    const elemento = this.popupElemento()?.nativeElement;
    if (!elemento) {
      return;
    }
    const retangulo = elemento.getBoundingClientRect();
    this.origemArraste = { x: evento.clientX - retangulo.left, y: evento.clientY - retangulo.top };
    this.arrastando = true;
    evento.preventDefault();
  }

  /** Segue o ponteiro (listener em `window` — o gesto continua mesmo saindo do cabeçalho). */
  private continuarArraste(evento: PointerEvent): void {
    const elemento = this.popupElemento()?.nativeElement;
    const largura = elemento?.offsetWidth ?? 0;
    const altura = elemento?.offsetHeight ?? 0;
    const x = limitar(evento.clientX - this.origemArraste.x, 0, window.innerWidth - largura);
    const y = limitar(evento.clientY - this.origemArraste.y, 0, window.innerHeight - altura);
    this.posicao.set({ x, y });
  }

  /** Início do redimensionamento (pointerdown na alça do canto) — guarda o tamanho de partida. */
  protected iniciarRedimensionamento(evento: PointerEvent): void {
    if (evento.button !== 0) {
      return;
    }
    const elemento = this.popupElemento()?.nativeElement;
    if (!elemento) {
      return;
    }
    const retangulo = elemento.getBoundingClientRect();
    this.origemRedimensionamento = {
      x: evento.clientX,
      y: evento.clientY,
      largura: retangulo.width,
      altura: retangulo.height,
    };
    this.redimensionando = true;
    evento.preventDefault();
  }

  /**
   * Segue o ponteiro escalando largura e altura juntas (proporcional) — projeta o deslocamento
   * do ponteiro sobre a diagonal do popup em vez de tratar os dois eixos independentemente, então
   * a proporção original nunca distorce, só o tamanho.
   */
  private continuarRedimensionamento(evento: PointerEvent): void {
    const origem = this.origemRedimensionamento;
    const diagonal = Math.hypot(origem.largura, origem.altura);
    const deltaX = evento.clientX - origem.x;
    const deltaY = evento.clientY - origem.y;
    const deslocamento = (deltaX * origem.largura + deltaY * origem.altura) / diagonal;
    const escala = (diagonal + deslocamento) / diagonal;

    const larguraMaxima = window.innerWidth - 16;
    const alturaMaxima = window.innerHeight - 16;
    const escalaMinima = Math.max(LARGURA_MINIMA / origem.largura, ALTURA_MINIMA / origem.altura);
    const escalaMaxima = Math.min(larguraMaxima / origem.largura, alturaMaxima / origem.altura);
    const escalaLimitada = limitar(escala, escalaMinima, escalaMaxima);

    this.tamanho.set({
      width: origem.largura * escalaLimitada,
      height: origem.altura * escalaLimitada,
    });
  }

  /** Um único par de listeners em `window` cobre arraste e redimensionamento (mutuamente exclusivos). */
  protected aoMoverPonteiro(evento: PointerEvent): void {
    if (this.arrastando) {
      this.continuarArraste(evento);
    } else if (this.redimensionando) {
      this.continuarRedimensionamento(evento);
    }
  }

  protected aoSoltarPonteiro(): void {
    this.arrastando = false;
    this.redimensionando = false;
  }
}
