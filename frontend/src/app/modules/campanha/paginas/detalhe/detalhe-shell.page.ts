import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

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
 * Enquanto `dados.carregando()`, o papel de verdade ainda não é conhecido (`membros()` não chegou
 * do backend) — usa `papelHint`, o `papel` que `CampanhaLista` já sabia por linha e repassou via
 * `state` da navegação (`lista.page.html`), pra montar a silhueta certa (mestre ganha a própria
 * silhueta, antes código morto porque a casca sempre caía na de jogador). Sem hint (navegação
 * direta, refresh, link colado) cai na visão de jogador, como sempre — o hint é só um
 * adiantamento de UI, nunca fonte de verdade de permissão.
 */
@Component({
  selector: 'app-campanha-detalhe-shell',
  imports: [CampanhaDetalheMestre, CampanhaDetalheJogador],
  providers: [CampanhaDetalheDadosService],
  templateUrl: './detalhe-shell.page.html',
})
export class CampanhaDetalheShell {
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly dados = inject(CampanhaDetalheDadosService);

  protected readonly TipoCampanhaMembroPapelEnum = TipoCampanhaMembroPapelEnum;

  protected readonly papelHint: TipoCampanhaMembroPapelEnum | null =
    (this.router.getCurrentNavigation()?.extras.state?.['papel'] as
      | TipoCampanhaMembroPapelEnum
      | undefined) ?? null;

  constructor() {
    this.dados.inicializar(Number(this.rotaAtiva.snapshot.paramMap.get('id')));
  }
}
