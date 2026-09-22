import { Component, inject } from '@angular/core';

import { PainelEncontroJogador } from '../painel-jogador/painel-jogador.page';
import { PainelEncontroMestre } from '../painel-mestre/painel-mestre.page';
import { EncontroPainelDadosService } from './encontro-painel-dados.service';

/**
 * Casca de `/campanhas/:campanhaId/iniciativa` (`ui-39`) — resolve o papel do usuário
 * (`EncontroPainelDadosService.visaoDoMestre`) e monta `PainelEncontroMestre` ou
 * `PainelEncontroJogador`, no molde de `CampanhaDetalheShell`. Único ponto de carga e de assinatura
 * de socket compartilhado entre os dois papéis — a instância do serviço vive e morre com esta
 * rota, e a troca de `:encontroId` (histórico) reaproveita o componente.
 *
 * Enquanto o papel é desconhecido (os membros ainda não chegaram) monta a página do mestre, que já
 * traz o esqueleto da própria tela: quem carrega não "pula" de uma visão para outra. Com o papel
 * resolvido como não-mestre, monta a do jogador.
 */
@Component({
  selector: 'app-painel-encontro-shell',
  imports: [PainelEncontroMestre, PainelEncontroJogador],
  providers: [EncontroPainelDadosService],
  templateUrl: './painel-shell.page.html',
})
export class PainelEncontroShell {
  protected readonly dados = inject(EncontroPainelDadosService);
}
