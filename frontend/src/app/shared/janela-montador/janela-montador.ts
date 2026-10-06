import { computed, signal, type WritableSignal } from '@angular/core';

import type { PainelFlutuante, PainelFlutuantePosicao } from '../ui/painel-flutuante/painel-flutuante.component';

export interface JanelaTamanho {
  readonly largura: number;
  readonly altura: number;
}

export interface JanelaMontadorOpcoes {
  /** Tamanho que a janela tenta ter quando o viewport comporta. */
  readonly largura: number;
  readonly altura: number;
  readonly larguraMinima: number;
  readonly alturaMinima: number;
  /** Onde a janela nasce; o tamanho inicial é reduzido para caber abaixo dela em telas baixas (Notebook). */
  readonly posicaoInicial: PainelFlutuantePosicao;
}

/** Folga que a janela mantém das bordas do viewport (`--space-16`). */
export const MARGEM_JANELA = 16;

/**
 * Tamanho, redimensionar por alça e maximizar da janela flutuante do montador de rolagem — compartilhado pelo
 * `MontadorRolagem` (Atual) e pelo `MontadorRolagemExperimental`, que antes repetiam a mecânica. O primitivo
 * `app-painel-flutuante` só conhece o retângulo da janela; o tamanho e o maximizar são do consumidor (ver a doc dele).
 * Maximizar segue o `CadernoFlutuante`: tamanho = viewport, posição `0,0` sem persistir, posição anterior devolvida
 * ao restaurar ou fechar.
 */
export class JanelaMontador {
  readonly maximizada = signal(false);

  private readonly viewport = signal(lerViewport());
  private readonly desejado: WritableSignal<JanelaTamanho>;
  private posicaoAntesDeMaximizar: PainelFlutuantePosicao | null = null;
  private redimensionando = false;
  private origem = { ponteiroX: 0, ponteiroY: 0, tamanho: { largura: 0, altura: 0 } as JanelaTamanho };

  /** Tamanho aplicado à janela: o viewport inteiro quando maximizada, senão o desejado limitado ao que cabe. */
  readonly tamanho = computed<JanelaTamanho>(() => {
    const viewport = this.viewport();
    if (this.maximizada()) {
      return viewport;
    }
    const desejado = this.desejado();
    return {
      largura: Math.min(desejado.largura, Math.max(viewport.largura - 2 * MARGEM_JANELA, 0)),
      altura: Math.min(desejado.altura, Math.max(viewport.altura - 2 * MARGEM_JANELA, 0)),
    };
  });

  constructor(private readonly opcoes: JanelaMontadorOpcoes) {
    const { altura, alturaMinima, largura, posicaoInicial } = opcoes;
    const cabeAbaixo = this.viewport().altura - posicaoInicial.y - MARGEM_JANELA;
    this.desejado = signal<JanelaTamanho>({ largura, altura: Math.max(Math.min(altura, cabeAbaixo), alturaMinima) });
  }

  atualizarViewport(): void {
    this.viewport.set(lerViewport());
  }

  alternarMaximizar(painel: PainelFlutuante | undefined): void {
    if (this.maximizada()) {
      this.restaurar(painel);
      return;
    }
    this.encerrarRedimensionamento();
    this.posicaoAntesDeMaximizar = painel?.obterPosicaoAtual() ?? null;
    this.maximizada.set(true);
    painel?.moverPara({ x: 0, y: 0 }, { persistir: false });
  }

  /** Volta ao tamanho normal e devolve a posição de antes (no-op quando não está maximizada). */
  restaurar(painel: PainelFlutuante | undefined): void {
    if (!this.maximizada()) {
      return;
    }
    this.maximizada.set(false);
    if (this.posicaoAntesDeMaximizar) {
      painel?.moverPara(this.posicaoAntesDeMaximizar);
    }
    this.posicaoAntesDeMaximizar = null;
  }

  iniciarRedimensionamento(evento: PointerEvent): void {
    if (this.maximizada() || evento.button !== 0) {
      return;
    }
    evento.preventDefault();
    this.redimensionando = true;
    this.origem = { ponteiroX: evento.clientX, ponteiroY: evento.clientY, tamanho: this.tamanho() };
  }

  /** Nunca menor que o mínimo nem maior que o espaço entre a janela e a borda do viewport. */
  moverRedimensionamento(evento: PointerEvent, painel: PainelFlutuante | undefined): void {
    if (!this.redimensionando) {
      return;
    }
    const posicao = painel?.obterPosicaoAtual() ?? { x: 0, y: 0 };
    const viewport = this.viewport();
    const { larguraMinima, alturaMinima } = this.opcoes;
    this.desejado.set({
      largura: limitar(
        this.origem.tamanho.largura + evento.clientX - this.origem.ponteiroX,
        larguraMinima,
        viewport.largura - posicao.x,
      ),
      altura: limitar(
        this.origem.tamanho.altura + evento.clientY - this.origem.ponteiroY,
        alturaMinima,
        viewport.altura - posicao.y,
      ),
    });
  }

  encerrarRedimensionamento(): void {
    this.redimensionando = false;
  }
}

function lerViewport(): JanelaTamanho {
  return typeof window === 'undefined'
    ? { largura: 1920, altura: 1080 }
    : { largura: window.innerWidth, altura: window.innerHeight };
}

function limitar(valor: number, minimo: number, maximo: number): number {
  if (maximo <= minimo) {
    return maximo;
  }
  return Math.min(Math.max(valor, minimo), maximo);
}
