import { Injectable, signal } from '@angular/core';

/**
 * As quatro severidades de notificação do projeto. Tipo local, não enum de `shared/enums` — mesmo padrão de
 * `BotaoVariante`/`BotaoEstilo` (ui-01b): é vocabulário de UI, não conceito de domínio do jogo.
 */
export type NotificacaoSeveridade = 'sucesso' | 'informacao' | 'aviso' | 'erro';

/** Quanto tempo (ms) cada severidade fica antes de sumir — erro pede mais tempo de leitura. */
const DURACAO_MS: Record<NotificacaoSeveridade, number> = {
  sucesso: 4000,
  informacao: 5000,
  aviso: 6000,
  erro: 8000,
};

/** Duração da transição de saída (fade) — casa com o SCSS de `Notificacoes`. */
const DURACAO_SAIDA_MS = 200;

/** Quantas notificações a pilha mantém ao mesmo tempo (mais antigas somem primeiro). */
const LIMITE_FILA = 5;

/**
 * Ação opcional da notificação (ui-20) — hoje só `erro` costuma precisar de resposta além
 * de fechar.
 */
export interface NotificacaoAcao {
  readonly rotulo: string;
  readonly executar: () => void;
}

export interface NotificacaoEntrada {
  readonly id: number;
  readonly severidade: NotificacaoSeveridade;
  readonly resumo: string;
  readonly detalhe?: string;
  readonly acao?: NotificacaoAcao;
  /**
   * Duração (ms) do auto-sumir desta entrada — mesmo valor de {@link DURACAO_MS} usado para
   * agendar o timer, exposto por entrada (não por severidade) para a barra de tempo do
   * componente (ui-20) ler de uma fonte só, igual `BandejaDadosService.duracaoMs` faz para a
   * bandeja.
   */
  readonly duracaoMs: number;
  /** `true` durante a transição de saída — só sai do array ao fim dela. */
  readonly saindo: boolean;
}

/**
 * Fila de notificações (ui-02 · `P-034`), no lugar do serviço de toast anterior — mesmo padrão
 * de fila em Signals de `BandejaDadosService` (timer de auto-sumir por entrada, transição de saída
 * antes de remover de fato, sem RxJS). `Notificacoes` (`app-notificacoes`) só apresenta.
 */
@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private contador = 0;
  private readonly _fila = signal<readonly NotificacaoEntrada[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly fila = this._fila.asReadonly();

  /** Enfileira uma notificação e agenda seu auto-sumir pela duração da severidade. */
  notificar(entrada: {
    readonly severidade: NotificacaoSeveridade;
    readonly resumo: string;
    readonly detalhe?: string;
    readonly acao?: NotificacaoAcao;
  }): number {
    this.contador += 1;
    const id = this.contador;
    const nova: NotificacaoEntrada = {
      id,
      saindo: false,
      duracaoMs: DURACAO_MS[entrada.severidade],
      ...entrada,
    };
    this._fila.update((atuais) => [...atuais, nova].slice(-LIMITE_FILA));
    this.agendar(id, entrada.severidade);
    return id;
  }

  /** Pausa o auto-sumir (mouse sobre o toast) — a barra de tempo congela cheia via `:hover`. */
  pausar(id: number): void {
    this.cancelarTimer(id);
  }

  /**
   * Ao sair o mouse, reinicia o auto-sumir **do tempo cheio** (se o toast ainda existe e não está
   * saindo) — mesmo par `pausar`/`retomar` de `BandejaDadosService`.
   */
  retomar(id: number): void {
    const entrada = this._fila().find((atual) => atual.id === id);
    if (entrada && !entrada.saindo) {
      this.agendar(id, entrada.severidade);
    }
  }

  /** Inicia a saída suave (o "×" da notificação ou o fim do auto-sumir); idempotente. */
  fechar(id: number): void {
    this.cancelarTimer(id);
    const jaSaindo = this._fila().some((entrada) => entrada.id === id && entrada.saindo);
    if (jaSaindo) {
      return;
    }
    this._fila.update((atuais) =>
      atuais.map((entrada) => (entrada.id === id ? { ...entrada, saindo: true } : entrada)),
    );
    setTimeout(() => this.remover(id), DURACAO_SAIDA_MS);
  }

  private agendar(id: number, severidade: NotificacaoSeveridade): void {
    this.cancelarTimer(id);
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        this.fechar(id);
      }, DURACAO_MS[severidade]),
    );
  }

  private cancelarTimer(id: number): void {
    const handle = this.timers.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.timers.delete(id);
    }
  }

  private remover(id: number): void {
    this._fila.update((atuais) => atuais.filter((entrada) => entrada.id !== id));
  }
}
