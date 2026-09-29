import { Routes } from '@angular/router';

import { rascunhoDocumentoPainelGuard } from '../documento/rascunho-documento.guard';

/**
 * Rotas do módulo `cena` (m7-23), montadas sob `/campanhas/:campanhaId/cenas` pelo `app.routes.ts`.
 *
 * **Sem guarda de papel** (mesmo racional da antiga `encontro.routes.ts`, m7-06): mestre e jogador
 * entram pelas mesmas rotas e as telas bifurcam por papel; quem barra é o backend, que recorta cada
 * payload por usuário — inclusive a cena `PLANEJADA`, que ele recusa ao jogador (m7-22).
 *
 * - `''` — o hub: cena ativa, planejadas (só mestre) e histórico.
 * - `':cenaId'` — o painel de uma cena. `PainelCenaShell` decide pelo tipo (com iniciativa → o
 *   painel de Iniciativa; sem → o painel da m7-24) e pelo papel.
 */
export const cenaRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./paginas/hub/hub-cenas.page').then((modulo) => modulo.HubCenas),
  },
  {
    path: ':cenaId',
    // Rascunho na Biblioteca flutuante do mestre (m9-13).
    canDeactivate: [rascunhoDocumentoPainelGuard],
    loadComponent: () =>
      import('./paginas/painel/painel-cena-shell.page').then((modulo) => modulo.PainelCenaShell),
  },
];
