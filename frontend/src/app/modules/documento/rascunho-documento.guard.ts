import { Injectable, inject } from '@angular/core';
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

/**
 * As edições abertas fora da página da Biblioteca (m9-13): o painel flutuante se registra aqui ao
 * nascer, porque a tela que o hospeda (cena, ficha, campanha) não sabe nada da edição dele.
 */
@Injectable({ providedIn: 'root' })
export class RascunhoDocumentoRegistro {
  private readonly telas = new Set<TelaComRascunhoDocumento>();

  /** Devolve a função que desfaz o registro — chamada quando o painel é destruído. */
  registrar(tela: TelaComRascunhoDocumento): () => void {
    this.telas.add(tela);
    return () => this.telas.delete(tela);
  }

  /** Pergunta a cada edição registrada, uma por vez; a primeira recusa segura a saída. */
  async podeSair(): Promise<boolean> {
    for (const tela of this.telas) {
      if (!(await tela.podeSair())) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Sair da tela que hospeda a Biblioteca flutuante com uma edição não salva no painel pede a mesma
 * confirmação (m9-13). Vai nas rotas das telas que montam o painel na forma mestre.
 */
export const rascunhoDocumentoPainelGuard: CanDeactivateFn<unknown> = () =>
  inject(RascunhoDocumentoRegistro).podeSair();
