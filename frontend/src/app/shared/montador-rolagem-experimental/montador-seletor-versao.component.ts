import { Component, inject } from '@angular/core';

import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';
import { MONTADOR_VERSOES } from './montador-versao';
import { MontadorVersaoPreferenciaService } from './montador-versao-preferencia.service';

/**
 * Seletor da versão do montador (`montador-exp-02`): Atual · Essencial · Completo · Blocos, num `app-segmentado`
 * **fora** das janelas (o Atual não é modificado). Grava a escolha por dispositivo. Quem decide se ele aparece é o
 * consumidor, pelo mesmo gate do montador (`podeUsarMontador`).
 */
@Component({
  selector: 'app-montador-seletor-versao',
  imports: [Segmentado, SegmentadoItem],
  template: `
    <app-segmentado rotulo="Versão do montador de rolagem" class="montador-seletor">
      @for (opcao of versoes; track opcao.valor) {
        <button
          app-segmentado-item
          type="button"
          class="montador-seletor__item"
          [ativo]="preferencia.versao() === opcao.valor"
          (click)="preferencia.escolherVersao(opcao.valor)"
        >
          {{ opcao.rotulo }}
        </button>
      }
    </app-segmentado>
  `,
  styleUrl: './montador-seletor-versao.component.scss',
})
export class MontadorSeletorVersao {
  protected readonly preferencia = inject(MontadorVersaoPreferenciaService);
  protected readonly versoes = MONTADOR_VERSOES;
}
