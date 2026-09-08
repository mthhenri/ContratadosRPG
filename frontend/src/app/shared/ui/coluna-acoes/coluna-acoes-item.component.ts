import { Component, computed, input } from '@angular/core';

import type { IconeNome } from '../../icone/icone.component';
import { Icone } from '../../icone/icone.component';
import { Tooltip } from '../../tooltip/tooltip.directive';

/**
 * Item de `app-coluna-acoes` (`campanha-detalhe-mestre-coluna-acoes.spec.md`). Ícone sempre
 * visível; o rótulo (`<ng-content>`) só aparece expandido — retraído, o `appTooltip` do host
 * cobre a leitura visual (o rótulo textual continua no DOM para leitor de tela).
 *
 * Ao contrário de `SegmentadoItem` (seleção única mutuamente exclusiva), os itens aqui são ações
 * heterogêneas (abrir dialog, navegar, abrir painel flutuante) — sem `aria-pressed`/roving
 * tabindex: ordem de tab nativa do DOM, mesmo padrão de foco que `Segmentado` já usa.
 */
@Component({
  selector: 'button[app-coluna-acoes-item], a[app-coluna-acoes-item]',
  imports: [Icone],
  hostDirectives: [{ directive: Tooltip, inputs: ['appTooltip'] }],
  templateUrl: './coluna-acoes-item.component.html',
  styleUrl: './coluna-acoes-item.component.scss',
  host: {
    '[class]': 'classes()',
    '[attr.aria-current]': 'ativo() ? "page" : null',
  },
})
export class ColunaAcoesItem {
  readonly icone = input.required<IconeNome>();

  /** Item correspondente à rota atual, se aplicável — decidido pelo consumidor. */
  readonly ativo = input(false);

  /** Badge numérico opcional (ex.: convites pendentes) — usado ou não pelo consumidor. */
  readonly contagem = input<number | null>(null);

  protected readonly classes = computed(() =>
    this.ativo() ? 'coluna-acoes__item coluna-acoes__item--ativo' : 'coluna-acoes__item',
  );
}
