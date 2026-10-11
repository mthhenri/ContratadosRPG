import { Component, ElementRef, inject, input } from '@angular/core';

/**
 * Primitivo de barra de ferramentas (m11-06): uma fileira compacta de ações unitárias sobre algo
 * selecionado (a peça aberta na Oficina das Regras). Papel ARIA `toolbar`; os itens são
 * `app-botao-icone` (com `aria-pressed` quando alternam) e `app-barra-ferramentas-separador`.
 *
 * Teclado (padrão ARIA de toolbar): ← → movem o foco entre os itens habilitados, Home/End vão ao
 * primeiro/último. Só o posicionamento (flutuar sobre a peça, fixar numa barra) é do consumidor.
 */
@Component({
  selector: 'app-barra-ferramentas',
  template: '<ng-content />',
  styleUrl: './barra-ferramentas.component.scss',
  host: {
    class: 'barra-ferramentas',
    role: 'toolbar',
    '[attr.aria-label]': 'rotulo()',
    '(keydown)': 'aoTeclar($event)',
  },
})
export class BarraFerramentas {
  /** Rótulo acessível da barra (`aria-label`). */
  readonly rotulo = input.required<string>();

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  protected aoTeclar(evento: KeyboardEvent): void {
    const teclas = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!teclas.includes(evento.key)) return;
    const itens = [...this.elemento.nativeElement.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
    if (itens.length === 0) return;
    const atual = itens.indexOf(document.activeElement as HTMLElement);
    const proximo =
      evento.key === 'Home' ? 0
      : evento.key === 'End' ? itens.length - 1
      : evento.key === 'ArrowRight' ? (atual + 1) % itens.length
      : (atual - 1 + itens.length) % itens.length;
    evento.preventDefault();
    itens[proximo].focus();
  }
}
