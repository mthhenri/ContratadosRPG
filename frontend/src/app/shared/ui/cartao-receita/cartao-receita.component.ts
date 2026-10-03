import { Component, computed, input } from '@angular/core';

/**
 * Cartão de receita (`montador-rolagem-experimento`; autorizado pelo autor em 2026-10-01 e confirmado em
 * 2026-10-03): um ponto de partida clicável com **título** (conteúdo projetado, como o rótulo de `app-botao`) e
 * **descrição** curta — "Teste de atributo · Um ou dois atributos, dados a mais, crítico". Veste o `<button>` do
 * consumidor por seletor de atributo (mesmo padrão de `Botao`/`SegmentadoItem`): o host é o botão nativo, com
 * `type`, `disabled`, foco e clique nativos.
 *
 * `[ativo]` marca a receita em uso (lista "Modelos"), com `aria-pressed`; a seleção continua do consumidor.
 * O consumidor é dono do layout (grade, largura) pela própria classe BEM no mesmo elemento.
 */
@Component({
  selector: 'button[app-cartao-receita]',
  template: `
    <span class="cartao-receita__titulo"><ng-content /></span>
    @if (descricao(); as texto) {
      <span class="cartao-receita__descricao">{{ texto }}</span>
    }
  `,
  styleUrl: './cartao-receita.component.scss',
  host: {
    '[class]': 'classes()',
    '[attr.aria-pressed]': 'ativo() === null ? null : ativo() ? "true" : "false"',
  },
})
export class CartaoReceita {
  /** O que a receita traz, em uma linha curta. */
  readonly descricao = input<string | null>(null);

  /** Receita em uso. `null` (padrão): cartão comum, sem `aria-pressed`. */
  readonly ativo = input<boolean | null>(null);

  protected readonly classes = computed(() =>
    this.ativo() ? 'cartao-receita cartao-receita--ativo' : 'cartao-receita',
  );
}
