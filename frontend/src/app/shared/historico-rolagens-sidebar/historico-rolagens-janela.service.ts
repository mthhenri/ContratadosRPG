import { Injectable, OnDestroy, signal } from '@angular/core';

/** Visão que abriu o histórico da campanha — define para onde a janela oferece voltar. */
export type OrigemJanelaCampanha = 'campanha' | 'espectador';

/** Mantém a janela externa e o espaço do histórico local sincronizados nesta aba. */
@Injectable({ providedIn: 'root' })
export class HistoricoRolagensJanelaService implements OnDestroy {
  private readonly janelas = new Map<string, Window>();
  private readonly contextosAbertos = signal<ReadonlySet<string>>(new Set());
  private intervalo: number | null = null;

  constructor() {
    window.addEventListener('focus', this.verificarFechamento);
    document.addEventListener('visibilitychange', this.verificarFechamento);
  }

  estaAbertaFicha(fichaId: number): boolean {
    return this.contextosAbertos().has(`ficha:${fichaId}`);
  }

  estaAbertaCampanha(campanhaId: number): boolean {
    return this.contextosAbertos().has(`campanha:${campanhaId}`);
  }

  abrirFicha(fichaId: number, tipo: 'jogador' | 'criatura' = 'jogador'): boolean {
    const sufixo = tipo === 'criatura' ? '?tipo=criatura' : '';
    return this.abrir(`ficha:${fichaId}`, `/janela/ficha/${fichaId}/historico-rolagens${sufixo}`);
  }

  /**
   * A origem só decide o "Voltar" da janela: o espectador não pode abrir `/campanhas/:id`. A janela
   * continua sendo uma por campanha, qualquer que seja a visão que a abriu.
   */
  abrirCampanha(campanhaId: number, origem: OrigemJanelaCampanha = 'campanha'): boolean {
    const sufixo = origem === 'espectador' ? '?origem=espectador' : '';
    return this.abrir(
      `campanha:${campanhaId}`,
      `/janela/campanha/${campanhaId}/historico-rolagens${sufixo}`,
    );
  }

  ngOnDestroy(): void {
    window.removeEventListener('focus', this.verificarFechamento);
    document.removeEventListener('visibilitychange', this.verificarFechamento);
    this.pararVerificacao();
  }

  private abrir(contexto: string, url: string): boolean {
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
      janela = window.open('about:blank', '_blank', 'width=420,height=720');
      if (!janela) return false;
      janela.opener = null;
      janela.location.replace(url);
    } catch {
      try {
        janela?.close();
      } catch {
        // Se a navegação falhar, o histórico local continua visível.
      }
      return false;
    }

    this.janelas.set(contexto, janela);
    this.contextosAbertos.update((atuais) => new Set([...atuais, contexto]));
    this.intervalo ??= window.setInterval(this.verificarFechamento, 500);
    return true;
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
