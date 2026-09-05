import { Component, computed, input, output } from '@angular/core';

import { Icone } from '../../icone/icone.component';
import { BotaoIcone } from '../botao-icone/botao-icone.component';
import { Botao } from '../botao/botao.component';

/**
 * Paginador com salto para extremos e janela de páginas numeradas ao redor da atual —
 * `Primeira < […] [x] […] > Última`. Nasce como primitivo (em vez de ficar só na Gestão de
 * Usuários, seu primeiro consumidor) porque a API não tem nada específico daquela tela: só
 * `pagina`/`totalPaginas`, do jeito que qualquer lista paginada do backend já expõe.
 *
 * A janela mostra até `paginasVizinhas` páginas de cada lado da atual (padrão 2, os `[]` do
 * pedido original) e desliza para caber o total pedido de páginas mesmo perto das bordas — em vez
 * de encolher perto do início/fim, o que faria a barra "pular" de largura a cada clique.
 */
@Component({
  selector: 'app-paginador',
  imports: [Botao, BotaoIcone, Icone],
  templateUrl: './paginador.component.html',
  styleUrl: './paginador.component.scss',
  host: {
    class: 'paginador',
    role: 'navigation',
    'aria-label': 'Paginação',
  },
})
export class Paginador {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input.required<number>();
  /** Páginas visíveis de cada lado da atual. Padrão 2 — o pedido original ("2 páginas pra frente/trás"). */
  readonly paginasVizinhas = input(2);

  readonly paginaAlterada = output<number>();

  protected readonly paginasVisiveis = computed(() => {
    const total = this.totalPaginas();
    const tamanhoJanela = Math.min(total, this.paginasVizinhas() * 2 + 1);
    if (tamanhoJanela <= 0) return [];

    const inicio = Math.min(
      Math.max(1, this.pagina() - this.paginasVizinhas()),
      total - tamanhoJanela + 1,
    );
    return Array.from({ length: tamanhoJanela }, (_, indice) => inicio + indice);
  });

  protected irPara(alvo: number): void {
    const paginaValida = Math.min(Math.max(alvo, 1), this.totalPaginas());
    if (paginaValida !== this.pagina()) this.paginaAlterada.emit(paginaValida);
  }
}
