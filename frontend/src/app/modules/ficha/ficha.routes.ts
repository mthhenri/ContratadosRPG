import { Routes } from '@angular/router';

/**
 * Rotas privadas do módulo `ficha` (m3-06), montadas sob `/painel/:campanhaId/ficha` pelo
 * `app.routes.ts` atrás do `autenticacaoGuard` (m2-06). Cada tela é standalone e carregada de
 * forma lazy (`loadComponent`). O `campanhaId` mora na rota-pai (lido por `lerParamRota`).
 * Consomem o CRUD de ficha (m3-03) via `FichaService`. A listagem de fichas da campanha e a
 * visualização por terceiros são m3-07.
 */
export const fichaRoutes: Routes = [
  {
    path: 'nova',
    loadComponent: () => import('./paginas/criar/criar.page').then((modulo) => modulo.FichaCriar),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./paginas/editar/editar.page').then((modulo) => modulo.FichaEditar),
  },
];
