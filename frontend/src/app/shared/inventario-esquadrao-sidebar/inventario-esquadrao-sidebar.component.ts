import { Component, input, model, output, signal } from '@angular/core';
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
  readonly alterado = output<readonly CampanhaInventarioItemDto[]>();
  /** Estado bidirecional para a página reservar a faixa da barra lateral quando ela está aberta. */
  readonly aberto = model(false);
  protected readonly painelRenderizado = signal(false);
  protected readonly saindo = signal(false);
  private encerramentoPendente: ReturnType<typeof setTimeout> | null = null;

  protected alternar(): void {
    if (this.aberto()) {
      this.fechar();
      return;
    }
    if (this.encerramentoPendente) {
      clearTimeout(this.encerramentoPendente);
      this.encerramentoPendente = null;
    }
    this.painelRenderizado.set(true);
    this.saindo.set(false);
    this.aberto.set(true);
  }

  protected fechar(): void {
    if (!this.aberto()) return;
    this.aberto.set(false);
    this.saindo.set(true);
    this.encerramentoPendente = setTimeout(() => {
      this.painelRenderizado.set(false);
      this.saindo.set(false);
      this.encerramentoPendente = null;
    }, 260);
  }
}
