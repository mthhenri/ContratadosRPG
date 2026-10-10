import {
  Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, output,
  signal, untracked, viewChild,
} from '@angular/core';

import { Campo } from '../campo/campo.component';
import { Modal } from '../modal/modal.component';
import { filtrarPaleta, type PaletaItem } from './paleta';

/** Sequência para os `id` de `aria-controls`/`aria-activedescendant` de cada paleta. */
let sequenciaPaleta = 0;

/** Itens exibidos de uma vez; o termo afunila o resto. */
const LIMITE_VISIVEL = 80;

/**
 * Primitivo de paleta ("Ir para…", Ctrl+K): campo de busca e lista navegável por teclado sobre o
 * `app-modal`. Genérico: recebe `[itens]` e emite `(escolheu)` com o `id`; quem hospeda decide o
 * que fazer e fecha pelo próprio `[aberto]`. Controlado, como o resto da biblioteca.
 *
 * Teclado: ↑ ↓ Home End movem o item ativo, Enter escolhe, Esc fecha (pelo modal). As teclas
 * não sobem do campo: um leitor com atalhos próprios na página não as recebe por engano.
 */
@Component({
  selector: 'app-paleta',
  imports: [Modal, Campo],
  templateUrl: './paleta.component.html',
  styleUrl: './paleta.component.scss',
})
export class Paleta {
  readonly aberto = input.required<boolean>();
  readonly itens = input.required<readonly PaletaItem[]>();
  readonly titulo = input('Ir para…');
  readonly placeholder = input('Digite para filtrar…');
  readonly vazio = input('Nada encontrado.');

  readonly escolheu = output<string>();
  readonly fechou = output<void>();

  protected readonly consulta = signal('');
  protected readonly indiceAtivo = signal(0);
  protected readonly listaId = `paleta-lista-${(sequenciaPaleta += 1)}`;
  protected readonly visiveis = computed(() =>
    filtrarPaleta(this.itens(), this.consulta()).slice(0, LIMITE_VISIVEL));

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');
  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      if (!this.aberto()) return;
      untracked(() => {
        this.consulta.set('');
        this.indiceAtivo.set(0);
        // O modal pousa o foco no próprio `<dialog>`; a paleta quer o cursor no campo.
        afterNextRender(() => this.campo()?.nativeElement.focus(), { injector: this.injector });
      });
    });
    effect(() => {
      this.indiceAtivo();
      untracked(() => afterNextRender(() => this.lista()?.nativeElement
        .querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }),
      { injector: this.injector }));
    });
  }

  protected id(indice: number): string {
    return `${this.listaId}-${indice}`;
  }

  protected digitar(evento: Event): void {
    this.consulta.set((evento.target as HTMLInputElement).value);
    this.indiceAtivo.set(0);
  }

  protected tratarTecla(evento: KeyboardEvent): void {
    const total = this.visiveis().length;
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        if (total) this.indiceAtivo.update((i) => (i + 1) % total);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        if (total) this.indiceAtivo.update((i) => (i - 1 + total) % total);
        break;
      case 'Home':
        evento.preventDefault();
        this.indiceAtivo.set(0);
        break;
      case 'End':
        evento.preventDefault();
        if (total) this.indiceAtivo.set(total - 1);
        break;
      case 'Enter':
        evento.preventDefault();
        this.escolher(this.visiveis()[this.indiceAtivo()]);
        break;
      default:
        return;
    }
    evento.stopPropagation();
  }

  protected escolher(item: PaletaItem | undefined): void {
    if (item) this.escolheu.emit(item.id);
  }
}
