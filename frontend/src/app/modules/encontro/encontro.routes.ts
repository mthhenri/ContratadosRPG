import { Routes } from '@angular/router';

/**
 * Rotas do módulo `encontro` (m7-05), montadas sob `/painel/:campanhaId/iniciativa` pelo
 * `app.routes.ts` atrás do `mestreCampanhaGuard` — o painel de condução é do **mestre**. A visão do
 * jogador (m7-06) entra ao lado, com guarda própria.
 *
 * A rota não carrega o `:id` do encontro: a campanha tem no máximo **um** encontro não-encerrado
 * por vez (invariante da `EncontroService`), então a tela resolve qual é ao carregar. Isso mantém a
 * URL estável durante toda a sessão de jogo — o mestre volta a ela sem guardar um id.
 */
export const encontroRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./paginas/painel/painel-encontro.page').then((modulo) => modulo.PainelEncontro),
  },
];
