import { Routes } from '@angular/router';

import { rascunhoDocumentoPainelGuard } from '../documento/rascunho-documento.guard';

/**
 * Rotas privadas do módulo `campanha` (m2-07), montadas sob `/campanhas` pelo `app.routes.ts`
 * atrás do `autenticacaoGuard` (m2-06). Cada tela é standalone e carregada de forma lazy
 * (`loadComponent`). `CampanhaCriar`/`CampanhaEntrar` deixaram de ser rotas — viraram dialogs
 * abertos direto de `CampanhaLista` (painel). Consomem os endpoints protegidos das m2-04/m2-05
 * via `CampanhaService`.
 */
export const campanhaRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./paginas/lista/lista.page').then((modulo) => modulo.CampanhaLista),
  },
  {
    path: ':id',
    // Rascunho na Biblioteca flutuante do mestre (m9-13).
    canDeactivate: [rascunhoDocumentoPainelGuard],
    loadComponent: () =>
      import('./paginas/detalhe/detalhe-shell.page').then((modulo) => modulo.CampanhaDetalheShell),
  },
];
