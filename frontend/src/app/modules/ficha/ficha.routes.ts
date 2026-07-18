import { Routes } from '@angular/router';

/**
 * Rotas privadas do módulo `ficha` (m3-07/m3-10), montadas sob `/painel/:campanhaId/ficha` pelo
 * `app.routes.ts` atrás do `autenticacaoGuard` (m2-06). Cada tela é standalone e carregada de
 * forma lazy (`loadComponent`). O `campanhaId` mora na rota-pai (lido por `lerParamRota`).
 *
 * `:id` é a **ficha**, editável **campo a campo no próprio lugar** (sem botão global de editar).
 * A lista plana de fichas da campanha (`''`) foi aposentada na m2-16 — as fichas de cada membro
 * agora vivem inline no detalhe da campanha (`CampanhaDetalhe`), que também assumiu a criação
 * (`FichaCriarDialog`).
 */
export const fichaRoutes: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./paginas/visualizar/visualizar.page').then((modulo) => modulo.FichaVisualizar),
  },
];
