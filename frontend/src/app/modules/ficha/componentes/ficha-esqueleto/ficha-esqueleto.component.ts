import { Component, input } from '@angular/core';

import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';

/**
 * Silhueta de carregamento da ficha de jogador — mesma geometria de duas colunas de
 * `FichaVisualizacao` (Identidade + Atributos empilhadas | Status com barra de abas). Serve a ficha
 * completa (`visualizar.page`, 40/60, cabeçalho já vive na página) e o card embutido da campanha
 * (`[compacto]`, o mesmo divisor de `FichaCampanhaCard`, com a barra "Ficha de Jogador" no topo).
 *
 * `app-esqueleto` dá a identidade (cor/raio/pulso); aqui só a geometria de cada bloco. Os blocos
 * são `aria-hidden`; quem embute anuncia o carregamento uma vez (`role="status"` +
 * `aria-label`), no próprio `<app-ficha-esqueleto>` ou num invólucro que já o faça.
 */
@Component({
  selector: 'app-ficha-esqueleto',
  imports: [Esqueleto],
  templateUrl: './ficha-esqueleto.component.html',
  styleUrl: './ficha-esqueleto.component.scss',
})
export class FichaEsqueleto {
  /** Card embutido da campanha: divisão 1:1 com teto na coluna de Identidade e barra de topo. */
  readonly compacto = input(false);
}
