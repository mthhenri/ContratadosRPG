import { Routes } from '@angular/router';

/**
 * Rotas públicas de autenticação (m2-06): login e registro, cada uma standalone e carregada de
 * forma lazy (`loadComponent`). Sem guard — quem não tem sessão precisa alcançá-las. Montadas em
 * `/login` e `/registro` pelo `app.routes.ts`. Consomem os endpoints `@Public()` da m2-02.
 */
export const autenticacaoRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./paginas/login/login.page').then((modulo) => modulo.Login),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./paginas/registro/registro.page').then((modulo) => modulo.Registro),
  },
];
