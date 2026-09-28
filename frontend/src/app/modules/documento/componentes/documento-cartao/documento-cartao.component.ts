import { Component, computed, input } from '@angular/core';

import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { descreverLeitores, type DocumentoLeitorNomeado } from '../../documento-leitores';
import { iconeTipoDocumento, rotuloTipoDocumento } from '../../documento-tipo';

/**
 * Cartão de um documento da biblioteca (m9-04, extraído na m9-05) — a receita do `.cena-cartao` do
 * hub: ícone do tipo, título em mono e, abaixo, o rótulo do tipo e o chip de estado. É o próprio
 * `<button>` (seletor de atributo), para o consumidor decidir o clique.
 *
 * `revelado` `null` omite o chip — jogador e espectador só veem o revelado, e o chip seria ruído.
 * `leitores` (m9-10, só o mestre) liga o chip "N lendo"; vazio, nada aparece (nunca "0 lendo").
 * O que o consumidor projeta desce abaixo da linha de meta (o trecho da busca).
 */
@Component({
  selector: 'button[app-documento-cartao]',
  imports: [Icone, Chip, Tooltip],
  templateUrl: './documento-cartao.component.html',
  styleUrl: './documento-cartao.component.scss',
  host: {
    class: 'documento-cartao',
    type: 'button',
    '[class.documento-cartao--aberto]': 'aberto()',
    '[attr.aria-pressed]': 'aberto()',
  },
})
export class DocumentoCartao {
  readonly titulo = input.required<string>();
  readonly tipo = input.required<TipoDocumentoEnum>();
  readonly revelado = input<boolean | null>(null);
  readonly aberto = input(false);
  /** Quem está com este documento aberto agora — só o mestre recebe. */
  readonly leitores = input<readonly DocumentoLeitorNomeado[]>([]);

  protected readonly icone = computed(() => iconeTipoDocumento(this.tipo()));
  protected readonly rotuloTipo = computed(() => rotuloTipoDocumento(this.tipo()));
  protected readonly descricaoLeitores = computed(() => descreverLeitores(this.leitores()));
}
