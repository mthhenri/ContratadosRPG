import { Routes } from '@angular/router';

/**
 * Rotas privadas do módulo `campanha` (m2-07), montadas sob `/painel` pelo `app.routes.ts`
 * atrás do `autenticacaoGuard` (m2-06). Cada tela é standalone e carregada de forma lazy
 * (`loadComponent`). `criar`/`entrar` vêm antes de `:id` para não serem capturadas pelo
 * parâmetro. Consomem os endpoints protegidos das m2-04/m2-05 via `CampanhaService`.
 */
export const campanhaRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./paginas/lista/lista.page').then((modulo) => modulo.CampanhaLista),
  },
  {
    path: 'criar',
    loadComponent: () =>
      import('./paginas/criar/criar.page').then((modulo) => modulo.CampanhaCriar),
  },
  {
    path: 'entrar',
    loadComponent: () =>
      import('./paginas/entrar/entrar.page').then((modulo) => modulo.CampanhaEntrar),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./paginas/detalhe/detalhe.page').then((modulo) => modulo.CampanhaDetalhe),
  },
];
