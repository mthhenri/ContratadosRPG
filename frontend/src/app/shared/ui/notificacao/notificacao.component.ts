import { Component, inject } from '@angular/core';

import { NotificacaoService } from './notificacao.service';

/**
 * Renderiza a fila de `NotificacaoService` (ui-02 · `P-034`) —
 * posição fixa `bottom-center`, mesmo padrão de apresentar-sem-decidir de `BandejaDados`. Um único
 * `<app-notificacoes>` vive no `layout` (fora de `rotaIsolada()`, como o toast antes).
 */
@Component({
  selector: 'app-notificacoes',
  templateUrl: './notificacao.component.html',
  styleUrl: './notificacao.component.scss',
})
export class Notificacoes {
  protected readonly servico = inject(NotificacaoService);
}
