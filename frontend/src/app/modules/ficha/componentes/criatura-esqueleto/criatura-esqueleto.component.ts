import { Component } from '@angular/core';

import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';

/**
 * Silhueta de carregamento da ficha de criatura — mesma geometria de duas colunas de
 * `CriaturaVisualizacao` (Identidade + Atributos fundidas numa coluna só, Status com 3 abas na
 * outra), mesmo padrão de `FichaEsqueleto` para a ficha de jogador. `app-esqueleto` dá a
 * identidade (cor/raio/pulso); aqui só a geometria de cada bloco. Os blocos são `aria-hidden`;
 * quem embute anuncia o carregamento uma vez (`role="status"` + `aria-label`), como
 * `visualizar-criatura.page` já faz no próprio `<app-criatura-esqueleto>`.
 */
@Component({
  selector: 'app-criatura-esqueleto',
  imports: [Esqueleto],
  templateUrl: './criatura-esqueleto.component.html',
  styleUrl: './criatura-esqueleto.component.scss',
})
export class CriaturaEsqueleto {}
