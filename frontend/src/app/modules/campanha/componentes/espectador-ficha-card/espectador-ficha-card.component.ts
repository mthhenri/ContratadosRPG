import { Component, input, output } from '@angular/core';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { BarraRecurso } from '../../../../shared/ui/barra-recurso/barra-recurso.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import type { ItemFicha } from '../../campanha-equipe.util';

/**
 * Ficha do painel de jogadores do espectador — mesmo recorte de `ItemFicha`, com o nome do dono já
 * anexado (`fichasEsquadrao` de `CampanhaDetalhe`).
 */
export type EspectadorFichaCardDados = ItemFicha & { readonly donoNome: string };

/**
 * Cartão de ficha do Painel do espectador (m8-07) — análogo aprovado `.detalhe__ficha-card`
 * (Esquadrão da visão de mestre): avatar quadrado à esquerda, identidade/recursos/reações à
 * direita, faixa "Última rolagem" full-width no rodapé. Sem nenhum controle de escrita por padrão:
 * sem steppers de vitalidade, sem condições/patente/identidade (v2, fora de escopo — ver spec da
 * task). `app-barra-recurso` (`ui-16`) nasce sem `[editavel]`, que já é `false` por padrão.
 *
 * "Última rolagem" (entregável 7) é derivada no cliente pela página-mãe (primeira ocorrência do
 * `fichaId` no feed paginado já carregado) — este componente só formata o que recebe, nunca busca
 * nada sozinho. `ultimaRolagemTempo` chega já formatado (`rotuloRelativo`, mesmo relógio do feed)
 * para não duplicar o `agora` que recomputa o tempo relativo.
 *
 * `[mostrarAcoes]` (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 3) — `false` por
 * padrão, comportamento original do espectador inalterado. O mestre liga para reusar este cartão
 * no Esquadrão em vez de duplicar a receita visual: ganha o ícone "Abrir ficha" sobre o avatar e o
 * gatilho do menu "⋯". O dropdown do menu em si (duplicar/remover/excluir) fica por conta do
 * consumidor — mesmo motivo do antigo `menuFichaAberto` de `CampanhaDetalhe`: o grid do Esquadrão
 * tem `overflow`+`mask-image` (`appOverflowFade`), que recortaria um dropdown filho na pintura
 * mesmo sendo `position: fixed`; ele precisa morar na raiz do template do consumidor.
 */
@Component({
  selector: 'app-espectador-ficha-card',
  imports: [BarraRecurso, BotaoIcone, Icone, Tooltip],
  templateUrl: './espectador-ficha-card.component.html',
  styleUrl: './espectador-ficha-card.component.scss',
})
export class EspectadorFichaCard {
  readonly ficha = input.required<EspectadorFichaCardDados>();
  /** `null` sem rolagem daquela ficha na página do feed já carregada (nunca "nunca rolou"). */
  readonly ultimaRolagem = input<RolagemResumoDto | null>(null);
  /** Tempo relativo já formatado (ex.: "há 8s") — `null` junto com `ultimaRolagem` nula. */
  readonly ultimaRolagemTempo = input<string | null>(null);

  /** Modo interativo — `false` por padrão (espectador, só leitura). */
  readonly mostrarAcoes = input(false);
  /** Se o menu "⋯" DESTE cartão está aberto — controlado pelo pai, como o antigo `menuFichaAberto`. */
  readonly menuAberto = input(false);

  readonly abrirFicha = output<void>();
  readonly alternarMenu = output<MouseEvent>();
}
