import { Component, input, output } from '@angular/core';

import { Icone } from '../../icone/icone.component';

/**
 * Primitivo da linha de uma pasta (biblioteca-pastas) — chevron que recolhe/expande, ícone de
 * pasta (fechada ou aberta), nome em mono e a contagem de itens. É um `<div>` (seletor de
 * atributo) para o consumidor anexar o que for dele — `draggable` e os eventos de arrastar — sem
 * este primitivo conhecer drag and drop; o estado visual do alvo de soltar entra por `[alvo]`.
 *
 * O botão principal recolhe/expande (`aria-expanded`); ações da linha (renomear, mover, excluir)
 * entram projetadas em `[pastaAcoes]` e só existem quando o consumidor as projeta. `nivel` recua a
 * linha para desenhar a árvore: 0 na raiz. Só tokens (#29); a receita é a do `.documento-cartao`,
 * para pasta e documento parecerem da mesma lista.
 */
@Component({
  selector: 'div[app-pasta-linha]',
  imports: [Icone],
  templateUrl: './pasta-linha.component.html',
  styleUrl: './pasta-linha.component.scss',
  host: {
    class: 'pasta-linha',
    '[class.pasta-linha--aberta]': 'aberta()',
    '[class.pasta-linha--alvo]': 'alvo()',
    '[style.--pasta-nivel]': 'nivel()',
  },
})
export class PastaLinha {
  readonly nome = input.required<string>();
  /** Expandida: mostra o ícone de pasta aberta e gira o chevron. */
  readonly aberta = input(false);
  /** Quantos itens a pasta contém (documentos e subpastas diretos); `null` omite. */
  readonly contagem = input<number | null>(null);
  /** Profundidade na árvore — 0 na raiz; recua a linha. */
  readonly nivel = input(0);
  /** Alvo de soltar em destaque (um item está sendo arrastado sobre a pasta). */
  readonly alvo = input(false);

  readonly alternar = output<void>();
}
