import {
  Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, output,
  signal, untracked, viewChild,
} from '@angular/core';

import { Icone } from '../../icone/icone.component';
import { BotaoIcone } from '../botao-icone/botao-icone.component';
import { Campo } from '../campo/campo.component';
import { Modal } from '../modal/modal.component';
import {
  ancestraisDe, filtrarPaleta, linhasVisiveisArvore, type PaletaItem, type PaletaLinha,
  type PaletaNo,
} from './paleta';

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
 *
 * Com `[arvore]`, a consulta vazia mostra a hierarquia recolhida (chevron ou → ← abrem e fecham;
 * o caminho até `[idAtivo]` já nasce aberto); com termo digitado volta à lista plana filtrada de
 * `[itens]`. Sem `[arvore]` é só a lista plana.
 */
@Component({
  selector: 'app-paleta',
  imports: [Modal, Campo, BotaoIcone, Icone],
  templateUrl: './paleta.component.html',
  styleUrl: './paleta.component.scss',
})
export class Paleta {
  readonly aberto = input.required<boolean>();
  readonly itens = input.required<readonly PaletaItem[]>();
  /** Hierarquia opcional exibida enquanto não há termo digitado. */
  readonly arvore = input<readonly PaletaNo[]>();
  /** Id da seção atual: o caminho até ele nasce aberto e o item vem selecionado. */
  readonly idAtivo = input<string>();
  readonly titulo = input('Ir para…');
  readonly placeholder = input('Digite para filtrar…');
  readonly vazio = input('Nada encontrado.');

  readonly escolheu = output<string>();
  readonly fechou = output<void>();

  protected readonly consulta = signal('');
  protected readonly indiceAtivo = signal(0);
  protected readonly listaId = `paleta-lista-${(sequenciaPaleta += 1)}`;
  protected readonly abertos = signal<ReadonlySet<string>>(new Set());
  protected readonly emArvore = computed(() => !!this.arvore() && !this.consulta().trim());
  protected readonly linhas = computed<PaletaLinha[]>(() =>
    this.emArvore() ? linhasVisiveisArvore(this.arvore()!, this.abertos()) : []);
  protected readonly visiveis = computed(() =>
    filtrarPaleta(this.itens(), this.consulta()).slice(0, LIMITE_VISIVEL));
  /** Posições navegáveis agora: linhas da árvore ou itens filtrados. */
  protected readonly total = computed(() =>
    this.emArvore() ? this.linhas().length : this.visiveis().length);

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');
  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      if (!this.aberto()) return;
      const arvore = this.arvore();
      untracked(() => {
        this.consulta.set('');
        const ativo = this.idAtivo();
        this.abertos.set(new Set(arvore && ativo ? ancestraisDe(arvore, ativo) : []));
        this.indiceAtivo.set(Math.max(0, this.linhas().findIndex((l) => l.id === ativo)));
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
    const total = this.total();
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
      case 'ArrowRight':
      case 'ArrowLeft':
        if (!this.emArvore()) return;
        evento.preventDefault();
        this.moverNaArvore(evento.key === 'ArrowRight');
        break;
      case 'Enter':
        evento.preventDefault();
        this.escolher((this.emArvore() ? this.linhas() : this.visiveis())[this.indiceAtivo()]);
        break;
      default:
        return;
    }
    evento.stopPropagation();
  }

  protected escolher(item: { readonly id: string } | undefined): void {
    if (item) this.escolheu.emit(item.id);
  }

  protected alternar(id: string): void {
    this.abertos.update((atuais) => {
      const proximos = new Set(atuais);
      if (!proximos.delete(id)) proximos.add(id);
      return proximos;
    });
  }

  /** → abre o nó (já aberto, vai ao primeiro filho); ← fecha (fechado ou folha, vai ao pai). */
  private moverNaArvore(avancar: boolean): void {
    const linhas = this.linhas();
    const indice = this.indiceAtivo();
    const linha = linhas[indice];
    if (!linha) return;
    if (avancar) {
      if (!linha.temFilhos) return;
      if (!linha.aberto) this.alternar(linha.id);
      else this.indiceAtivo.set(indice + 1);
    } else if (linha.aberto) {
      this.alternar(linha.id);
    } else if (linha.paiId !== null) {
      this.indiceAtivo.set(linhas.findIndex((outra) => outra.id === linha.paiId));
    }
  }
}
