import { Injectable, signal } from '@angular/core';

/**
 * Rótulo exibido no slot de contexto da topbar (ui-21) — entre a marca e a nav — dizendo em qual
 * campanha ou ficha o usuário está agora. A topbar sozinha nunca sabe disso (ela é montada uma
 * vez, fora do `router-outlet`); cada página dona de uma entidade (`CampanhaDetalhe`,
 * `FichaVisualizar`, `FichaVisualizarCriatura`, `PainelEncontro`) define o próprio rótulo ao
 * carregar e limpa ao sair (`DestroyRef.onDestroy`), como já fazem com `TempoRealService.sairSala*`.
 * Fora dessas páginas o slot fica `null` — some por completo, sem buraco nem separador solto.
 */
@Injectable({ providedIn: 'root' })
export class TopbarContextoService {
  private readonly rotulo = signal<string | null>(null);

  /** Rótulo atual do slot de contexto — `null` quando nenhuma página o define. */
  readonly contexto = this.rotulo.asReadonly();

  /** Define o rótulo exibido no slot de contexto da topbar. */
  definir(rotulo: string | null): void {
    this.rotulo.set(rotulo);
  }

  /** Limpa o rótulo — chamado ao sair da página que o definiu. */
  limpar(): void {
    this.rotulo.set(null);
  }
}
