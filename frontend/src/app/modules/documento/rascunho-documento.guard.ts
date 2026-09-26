import type { CanDeactivateFn } from '@angular/router';

/** Uma tela da biblioteca que pode ter uma edição de documento não salva. */
export interface TelaComRascunhoDocumento {
  /** `true` libera a saída; com rascunho, pergunta antes ("Descartar alterações?"). */
  podeSair(): boolean | Promise<boolean>;
}

/**
 * Sair da biblioteca com uma edição não salva pede confirmação (m9-04) — o mesmo "Descartar
 * alterações?" de trocar de documento e de fechar o editor. Fechar a aba é coberto pelo
 * `beforeunload` da própria página.
 */
export const rascunhoDocumentoGuard: CanDeactivateFn<TelaComRascunhoDocumento> = (tela) =>
  tela.podeSair();
