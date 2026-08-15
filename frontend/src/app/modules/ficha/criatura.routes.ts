import { Routes } from '@angular/router';

/**
 * Rota do assistente de criação de criatura (Ameaça), montada sob `/painel/:campanhaId/criatura`
 * pelo `app.routes.ts` — só o mestre da campanha (guardada por `mestreCampanhaGuard` na
 * rota-pai, m4-04). Espelha a convenção de `ficha.routes.ts` (`nova`), mas em módulo próprio:
 * criatura não reusa `FichaCriar` (o guia de jogador) — a trilha, os passos e os cálculos vêm de
 * `shared/regras/criatura` (`m4-02`), um roteiro totalmente diferente do de agente.
 * `:id` (m4-04b) é a tela de visualização/edição da criatura já criada.
 */
export const criaturaRoutes: Routes = [
  {
    path: 'nova',
    loadComponent: () =>
      import('./paginas/criar-criatura/criar-criatura.page').then((modulo) => modulo.CriaturaCriar),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./paginas/visualizar-criatura/visualizar-criatura.page').then(
        (modulo) => modulo.CriaturaVisualizar,
      ),
  },
];
