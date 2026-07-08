import { Routes } from '@angular/router';

/**
 * Rotas do módulo público da calculadora. Deep-link por aba, em paridade com o roteamento por
 * hash do site antigo (`switchTab`/`VALID_TABS`): cada aba é uma URL própria em
 * `/calculadora/<aba>`. O shell (`CalculadoraShell`) renderiza a navegação de abas + o
 * `router-outlet`; cada página é standalone e carregada de forma lazy (`loadComponent`). Tudo
 * client-side e público (sem guard) — funciona sem backend. As páginas são stubs nesta task
 * (m1-06); o cálculo de cada aba entra em tasks posteriores do M1 (ver docs/CONTEXT.md).
 */
export const calculadoraRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./calculadora-shell.component').then((modulo) => modulo.CalculadoraShell),
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
