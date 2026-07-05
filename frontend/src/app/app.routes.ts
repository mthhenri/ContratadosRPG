import { Routes } from '@angular/router';

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
];
