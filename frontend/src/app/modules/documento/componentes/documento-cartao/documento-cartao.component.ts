import { Component, computed, input } from '@angular/core';

import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { iconeTipoDocumento, rotuloTipoDocumento } from '../../documento-tipo';

/**
 * Cartão de um documento da biblioteca (m9-04, extraído na m9-05) — a receita do `.cena-cartao` do
 * hub: ícone do tipo, título em mono e, abaixo, o rótulo do tipo e o chip de estado. É o próprio
 * `<button>` (seletor de atributo), para o consumidor decidir o clique.
 *
 * `revelado` `null` omite o chip — jogador e espectador só veem o revelado, e o chip seria ruído.
 * O que o consumidor projeta desce abaixo da linha de meta (o trecho da busca).
 */
@Component({
  selector: 'button[app-documento-cartao]',
  imports: [Icone, Chip],
  templateUrl: './documento-cartao.component.html',
  styleUrl: './documento-cartao.component.scss',
  host: {
    class: 'documento-cartao',
    type: 'button',
    '[class.documento-cartao--aberto]': 'aberto()',
    '[attr.aria-current]': "aberto() ? 'true' : null",
  },
})
export class DocumentoCartao {
  readonly titulo = input.required<string>();
  readonly tipo = input.required<TipoDocumentoEnum>();
  readonly revelado = input<boolean | null>(null);
  readonly aberto = input(false);

  protected readonly icone = computed(() => iconeTipoDocumento(this.tipo()));
  protected readonly rotuloTipo = computed(() => rotuloTipoDocumento(this.tipo()));
}
