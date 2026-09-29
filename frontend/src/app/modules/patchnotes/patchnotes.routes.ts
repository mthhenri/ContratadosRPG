import { Routes, UrlSegment, UrlMatchResult } from '@angular/router';

/**
 * Casa `/patchnotes` (sem segmento) e `/patchnotes/:versao` na **mesma** entrada de rota. Com duas
 * entradas (`''` e `':versao'`), o redirecionamento da raiz para a versão mais recente recriaria a
 * página e recarregaria o índice; numa entrada só, a instância é reaproveitada e apenas o `versao`
 * muda.
 */
export function casarPatchnotes(segmentos: UrlSegment[]): UrlMatchResult | null {
  if (segmentos.length === 0) {
    return { consumed: [] };
  }
  if (segmentos.length === 1) {
    return { consumed: segmentos, posParams: { versao: segmentos[0] } };
  }
  return null;
}

/**
 * Rotas públicas dos patchnotes (pn-04), sem guard: `/patchnotes` leva à versão mais recente e
 * `/patchnotes/:versao` abre uma versão. O `:versao` chega na página como `input()`
 * (`withComponentInputBinding`).
 */
export const patchnotesRoutes: Routes = [
  {
    matcher: casarPatchnotes,
    loadComponent: () => import('./patchnotes.page').then((modulo) => modulo.PatchnotesPage),
  },
];
