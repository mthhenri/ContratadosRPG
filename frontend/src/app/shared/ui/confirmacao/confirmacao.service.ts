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
  /**
   * Ação assíncrona disparada ao confirmar (ex.: a chamada HTTP que exclui o registro). Quando
   * presente, o diálogo **não fecha no clique** — fica aberto com o botão de confirmar em
   * `carregando` (`ConfirmacaoService.carregando`) até a promessa resolver, e só então fecha e
   * resolve `confirmar()` com `true`. Se a promessa rejeitar, o diálogo volta ao estado normal e
   * continua aberto pra o usuário tentar de novo — o erro em si é responsabilidade de quem chama
   * (ex.: toast do interceptor HTTP global; este serviço não duplica esse aviso). Sem
   * `aoConfirmar`, o comportamento é o de sempre: fecha e resolve na hora.
   */
  readonly aoConfirmar?: () => Promise<void>;
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
  private readonly _carregando = signal(false);
  private resolver: ((valor: boolean) => void) | null = null;

  readonly pedido = this._pedido.asReadonly();
  /** `true` enquanto o `aoConfirmar` do pedido atual está em voo — ver `ConfirmacaoPedido.aoConfirmar`. */
  readonly carregando = this._carregando.asReadonly();

  /** Abre o diálogo e resolve quando o usuário confirma, cancela, aperta Escape ou clica fora. */
  confirmar(pedido: ConfirmacaoPedido): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this._pedido.set(pedido);
    });
  }

  /** Chamado pelo `Confirmacao` — em confirmação sem `aoConfirmar`, resolve e fecha na hora. Com
   *  `aoConfirmar`, espera a promessa antes de resolver/fechar (ver `ConfirmacaoPedido.aoConfirmar`). */
  async responder(valor: boolean): Promise<void> {
    const aoConfirmar = this._pedido()?.aoConfirmar;
    if (valor && aoConfirmar) {
      this._carregando.set(true);
      try {
        await aoConfirmar();
      } catch {
        this._carregando.set(false);
        return;
      }
      this._carregando.set(false);
    }
    const resolver = this.resolver;
    this.resolver = null;
    this._pedido.set(null);
    resolver?.(valor);
  }
}
