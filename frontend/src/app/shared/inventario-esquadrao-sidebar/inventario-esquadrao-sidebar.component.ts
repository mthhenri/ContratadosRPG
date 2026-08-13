import { Component, input, output, signal } from '@angular/core';
import type { CampanhaInventarioItemDto } from '@contratados-rpg/shared/dtos/campanha';
import { AutoFocus } from '../auto-focus/auto-focus.directive';
import { Icone } from '../icone/icone.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import { InventarioEsquadrao } from '../../modules/campanha/componentes/inventario-esquadrao/inventario-esquadrao.component';

@Component({
  selector: 'app-inventario-esquadrao-sidebar',
  imports: [AutoFocus, Icone, Tooltip, InventarioEsquadrao],
  templateUrl: './inventario-esquadrao-sidebar.component.html',
  styleUrl: './inventario-esquadrao-sidebar.component.scss',
})
export class InventarioEsquadraoSidebar {
  readonly campanhaId = input.required<number>();
  readonly itens = input.required<readonly CampanhaInventarioItemDto[]>();
  readonly fichas = input<readonly { id: number; nome: string }[]>([]);
  readonly atualizado = output<readonly CampanhaInventarioItemDto[]>();
  protected readonly aberto = signal(false);
  protected fechar(): void { this.aberto.set(false); }
}
