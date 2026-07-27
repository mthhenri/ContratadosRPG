import { Routes } from '@angular/router';

/**
 * Rotas privadas do **acervo** de fichas (m3-28), montadas sob `/fichas` pelo `app.routes.ts`
 * atrás do `autenticacaoGuard`. Cada tela é standalone e carregada de forma lazy
 * (`loadComponent`). A visualização (`:id`) reusa o **mesmo** `FichaVisualizar` das rotas
 * campanha-scoped (`/painel/:campanhaId/ficha/:id`) — o componente lê `campanhaId` opcionalmente
 * da rota-pai (ausente aqui) e cai no `campanhaId` do próprio payload da ficha (dívida assumida
 * de duplicação de rotas até a `m3-26`, spec `m3-28` — "fora de escopo unificar as duas rotas").
 */
export const fichaAcervoRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./paginas/acervo/acervo.page').then((modulo) => modulo.FichaAcervo),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./paginas/visualizar/visualizar.page').then((modulo) => modulo.FichaVisualizar),
  },
];
