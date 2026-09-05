import { Component, input } from '@angular/core';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { BarraRecurso } from '../../../../shared/ui/barra-recurso/barra-recurso.component';
import type { ItemFicha } from '../../campanha-equipe.util';

/**
 * Ficha do painel de jogadores do espectador — mesmo recorte de `ItemFicha`, com o nome do dono já
 * anexado (`fichasEsquadrao` de `CampanhaDetalhe`).
 */
export type EspectadorFichaCardDados = ItemFicha & { readonly donoNome: string };

/**
 * Cartão de ficha do Painel do espectador (m8-07) — análogo aprovado `.detalhe__ficha-card`
 * (Esquadrão da visão de mestre): avatar quadrado à esquerda, identidade/recursos/reações à
 * direita, faixa "Última rolagem" full-width no rodapé. Sem nenhum controle de escrita: sem
 * steppers de vitalidade, sem menu de ações, sem condições/patente/identidade (v2, fora de
 * escopo — ver spec da task). `app-barra-recurso` (`ui-16`) nasce sem `[editavel]`, que já é
 * `false` por padrão.
 *
 * "Última rolagem" (entregável 7) é derivada no cliente pela página-mãe (primeira ocorrência do
 * `fichaId` no feed paginado já carregado) — este componente só formata o que recebe, nunca busca
 * nada sozinho. `ultimaRolagemTempo` chega já formatado (`rotuloRelativo`, mesmo relógio do feed)
 * para não duplicar o `agora` que recomputa o tempo relativo.
 */
@Component({
  selector: 'app-espectador-ficha-card',
  imports: [BarraRecurso],
  templateUrl: './espectador-ficha-card.component.html',
  styleUrl: './espectador-ficha-card.component.scss',
})
export class EspectadorFichaCard {
  readonly ficha = input.required<EspectadorFichaCardDados>();
  /** `null` sem rolagem daquela ficha na página do feed já carregada (nunca "nunca rolou"). */
  readonly ultimaRolagem = input<RolagemResumoDto | null>(null);
  /** Tempo relativo já formatado (ex.: "há 8s") — `null` junto com `ultimaRolagem` nula. */
  readonly ultimaRolagemTempo = input<string | null>(null);
}
