import { Routes } from '@angular/router';

import { autenticacaoGuard } from './core/guards/autenticacao.guard';
import { adminGuard } from './core/guards/admin.guard';
import { mestreCampanhaGuard } from './core/guards/mestre-campanha.guard';

export const routes: Routes = [
  {
    path: 'acesso-negado',
    loadComponent: () =>
      import('./modules/acesso-negado/acesso-negado.page').then(
        (pagina) => pagina.AcessoNegadoPage,
      ),
  },
  // Rota raiz leva direto a campanhas (destino padrão pós-login); sem sessão, o
  // `autenticacaoGuard` de `/campanhas` redireciona ao `/login` guardando o retorno.
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/campanhas',
  },
  {
    path: 'simulacao',
    loadChildren: () =>
      import('./modules/simulacao/simulacao.routes').then((modulo) => modulo.simulacaoRoutes),
  },
  // Rotas públicas de autenticação (login/registro) — m2-06.
  {
    path: '',
    loadChildren: () =>
      import('./modules/autenticacao/autenticacao.routes').then(
        (modulo) => modulo.autenticacaoRoutes,
      ),
  },
  // Criação/edição de ficha de jogador (guardada) — m3-06. Montada sob
  // `/campanhas/:campanhaId/ficha` (nova / :id/editar). Precede a rota `campanhas` genérica para
  // ser casada antes do prefixo mais curto (o router não voltaria à irmã após consumir só
  // `campanhas`).
  {
    path: 'campanhas/:campanhaId/ficha',
    canActivate: [autenticacaoGuard],
    loadChildren: () => import('./modules/ficha/ficha.routes').then((modulo) => modulo.fichaRoutes),
  },
  // Criação de ficha de criatura (Ameaça) — só o mestre da campanha (m4-04). Mesma convenção de
  // `/campanhas/:campanhaId/ficha`, em módulo próprio (`criaturaRoutes`) — ver comentário lá.
  {
    path: 'campanhas/:campanhaId/criatura',
    canActivate: [autenticacaoGuard, mestreCampanhaGuard],
    loadChildren: () =>
      import('./modules/ficha/criatura.routes').then((modulo) => modulo.criaturaRoutes),
  },
  // A tela "Iniciativa" (m7-05 mestre, m7-06 jogador). Mesma convenção das rotas de
  // ficha/criatura: precede a rota `painel` genérica para ser casada antes do prefixo mais curto.
  // Só `autenticacaoGuard`: mestre e jogador entram pela mesma rota e a tela bifurca por papel —
  // o recorte de verdade é do backend (ver `encontro.routes.ts`).
  {
    path: 'campanhas/:campanhaId/iniciativa',
    canActivate: [autenticacaoGuard],
    loadChildren: () =>
      import('./modules/encontro/encontro.routes').then((modulo) => modulo.encontroRoutes),
  },
  // Área privada de campanhas (guardada) — destino padrão pós-login. Montada sob `/campanhas`
  // (listar/criar/entrar/detalhe), consumindo o backend fechado nas m2-04/m2-05 — m2-07.
  {
    path: 'campanhas',
    canActivate: [autenticacaoGuard],
    loadChildren: () =>
      import('./modules/campanha/campanha.routes').then((modulo) => modulo.campanhaRoutes),
  },
  // Acervo de fichas do usuário (guardada) — m3-28: a ficha deixa de ser filha obrigatória da
  // campanha. Montada sob `/fichas` (acervo / :id), ao lado de `/campanhas`.
  {
    path: 'fichas',
    canActivate: [autenticacaoGuard],
    loadChildren: () =>
      import('./modules/ficha/ficha-acervo.routes').then((modulo) => modulo.fichaAcervoRoutes),
  },
  // Perfil self-service do usuário autenticado (editar nome/login, trocar senha, excluir a
  // conta), acessível pelo dropdown de perfil da topbar — m2-14.
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('./modules/usuario/usuario-admin.routes').then((modulo) => modulo.usuarioAdminRoutes),
  },
  {
    path: 'perfil',
    canActivate: [autenticacaoGuard],
    loadChildren: () =>
      import('./modules/usuario/usuario.routes').then((modulo) => modulo.usuarioRoutes),
  },
];
