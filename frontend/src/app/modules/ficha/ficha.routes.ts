import { Routes } from '@angular/router';

/**
 * Rotas privadas do módulo `ficha` (m3-07/m3-10), montadas sob `/campanhas/:campanhaId/ficha` pelo
 * `app.routes.ts` atrás do `autenticacaoGuard` (m2-06). Cada tela é standalone e carregada de
 * forma lazy (`loadComponent`). O `campanhaId` mora na rota-pai (lido por `lerParamRota`).
 *
 * `:id` é a **ficha**, editável **campo a campo no próprio lugar** (sem botão global de editar).
 * A lista plana de fichas da campanha (`''`) foi aposentada na m2-16 — as fichas de cada membro
 * agora vivem inline no detalhe da campanha (`CampanhaDetalhe`), que também dispara a criação.
 *
 * `nova` é o guia de criação passo a passo (`FichaCriar`, `m3-57`/`m3-58`/`m3-59`) — substituiu o
 * antigo `FichaCriarDialog`. A mesma tela é montada de novo, campanha-less, em
 * `ficha-acervo.routes.ts` (sob `/fichas/nova`, m3-28).
 */
export const fichaRoutes: Routes = [
  {
    path: 'nova',
    loadComponent: () => import('./paginas/criar/criar.page').then((modulo) => modulo.FichaCriar),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./paginas/visualizar/visualizar.page').then((modulo) => modulo.FichaVisualizar),
  },
];
