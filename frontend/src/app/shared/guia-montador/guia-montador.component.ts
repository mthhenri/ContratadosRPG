import { Component, input, output, signal } from '@angular/core';

import { GuiaFormula } from '../guia-formula/guia-formula.component';
import { Botao } from '../ui/botao/botao.component';
import { Modal } from '../ui/modal/modal.component';
import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';

@Component({
  selector: 'app-guia-montador',
  imports: [Botao, Modal, Segmentado, SegmentadoItem, GuiaFormula],
  templateUrl: './guia-montador.component.html',
  styleUrl: './guia-montador.component.scss',
})
export class GuiaMontador {
  readonly aberto = input.required<boolean>();
  readonly fechar = output<void>();
  protected readonly pagina = signal<'COMEÇAR' | 'EDITAR' | 'EXEMPLOS'>('COMEÇAR');
}
