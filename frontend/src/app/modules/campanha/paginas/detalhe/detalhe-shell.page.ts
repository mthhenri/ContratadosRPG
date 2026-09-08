import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { CampanhaDetalheDadosService } from './campanha-detalhe-dados.service';
import { CampanhaDetalheMestre } from '../detalhe-mestre/detalhe-mestre.page';
import { CampanhaDetalheJogador } from '../detalhe-jogador/detalhe-jogador.page';

/**
 * Casca de `/campanhas/:id` — resolve o papel do usuário
 * (`CampanhaDetalheDadosService.ehMestre`) e monta `CampanhaDetalheMestre` ou
 * `CampanhaDetalheJogador` (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 1). Único
 * ponto de fetch/assinatura de socket compartilhado entre os dois papéis — a instância de
 * `CampanhaDetalheDadosService` vive e morre com esta rota.
 *
 * Enquanto `dados.carregando()`, cai sempre na visão de jogador (mesma decisão que o antigo
 * `CampanhaDetalhe` já tomava para o próprio esqueleto: o papel só é conhecido depois que
 * `membros()` chega do backend).
 */
@Component({
  selector: 'app-campanha-detalhe-shell',
  imports: [CampanhaDetalheMestre, CampanhaDetalheJogador],
  providers: [CampanhaDetalheDadosService],
  templateUrl: './detalhe-shell.page.html',
})
export class CampanhaDetalheShell {
  private readonly rotaAtiva = inject(ActivatedRoute);
  protected readonly dados = inject(CampanhaDetalheDadosService);

  constructor() {
    this.dados.inicializar(Number(this.rotaAtiva.snapshot.paramMap.get('id')));
  }
}
