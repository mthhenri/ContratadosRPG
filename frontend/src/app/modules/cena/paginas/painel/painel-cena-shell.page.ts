import { Component, computed, inject } from '@angular/core';

import { cenaTemIniciativa } from '@contratados-rpg/shared/regras/cena';

import { EncontroPainelDadosService } from '../../../encontro/paginas/painel/encontro-painel-dados.service';
import { PainelEncontroJogador } from '../../../encontro/paginas/painel-jogador/painel-jogador.page';
import { PainelEncontroMestre } from '../../../encontro/paginas/painel-mestre/painel-mestre.page';
import { PainelCenaSemIniciativaJogador } from '../painel-sem-iniciativa-jogador/painel-sem-iniciativa-jogador.page';
import { PainelCenaSemIniciativaMestre } from '../painel-sem-iniciativa-mestre/painel-sem-iniciativa-mestre.page';

/**
 * Casca de `/campanhas/:campanhaId/cenas/:cenaId` (m7-23, sucessora do `PainelEncontroShell` da
 * `ui-39`) — duas bifurcações, nesta ordem:
 *
 * 1. **Tipo da cena** (`cenaTemIniciativa`, `shared/regras/cena` — nunca um `if` por tipo aqui):
 *    com iniciativa (Combate/Furtiva/Perseguição) segue para o painel de Iniciativa de sempre;
 *    sem iniciativa (Investigação/Resistência) segue para o painel sem trilha de turnos (m7-24).
 * 2. **Papel** (`EncontroPainelDadosService.visaoDoMestre`), nos dois ramos: `PainelEncontroMestre`
 *    ou `PainelEncontroJogador` com iniciativa; `PainelCenaSemIniciativaMestre` ou
 *    `PainelCenaSemIniciativaJogador` sem.
 *
 * Enquanto a cena não chega, o tipo é desconhecido e a casca segue o caminho da Iniciativa, cuja
 * página do mestre já traz o esqueleto da tela — quem carrega não "pula" de uma visão para outra.
 */
@Component({
  selector: 'app-painel-cena-shell',
  imports: [
    PainelEncontroMestre,
    PainelEncontroJogador,
    PainelCenaSemIniciativaMestre,
    PainelCenaSemIniciativaJogador,
  ],
  providers: [EncontroPainelDadosService],
  templateUrl: './painel-cena-shell.page.html',
})
export class PainelCenaShell {
  protected readonly dados = inject(EncontroPainelDadosService);

  /** `true` enquanto a cena carrega **ou** quando o tipo dela tem iniciativa. */
  protected readonly comIniciativa = computed(() => {
    const cena = this.dados.cena();
    return cena === null || cenaTemIniciativa(cena.tipo);
  });
}
