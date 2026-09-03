import { Component, computed, input } from '@angular/core';

import type { EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { EncontroStatusEnum } from '@contratados-rpg/shared/enums';

import { Cartao } from '../../../../shared/ui/cartao/cartao.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import {
  calcularColunasGrade,
  combatenteEhDaVez,
  combatenteJaAgiu,
  montarCombatentesVisuais,
  resolverNivelAmeaca,
  type CombatenteVisualDto,
} from '../../encontro-leitura.util';
import { rotuloStatusEncontro } from '../../rotulos-encontro';
import { CartaoCombatente } from '../cartao-combatente/cartao-combatente.component';
import { LogEncontro } from '../log-encontro/log-encontro.component';

/**
 * Leitura do Encontro ativo — ordem, turno, rodada, cartões de combatente e log da rodada — sem
 * nenhum controle de condução (m8-05). Usada pelo Painel do espectador e pela Prévia de jogador
 * (`m8-espectadores-campanha`): as duas só têm o `EncontroRecuperadoDto` já redigido pelo backend
 * (`EncontroService.recuperarEncontroAtivoParaEspectador`/`recuperarEncontroAtivoParaAlvo`, nunca
 * o recorte de quem está de fato olhando) — este componente só apresenta o que chegou. A mesma
 * derivação de apresentação de `painel-encontro.page.ts` (`encontro-leitura.util.ts`), nunca uma
 * segunda leitura da ordem/Cadência.
 *
 * **Sem mutação, de verdade — não só na aparência.** `CartaoCombatente` só muda algo através dos
 * próprios `@Output` (`vidaAjustada`, `iniciativaAtribuida`, `removido`...); nenhum é conectado
 * aqui, então nenhum clique no cartão chega a um `HttpClient` (mesmo racional do m8-04 para
 * componentes cuja mutação sai só por `@Output` — o pai que não conecta a saída controla por
 * completo a consequência). `podeAjustar`/`ehMestre`/`emEdicao` nem são passados: ficam no
 * `false` padrão do próprio `CartaoCombatente`, então não há binding nenhum para inspecionar ou
 * errar. `LogEncontro` não tem `@Output` algum — é puramente apresentação.
 */
@Component({
  selector: 'app-iniciativa-leitura',
  imports: [Cartao, Chip, CartaoCombatente, LogEncontro],
  templateUrl: './iniciativa-leitura.component.html',
  styleUrl: './iniciativa-leitura.component.scss',
})
export class IniciativaLeitura {
  readonly encontro = input.required<EncontroRecuperadoDto>();

  /** Fichas visíveis a quem está olhando — só alimenta o rótulo "Ameaça" de uma criatura (m7-17). */
  readonly fichasCampanha = input<readonly Pick<FichaResumoDto, 'id' | 'na'>[]>([]);

  protected readonly rotuloStatus = computed(() => rotuloStatusEncontro(this.encontro().status));
  protected readonly emCombate = computed(() => this.encontro().status === EncontroStatusEnum.ATIVO);
  protected readonly totalDeTurnos = computed(() => this.encontro().ordemRodada.length);

  protected readonly combatentesVisuais = computed<readonly CombatenteVisualDto[]>(() =>
    montarCombatentesVisuais(this.encontro()),
  );
  protected readonly colunasGrade = computed(() => calcularColunasGrade(this.combatentesVisuais().length));

  protected ehDaVez(combatente: CombatenteVisualDto): boolean {
    return combatenteEhDaVez(combatente, this.encontro());
  }

  protected jaAgiu(combatente: CombatenteVisualDto): boolean {
    return combatenteJaAgiu(combatente, this.encontro());
  }

  protected nivelAmeaca(combatente: CombatenteVisualDto) {
    return resolverNivelAmeaca(combatente, this.fichasCampanha());
  }
}
