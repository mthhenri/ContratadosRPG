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

/** Cores semânticas que já possuem consumidores de selo no produto. */
export type ChipSeveridade = 'primario' | 'secundario' | 'aviso' | 'perigo';

/**
 * Tratamento visual da severidade. `sutil` aplica a receita canônica (fundo a 12% e borda a
 * 40%); `contorno` preserva selos informativos que pedem somente o contorno.
 */
export type ChipTom = 'sutil' | 'contorno';

/**
 * Primitivo de selo curto (`ui-03` · `P-034`). Substitui as 3 cópias locais de
 * `.chip-classificacao`. O nome do componente é genérico — "classificação" (`CLASSE-E //
 * CONFIDENCIAL`) é um **uso** do chip, não a identidade dele.
 *
 * O chip de rótulo conserva as variantes da ui-03. Com `severidade`, ele vira um selo de estado
 * e aceita um `app-icone` projetado antes do texto; não é removível nem clicável.
 */
@Component({
  selector: 'app-chip',
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
})
export class Chip {
  /** Ênfase visual. Sem valor, usa o desenho canônico do catálogo (`--accent`). */
  readonly variante = input<ChipVariante>('padrao');

  /** Semântica de estado. Sem valor, preserva o chip de rótulo da ui-03. */
  readonly severidade = input<ChipSeveridade>();

  /** Aplicação da cor semântica; só tem efeito quando há `severidade`. */
  readonly tom = input<ChipTom>('sutil');

  protected readonly classes = computed(() => {
    const partes = ['chip'];
    const severidade = this.severidade();

    if (severidade) {
      partes.push(`chip--severidade-${severidade}`, `chip--tom-${this.tom()}`);
    } else if (this.variante() === 'sutil') {
      partes.push('chip--sutil');
    }

    return partes.join(' ');
  });
}
