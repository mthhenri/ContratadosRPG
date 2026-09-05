import { Component, effect, input, model, output, signal, untracked } from '@angular/core';
import type { CampanhaInventarioItemDto } from '@contratados-rpg/shared/dtos/campanha';
import { AutoFocus } from '../auto-focus/auto-focus.directive';
import { Icone } from '../icone/icone.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import { BotaoIcone } from '../ui/botao-icone/botao-icone.component';
import { InventarioEsquadrao } from '../../modules/campanha/componentes/inventario-esquadrao/inventario-esquadrao.component';

@Component({
  selector: 'app-inventario-esquadrao-sidebar',
  imports: [AutoFocus, Icone, Tooltip, BotaoIcone, InventarioEsquadrao],
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

  constructor() {
    // Reage a `aberto` mudar por QUALQUER via — clique do próprio gatilho ou a página fechando
    // este painel de fora (mútua exclusão com outra barra lateral, ex. `CampanhaDetalhe`) —, não
    // só pelo antigo `alternar`/`fechar` interno. Sem isto, um fechamento externo (via
    // `[(aberto)]`) nunca desmontava o painel: `painelRenderizado` ficava preso em `true` e o
    // painel continuava renderizado por baixo do que abriu depois, reaparecendo se aquele outro
    // fosse fechado.
    effect(() => {
      if (this.aberto()) {
        if (this.encerramentoPendente) {
          clearTimeout(this.encerramentoPendente);
          this.encerramentoPendente = null;
        }
        this.painelRenderizado.set(true);
        this.saindo.set(false);
        return;
      }
      untracked(() => {
        if (!this.painelRenderizado()) {
          return;
        }
        this.saindo.set(true);
        this.encerramentoPendente = setTimeout(() => {
          this.painelRenderizado.set(false);
          this.saindo.set(false);
          this.encerramentoPendente = null;
        }, 260);
      });
    });
  }

  protected alternar(): void {
    this.aberto.update((atual) => !atual);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }
}
