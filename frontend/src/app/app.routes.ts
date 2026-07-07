import { Routes } from '@angular/router';

import { autenticacaoGuard } from './core/guards/autenticacao.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then((modulo) => modulo.Home),
  },
  {
    path: 'calculadora',
    loadChildren: () =>
      import('./modules/calculadora/calculadora.routes').then((modulo) => modulo.calculadoraRoutes),
  },
  // Rotas públicas de autenticação (login/registro) — m2-06.
  {
    path: '',
    loadChildren: () =>
      import('./modules/autenticacao/autenticacao.routes').then(
        (modulo) => modulo.autenticacaoRoutes,
      ),
  },
  // Primeira rota privada (guardada) — destino padrão pós-login; a m2-07 preenche o painel.
  {
    path: 'painel',
    canActivate: [autenticacaoGuard],
    loadComponent: () => import('./pages/painel/painel.page').then((modulo) => modulo.Painel),
  },
];
