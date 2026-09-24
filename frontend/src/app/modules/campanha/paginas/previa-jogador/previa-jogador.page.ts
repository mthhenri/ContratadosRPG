import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { CampanhaPreviaJogadorDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';
import { CampanhaDetalheJogador } from '../detalhe-jogador/detalhe-jogador.page';
import { CampanhaPreviaJogadorDadosService } from './campanha-previa-jogador-dados.service';

/**
 * Prévia de jogador (m8-04) — "ver como jogador" do mestre. Monta a **mesma** visão real do
 * jogador (`CampanhaDetalheJogador`), não uma cópia do layout: a única diferença é a fonte de
 * dados, trocada por `CampanhaPreviaJogadorDadosService` (projeção do alvo, redigida pelo backend).
 * Com `previa()` preenchido, a visão de jogador se põe em somente leitura — nenhum controle
 * dispara mutação — e decide "minha ficha" pelo alvo, nunca pelo mestre que olha.
 *
 * Mesmo molde de `CampanhaDetalheShell`: a casca provê o serviço de dados (escopo de rota) e o
 * inicializa com os parâmetros da rota `/campanhas/:id/previa/:usuarioAlvoId`.
 */
@Component({
  selector: 'app-campanha-previa-jogador',
  imports: [CampanhaDetalheJogador],
  providers: [
    CampanhaPreviaJogadorDadosService,
    { provide: CampanhaDetalheDadosService, useExisting: CampanhaPreviaJogadorDadosService },
  ],
  templateUrl: './previa-jogador.page.html',
})
export class CampanhaPreviaJogador {
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly dados = inject(CampanhaPreviaJogadorDadosService);

  constructor() {
    const parametros = this.rotaAtiva.snapshot.paramMap;
    this.dados.inicializarPrevia(
      Number(parametros.get('id')),
      Number(parametros.get('usuarioAlvoId')),
      this.rotaAtiva.snapshot.data?.['previaJogador'] as CampanhaPreviaJogadorDto | undefined,
    );
  }
}
