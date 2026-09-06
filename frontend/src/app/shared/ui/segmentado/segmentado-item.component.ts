import { Component, computed, input } from '@angular/core';

/**
 * Item de `app-segmentado` (`P-056`). Veste o `<button>` do consumidor por seletor de atributo
 * (mesmo padrão de `Aba`/`Botao`) — o host é o próprio botão, sem nó extra dentro do grupo.
 *
 * A seleção continua do consumidor: `[ativo]` só reflete o estado (`(click)` chama o método que
 * já decide a troca). Tamanho e conteúdo (ícone só, ícone + texto, texto só) ficam por conta do
 * consumidor via `ng-content` e da própria classe BEM no mesmo elemento — o primitivo não assume
 * um `[tamanho]` porque densidade aqui é sempre função do conteúdo projetado, não de um degrau
 * fixo (mesmo racional de `Aba`).
 */
@Component({
  selector: 'button[app-segmentado-item]',
  template: `<ng-content />`,
  styleUrl: './segmentado-item.component.scss',
  host: {
    '[class]': 'classes()',
    '[attr.aria-pressed]': 'ativo() ? "true" : "false"',
    '[disabled]': 'desabilitado() || null',
  },
})
export class SegmentadoItem {
  /** Estado de seleção, decidido pelo consumidor. */
  readonly ativo = input(false);

  /** Trava o item (ex.: ação indisponível no estado atual) sem removê-lo do grupo. */
  readonly desabilitado = input(false);

  protected readonly classes = computed(() =>
    this.ativo() ? 'segmentado__item segmentado__item--ativo' : 'segmentado__item',
  );
}
