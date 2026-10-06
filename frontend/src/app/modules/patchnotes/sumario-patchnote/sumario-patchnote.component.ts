import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Router } from '@angular/router';

import type { PatchnoteCapitulo } from '../patchnote-formato';

/**
 * Sumário "Nesta versão" de uma nota (pn-09): os grupos viram rótulos mono em caixa alta e os blocos,
 * itens com o título completo. Só apresenta — a rolagem e o fragmento da URL são da página, que recebe
 * `navegar`. Local dos patchnotes por decisão do autor: vira `app-sumario` em `shared/ui/` se um
 * segundo uso aparecer. O item ativo (`aria-current="location"`) é mantido visível dentro do trilho
 * que o contém (`[data-rolagem-sumario]`), sem rolar a página.
 */
@Component({
  selector: 'app-sumario-patchnote',
  templateUrl: './sumario-patchnote.component.html',
  styleUrl: './sumario-patchnote.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SumarioPatchnote {
  readonly capitulos = input.required<readonly PatchnoteCapitulo[]>();
  readonly versao = input.required<string>();
  /** Id do capítulo que a leitura alcançou; `null` antes do primeiro. */
  readonly ativo = input<string | null>(null);
  readonly navegar = output<string>();

  private readonly router = inject(Router);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injetor = inject(Injector);

  /** Grupo realçado: o do capítulo ativo, ou o próprio capítulo quando ele é um grupo. */
  protected readonly grupoAtivo = computed(() => {
    const ativo = this.ativo();
    return (
      this.capitulos().find(
        (capitulo) => capitulo.id === ativo || capitulo.filhos.some((filho) => filho.id === ativo),
      )?.id ?? null
    );
  });

  constructor() {
    effect(() => {
      if (this.ativo()) {
        afterNextRender(() => this.manterAtivoVisivel(), { injector: this.injetor });
      }
    });
  }

  protected href(id: string): string {
    return this.router.serializeUrl(
      this.router.createUrlTree(['/patchnotes', this.versao()], { fragment: id }),
    );
  }

  protected aoClicar(evento: MouseEvent, id: string): void {
    // Clique com modificador (nova aba) segue o href; o normal é rolagem suave da página.
    if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.button !== 0) {
      return;
    }
    evento.preventDefault();
    this.navegar.emit(id);
  }

  private manterAtivoVisivel(): void {
    const item = this.elemento.nativeElement.querySelector<HTMLElement>('[aria-current="location"]');
    const trilho = this.elemento.nativeElement.closest<HTMLElement>('[data-rolagem-sumario]');
    if (!item || !trilho) {
      return;
    }
    const caixaItem = item.getBoundingClientRect();
    const caixaTrilho = trilho.getBoundingClientRect();
    if (caixaItem.top < caixaTrilho.top) {
      trilho.scrollTop -= caixaTrilho.top - caixaItem.top + 8;
    } else if (caixaItem.bottom > caixaTrilho.bottom) {
      trilho.scrollTop += caixaItem.bottom - caixaTrilho.bottom + 8;
    }
  }
}
