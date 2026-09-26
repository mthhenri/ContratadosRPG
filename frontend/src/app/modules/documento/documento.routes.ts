import { Routes } from '@angular/router';

import { rascunhoDocumentoGuard } from './rascunho-documento.guard';

/**
 * Rotas do módulo `documento` (m9-04), montadas sob `/campanhas/:campanhaId/documentos` pelo
 * `app.routes.ts`.
 *
 * **Sem guarda de papel** (mesmo racional de `cena.routes.ts`): a casca `BibliotecaDocumentos`
 * bifurca por papel e quem barra é o backend, que nunca entrega um documento oculto a quem não é
 * mestre. `rascunhoDocumentoGuard` pede confirmação antes de sair com uma edição não salva.
 */
export const documentoRoutes: Routes = [
  {
    path: '',
    canDeactivate: [rascunhoDocumentoGuard],
    loadComponent: () =>
      import('./paginas/biblioteca/biblioteca-documentos.page').then(
        (modulo) => modulo.BibliotecaDocumentos,
      ),
  },
];
