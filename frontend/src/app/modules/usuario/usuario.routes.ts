import { Routes } from '@angular/router';

/**
 * Rotas privadas do módulo `usuario` (m2-14), montadas sob `/perfil` pelo `app.routes.ts` atrás
 * do `autenticacaoGuard` (m2-06). A tela é standalone e carregada de forma lazy (`loadComponent`).
 * Consome os endpoints self-service protegidos das m2-11/m2-03 via `UsuarioService`.
 */
export const usuarioRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./paginas/perfil/perfil.page').then((modulo) => modulo.Perfil),
  },
];
