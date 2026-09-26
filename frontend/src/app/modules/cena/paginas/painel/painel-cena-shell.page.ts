import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { cenaTemIniciativa } from '@contratados-rpg/shared/regras/cena';

import { Botao } from '../../../../shared/ui/botao/botao.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { EncontroPainelDadosService } from '../../../encontro/paginas/painel/encontro-painel-dados.service';
import { PainelEncontroJogador } from '../../../encontro/paginas/painel-jogador/painel-jogador.page';
import { PainelEncontroMestre } from '../../../encontro/paginas/painel-mestre/painel-mestre.page';
import { rotuloTipoCena } from '../../rotulos-cena';

/**
 * Casca de `/campanhas/:campanhaId/cenas/:cenaId` (m7-23, sucessora do `PainelEncontroShell` da
 * `ui-39`) — duas bifurcações, nesta ordem:
 *
 * 1. **Tipo da cena** (`cenaTemIniciativa`, `shared/regras/cena` — nunca um `if` por tipo aqui):
 *    com iniciativa (Combate/Furtiva/Perseguição) segue para o painel de Iniciativa de sempre;
 *    sem iniciativa (Investigação/Resistência) mostra um placeholder — o painel próprio desses
 *    tipos é da `m7-24` (pendência declarada, não funcionalidade).
 * 2. **Papel** (`EncontroPainelDadosService.visaoDoMestre`), como antes: `PainelEncontroMestre` ou
 *    `PainelEncontroJogador`, sem mudança nesses componentes além do que o hub exigiu.
 *
 * Enquanto a cena não chega, o tipo é desconhecido e a casca segue o caminho da Iniciativa, cuja
 * página do mestre já traz o esqueleto da tela — quem carrega não "pula" de uma visão para outra.
 */
@Component({
  selector: 'app-painel-cena-shell',
  imports: [RouterLink, Botao, EstadoVazio, Icone, PainelEncontroMestre, PainelEncontroJogador],
  providers: [EncontroPainelDadosService],
  templateUrl: './painel-cena-shell.page.html',
  styleUrl: './painel-cena-shell.page.scss',
})
export class PainelCenaShell {
  protected readonly dados = inject(EncontroPainelDadosService);

  /** `true` enquanto a cena carrega **ou** quando o tipo dela tem iniciativa. */
  protected readonly comIniciativa = computed(() => {
    const cena = this.dados.cena();
    return cena === null || cenaTemIniciativa(cena.tipo);
  });

  protected readonly rotuloTipoCena = rotuloTipoCena;
}
