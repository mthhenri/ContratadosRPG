import { Routes } from '@angular/router';

/**
 * Rotas privadas do módulo `ficha` (m3-07/m3-10), montadas sob `/painel/:campanhaId/ficha` pelo
 * `app.routes.ts` atrás do `autenticacaoGuard` (m2-06). Cada tela é standalone e carregada de
 * forma lazy (`loadComponent`). O `campanhaId` mora na rota-pai (lido por `lerParamRota`).
 *
 * `''` é a lista de fichas da campanha (o botão "Nova ficha" cria uma ficha **padrão** e navega
 * direto para ela — default-then-edit, m3-10, sem rota/tela de criação separada); `:id` é a
 * **ficha**, editável **campo a campo no próprio lugar** (sem botão global de editar).
 */
export const fichaRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./paginas/lista/lista.page').then((modulo) => modulo.FichaLista),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./paginas/visualizar/visualizar.page').then((modulo) => modulo.FichaVisualizar),
  },
];
