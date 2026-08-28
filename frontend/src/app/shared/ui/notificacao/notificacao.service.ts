import { Injectable, signal } from '@angular/core';

/**
 * As quatro severidades em uso no projeto (`success`/`info`/`warn`/`error` do serviço de toast do
 * PrimeNG, `primeng/api`). Tipo local, não enum de `shared/enums` — mesmo padrão de
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

export interface NotificacaoEntrada {
  readonly id: number;
  readonly severidade: NotificacaoSeveridade;
  readonly resumo: string;
  readonly detalhe?: string;
  /** `true` durante a transição de saída — só sai do array ao fim dela. */
  readonly saindo: boolean;
}

/**
 * Fila de notificações (ui-02 · `P-034`), no lugar do serviço de toast do PrimeNG — mesmo padrão
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
  }): number {
    this.contador += 1;
    const id = this.contador;
    const nova: NotificacaoEntrada = { id, saindo: false, ...entrada };
    this._fila.update((atuais) => [...atuais, nova].slice(-LIMITE_FILA));
    this.agendar(id, entrada.severidade);
    return id;
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
