import { DatePipe } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';

import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { AutoFocus } from '../auto-focus/auto-focus.directive';
import { Icone } from '../icone/icone.component';
import { OverflowFade } from '../overflow-fade/overflow-fade.directive';
import { ResultadoRolagem } from '../resultado-rolagem/resultado-rolagem.component';
import { Tooltip } from '../tooltip/tooltip.directive';

/**
 * Barra lateral de histórico de rolagens — substitui a antiga listagem embutida no painel da
 * campanha (card "Rolagens Recentes", pouco legível numa faixa estreita) e reusa a mesma UI
 * dentro da ficha do jogador. As duas telas consomem o mesmo `RolagemResumoDto` (`shared/dtos/
 * rolagem`), então o componente é puramente apresentacional — quem chama já resolveu o
 * carregamento/paginação (feed ao vivo da campanha ou histórico paginado da ficha).
 *
 * **Autocontido**: o gatilho (ícone D20) e o painel moram os dois aqui dentro — quem consome só
 * declara `<app-historico-rolagens-sidebar [itens]="..." />` uma vez, tipicamente no cabeçalho da
 * página (mesmo padrão de `CalculadoraFlutuante`/`BandejaDados`, `:host { display: contents }`).
 *
 * O painel é `position: fixed`; a tag **não pode** viver dentro de um ancestral com `overflow` +
 * `mask-image` (`appOverflowFade`), senão a pintura recorta o painel mesmo sendo `fixed` — mesma
 * armadilha documentada em `CampanhaDetalhe` (`menuFichaAberto`).
 */
@Component({
  selector: 'app-historico-rolagens-sidebar',
  imports: [Icone, ResultadoRolagem, OverflowFade, DatePipe, AutoFocus, Tooltip],
  templateUrl: './historico-rolagens-sidebar.component.html',
  styleUrl: './historico-rolagens-sidebar.component.scss',
})
export class HistoricoRolagensSidebar {
  readonly titulo = input('Histórico de Rolagens');
  readonly itens = input.required<readonly RolagemResumoDto[]>();
  readonly carregando = input(false);
  readonly carregandoMais = input(false);
  readonly temMais = input(false);
  /** `false` na ficha (o nome dela já é óbvio pelo contexto — evita "· <mesmo nome>" repetido). */
  readonly mostrarFicha = input(true);
  /**
   * `true` só na ficha (m3-61) — o gatilho flutuante do desktop empilha 60px mais alto, acima do
   * gatilho de `CalculadoraFlutuante`, que só existe naquela tela. No painel da campanha (padrão,
   * `false`) não há calculadora para dar espaço, então o gatilho fica direto no rodapé, sem o vão.
   */
  readonly acimaDaCalculadora = input(false);

  readonly carregarMais = output<void>();

  protected readonly RolagemVisibilidadeEnum = RolagemVisibilidadeEnum;
  protected readonly aberto = signal(false);

  protected alternar(): void {
    this.aberto.update((atual) => !atual);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }

  /** Autor + (opcionalmente) o nome da ficha — junta os dois numa string só para o template. */
  protected metaAutor(item: RolagemResumoDto): string {
    return this.mostrarFicha() ? `${item.nomeAutor} · ${item.nomeFicha}` : item.nomeAutor;
  }
}
