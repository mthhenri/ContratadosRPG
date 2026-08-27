import { Routes } from '@angular/router';

/**
 * Rotas do módulo público da simulacao. Deep-link por aba, em paridade com o roteamento por
 * hash do site antigo (`switchTab`/`VALID_TABS`): cada aba é uma URL própria em
 * `/simulacao/<aba>`. O shell (`SimulacaoShell`) renderiza a navegação de abas + o
 * `router-outlet`; cada página é standalone e carregada de forma lazy (`loadComponent`). Tudo
 * client-side e público (sem guard) — funciona sem backend. As seis abas estão completas desde o
 * fecho do M1 (`m1-01`…`m1-20`); ver docs/context/CONTEXT.md.
 */
export const simulacaoRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./simulacao-shell.component').then((modulo) => modulo.SimulacaoShell),
    children: [
      { path: '', redirectTo: 'agente', pathMatch: 'full' },
      {
        path: 'agente',
        loadComponent: () => import('./paginas/agente/agente.page').then((modulo) => modulo.AgentePage),
      },
      {
        path: 'dt',
        loadComponent: () => import('./paginas/dt/dt.page').then((modulo) => modulo.DtPage),
      },
      {
        path: 'novo-agente',
        loadComponent: () =>
          import('./paginas/novo-agente/novo-agente.page').then((modulo) => modulo.NovoAgentePage),
      },
      {
        path: 'patente',
        loadComponent: () =>
          import('./paginas/patente/patente.page').then((modulo) => modulo.PatentePage),
      },
      {
        path: 'descanso',
        loadComponent: () =>
          import('./paginas/descanso/descanso.page').then((modulo) => modulo.DescansoPage),
      },
      {
        // Compras e Vendas são a mesma página (`ComprasPage`) em dois modos, cada um sua URL/aba
        // (m1-20). O `modo` chega por `data` → `input()` via `withComponentInputBinding`.
        path: 'compras',
        data: { modo: 'comprar' },
        loadComponent: () =>
          import('./paginas/compras/compras.page').then((modulo) => modulo.ComprasPage),
      },
      {
        path: 'vendas',
        data: { modo: 'vender' },
        loadComponent: () =>
          import('./paginas/compras/compras.page').then((modulo) => modulo.ComprasPage),
      },
    ],
  },
];
