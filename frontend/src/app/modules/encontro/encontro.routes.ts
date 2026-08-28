import { Routes } from '@angular/router';

/**
 * Rotas do módulo `encontro`, montadas sob `/campanhas/:campanhaId/iniciativa` pelo `app.routes.ts`.
 *
 * **Sem guarda de papel (m7-06).** A rota é a mesma para mestre e jogador — é uma tela só, com duas
 * leituras (`PainelEncontro.ehMestre`), como o mockup previu no `visaoJogador`. Quem barra é o
 * backend, que recorta o payload por usuário; um guard aqui só duplicaria a regra §14 e ainda
 * obrigaria a manter duas rotas para a mesma tela.
 *
 * A rota sem `:encontroId` é a da **mesa**: a campanha tem no máximo um encontro não-encerrado por
 * vez (invariante da `EncontroService`), então a tela resolve qual é ao carregar, e a URL fica
 * estável durante toda a sessão de jogo. O `:encontroId` existe para o **histórico** — um combate
 * encerrado é um documento, e um documento tem endereço próprio.
 */
export const encontroRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./paginas/painel/painel-encontro.page').then((modulo) => modulo.PainelEncontro),
  },
  {
    path: ':encontroId',
    loadComponent: () =>
      import('./paginas/painel/painel-encontro.page').then((modulo) => modulo.PainelEncontro),
  },
];
