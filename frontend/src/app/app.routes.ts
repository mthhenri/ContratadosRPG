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
  // Área privada de campanhas (guardada) — destino padrão pós-login. Montada sob `/painel`
  // (listar/criar/entrar/detalhe), consumindo o backend fechado nas m2-04/m2-05 — m2-07.
  {
    path: 'painel',
    canActivate: [autenticacaoGuard],
    loadChildren: () =>
      import('./modules/campanha/campanha.routes').then((modulo) => modulo.campanhaRoutes),
  },
];
