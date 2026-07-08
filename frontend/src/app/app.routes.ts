import { Routes } from '@angular/router';

import { autenticacaoGuard } from './core/guards/autenticacao.guard';

export const routes: Routes = [
  // Rota raiz leva direto ao painel (destino padrão pós-login); sem sessão, o
  // `autenticacaoGuard` de `/painel` redireciona ao `/login` guardando o retorno.
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/painel',
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
  // Perfil self-service do usuário autenticado (editar nome/login, trocar senha, excluir a
  // conta), acessível pelo dropdown de perfil da topbar — m2-14.
  {
    path: 'perfil',
    canActivate: [autenticacaoGuard],
    loadChildren: () =>
      import('./modules/usuario/usuario.routes').then((modulo) => modulo.usuarioRoutes),
  },
];
