import { Routes } from '@angular/router';

/**
 * Rotas privadas do **acervo** de fichas (m3-28), montadas sob `/fichas` pelo `app.routes.ts`
 * atrás do `autenticacaoGuard`. Cada tela é standalone e carregada de forma lazy
 * (`loadComponent`). A visualização (`:id`) reusa o **mesmo** `FichaVisualizar` das rotas
 * campanha-scoped (`/painel/:campanhaId/ficha/:id`) — o componente lê `campanhaId` opcionalmente
 * da rota-pai (ausente aqui) e cai no `campanhaId` do próprio payload da ficha (dívida assumida
 * de duplicação de rotas até a `m3-26`, spec `m3-28` — "fora de escopo unificar as duas rotas").
 *
 * `nova` reusa o **mesmo** `FichaCriar` (guia de criação, `m3-57`/`m3-58`/`m3-59`) das rotas
 * campanha-scoped: sem `:campanhaId` na rota-pai, o guia lê `campanhaId` como `null` e pula os
 * passos que dependem de esquadrão (dono, médias de Novo Agente — sempre "primeiro agente").
 * Precisa vir **antes** de `:id`, senão `nova` casa como id.
 */
export const fichaAcervoRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./paginas/acervo/acervo.page').then((modulo) => modulo.FichaAcervo),
  },
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
