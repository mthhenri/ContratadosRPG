import { Component, computed, input } from '@angular/core';

/**
 * Variante de ênfase. `padrao` é o bloco `.chip-classificacao` canônico de
 * `docs/design/tema/_componentes.scss` (mono, borda `--accent`) — a única das três cópias
 * auditadas (`ui-03`) que reproduz o catálogo à risca (`simulacao-shell`, "Acesso Livre").
 * `sutil` cobre as outras duas (`ficha-visualizacao`, `criatura-visualizacao`), que usam o mesmo
 * desenho para um identificador de ficha (`FICHA-JGD-0003`) com tokens mais discretos
 * (`--text-mute`/`--border-strong`) em vez de `--accent`.
 */
export type ChipVariante = 'padrao' | 'sutil';

/**
 * Primitivo de selo curto (`ui-03` · `P-034`). Substitui as 3 cópias locais de
 * `.chip-classificacao`. O nome do componente é genérico — "classificação" (`CLASSE-E //
 * CONFIDENCIAL`) é um **uso** do chip, não a identidade dele.
 *
 * Só recebe texto por `<ng-content>`: nenhuma das três origens tem ícone ou botão de remoção.
 */
@Component({
  selector: 'app-chip',
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
})
export class Chip {
  /** Ênfase visual. Sem valor, usa o desenho canônico do catálogo (`--accent`). */
  readonly variante = input<ChipVariante>('padrao');

  protected readonly classes = computed(() => {
    const partes = ['chip'];
    if (this.variante() === 'sutil') partes.push('chip--sutil');
    return partes.join(' ');
  });
}
