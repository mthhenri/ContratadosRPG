import { Component, computed, inject } from '@angular/core';

import { Icone } from '../../icone/icone.component';
import { Botao } from '../botao/botao.component';
import { Modal } from '../modal/modal.component';
import { ConfirmacaoService } from './confirmacao.service';

/** Trecho de `mensagem` em torno de `entidade`, para destacar o nome em negrito sem `innerHTML`. */
interface MensagemPartida {
  readonly antes: string;
  readonly entidade: string;
  readonly depois: string;
}

/**
 * Apresenta o pedido pendente de `ConfirmacaoService` (ui-15) — um único `<app-confirmacao>` vive
 * no `layout`, mesmo padrão de `Notificacoes`. Usa o slot `[modalAcoes]` do `app-modal` para o
 * rodapé de botões, no lugar do `<div class="…__acoes">` que cada consumidor montava à mão.
 */
@Component({
  selector: 'app-confirmacao',
  imports: [Modal, Botao, Icone],
  templateUrl: './confirmacao.component.html',
  styleUrl: './confirmacao.component.scss',
})
export class Confirmacao {
  protected readonly servico = inject(ConfirmacaoService);

  protected readonly perigo = computed(() => (this.servico.pedido()?.severidade ?? 'perigo') === 'perigo');

  protected readonly mensagemPartida = computed<MensagemPartida | null>(() => {
    const pedido = this.servico.pedido();
    if (!pedido?.entidade) {
      return null;
    }
    const indice = pedido.mensagem.indexOf(pedido.entidade);
    if (indice < 0) {
      return null;
    }
    return {
      antes: pedido.mensagem.slice(0, indice),
      entidade: pedido.entidade,
      depois: pedido.mensagem.slice(indice + pedido.entidade.length),
    };
  });

  protected confirmar(): void {
    this.servico.responder(true);
  }

  protected cancelar(): void {
    this.servico.responder(false);
  }
}
