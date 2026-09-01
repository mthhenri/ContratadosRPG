import { Component, input } from '@angular/core';

import { Icone, type IconeNome } from '../../icone/icone.component';

/**
 * Primitivo de estado vazio de lista (`ui-14` · `P-034`). Substitui as cópias locais de
 * `<p class="…__vazio">`/`…__estado` espalhadas pelas listas do produto (histórico de rolagens,
 * acervo de fichas, lista de campanhas, inventário do esquadrão e da ficha).
 *
 * Vazio de verdade ("Nenhuma campanha ainda.") e vazio por filtro ("Nenhuma criatura ainda.") são
 * o **mesmo** componente — a API não distingue os dois casos, só recebe o texto que o consumidor
 * já decidiu. A ação é opcional e projetada (não um input de rótulo): quando existe, o consumidor
 * decide o próprio `app-botao` (`estilo="contorno"` ou `"link"`, nunca `"preenchido"` — um estado
 * vazio não compete visualmente com a ação principal da tela, que já mora na barra acima da lista).
 */
@Component({
  selector: 'app-estado-vazio',
  imports: [Icone],
  templateUrl: './estado-vazio.component.html',
  styleUrl: './estado-vazio.component.scss',
})
export class EstadoVazio {
  /** Ícone do topo. Sem valor, o estado vazio segue só com título e linha de apoio. */
  readonly icone = input<IconeNome>();

  /** Mensagem principal, em mono — sempre uma frase curta e completa. */
  readonly titulo = input.required<string>();

  /** Segunda linha opcional, mais discreta, com o contexto ou o próximo passo sugerido. */
  readonly linhaApoio = input<string>();
}
