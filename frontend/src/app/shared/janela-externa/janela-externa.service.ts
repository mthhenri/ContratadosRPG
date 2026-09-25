import { Injectable, OnDestroy, signal } from '@angular/core';

/** Tamanho inicial da janela aberta por `window.open`. */
export interface DimensoesJanelaExterna {
  largura: number;
  altura: number;
}

const DIMENSOES_PADRAO: DimensoesJanelaExterna = { largura: 420, altura: 720 };

/**
 * Janelas externas da SPA (`/janela/...`) abertas por esta aba — uma por contexto
 * (`ficha:<id>`, `campanha:<id>`, `anotacoes:<id>`…). Guarda o handle de cada `Window` para focar a
 * existente em vez de abrir outra e para detectar o fechamento, que devolve o painel local.
 */
@Injectable({ providedIn: 'root' })
export class JanelaExternaService implements OnDestroy {
  private readonly janelas = new Map<string, Window>();
  private readonly contextosAbertos = signal<ReadonlySet<string>>(new Set());
  private intervalo: number | null = null;

  constructor() {
    window.addEventListener('focus', this.verificarFechamento);
    document.addEventListener('visibilitychange', this.verificarFechamento);
  }

  estaAberta(contexto: string): boolean {
    return this.contextosAbertos().has(contexto);
  }

  /**
   * Abre (ou foca, se já existe) a janela do contexto. Precisa ser chamado síncrono dentro do
   * `(click)`, senão o navegador bloqueia o pop-up. Devolve `false` quando a janela não abriu — o
   * painel local continua visível nesse caso.
   */
  abrir(
    contexto: string,
    url: string,
    dimensoes: DimensoesJanelaExterna = DIMENSOES_PADRAO,
  ): boolean {
    this.verificarFechamento();
    const existente = this.janelas.get(contexto);
    if (existente) {
      existente.focus();
      return true;
    }

    let janela: Window | null = null;
    try {
      // `noopener` nas features faz window.open retornar null mesmo quando a janela abriu.
      // Abre about:blank, rompe opener antes da navegação e conserva o handle para detectar close.
      janela = window.open(
        'about:blank',
        '_blank',
        `width=${dimensoes.largura},height=${dimensoes.altura}`,
      );
      if (!janela) return false;
      janela.opener = null;
      janela.location.replace(url);
    } catch {
      try {
        janela?.close();
      } catch {
        // Se a navegação falhar, o painel local continua visível.
      }
      return false;
    }

    this.janelas.set(contexto, janela);
    this.contextosAbertos.update((atuais) => new Set([...atuais, contexto]));
    this.intervalo ??= window.setInterval(this.verificarFechamento, 500);
    return true;
  }

  ngOnDestroy(): void {
    window.removeEventListener('focus', this.verificarFechamento);
    document.removeEventListener('visibilitychange', this.verificarFechamento);
    this.pararVerificacao();
  }

  private readonly verificarFechamento = (): void => {
    let houveFechamento = false;
    for (const [contexto, janela] of this.janelas) {
      if (janela.closed) {
        this.janelas.delete(contexto);
        houveFechamento = true;
      }
    }
    if (houveFechamento) this.contextosAbertos.set(new Set(this.janelas.keys()));
    if (this.janelas.size === 0) this.pararVerificacao();
  };

  private pararVerificacao(): void {
    if (this.intervalo !== null) {
      window.clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }
}
