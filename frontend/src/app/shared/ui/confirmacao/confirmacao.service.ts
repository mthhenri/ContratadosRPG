import { Injectable, signal } from '@angular/core';

/** `perigo` (padrão) pinta o botão de ação em `--erro` e mostra o ícone de alerta no cabeçalho;
 *  `padrao` é para uma confirmação que não é destrutiva. */
export type ConfirmacaoSeveridade = 'padrao' | 'perigo';

export interface ConfirmacaoPedido {
  readonly titulo: string;
  /** Texto de consequência. Quando `entidade` aparece dentro dele, o trecho correspondente é
   *  destacado em negrito — mesmo padrão que as seis cópias ad-hoc que este serviço substitui já
   *  usavam ("Excluir **Nome**? Esta ação não pode ser desfeita."). */
  readonly mensagem: string;
  readonly entidade?: string;
  readonly severidade?: ConfirmacaoSeveridade;
  readonly rotuloConfirmar: string;
  readonly rotuloCancelar?: string;
}

/**
 * Serviço de confirmação destrutiva (ui-15), no lugar dos três padrões concorrentes que o projeto
 * praticava — modal ad-hoc duplicado, área inline `role="alertdialog"` e nenhuma confirmação (ver
 * spec). Só um pedido pendente por vez, mesmo padrão de fila-de-um de `LoadingService`: o
 * consumidor `await`s `confirmar(...)` e recebe `true`/`false`, sem montar HTML de diálogo.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmacaoService {
  private readonly _pedido = signal<ConfirmacaoPedido | null>(null);
  private resolver: ((valor: boolean) => void) | null = null;

  readonly pedido = this._pedido.asReadonly();

  /** Abre o diálogo e resolve quando o usuário confirma, cancela, aperta Escape ou clica fora. */
  confirmar(pedido: ConfirmacaoPedido): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this._pedido.set(pedido);
    });
  }

  /** Chamado pelo `Confirmacao` — resolve a promessa pendente e fecha o diálogo. */
  responder(valor: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this._pedido.set(null);
    resolver?.(valor);
  }
}
