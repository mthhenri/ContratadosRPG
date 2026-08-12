import { Routes } from '@angular/router';

export const usuarioAdminRoutes: Routes = [
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./paginas/gestao/gestao.page').then((modulo) => modulo.UsuarioGestao),
  },
];
