import {
  Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, output,
  signal, untracked, viewChild,
} from '@angular/core';

import { filtrarMenuInsercao, type MenuInsercaoOpcao } from './menu-insercao';

/** Sequência para os `id` de `aria-controls`/`aria-activedescendant` de cada menu. */
let sequenciaMenu = 0;

/** Por que o menu pediu para fechar: `teclado` (Esc/Tab) devolve o foco a quem abriu; `fora` (clique) não. */
export type MenuInsercaoMotivo = 'teclado' | 'fora';

const MARGEM = 12;
const LARGURA_MAXIMA = 320;
const ALTURA_PREFERIDA = 340;
const ESPACO_DA_ANCORA = 6;

interface PosicaoMenu {
  readonly esquerda: number;
  readonly largura: number;
  readonly alturaMaxima: number;
  readonly topo: number | null;
  readonly base: number | null;
}

/**
 * Primitivo de menu de inserção (m11-07): um popover ancorado a um elemento, com campo de filtro e
 * lista de opções navegável por teclado. Serve ao "+" entre as peças e ao "/" numa linha vazia da
 * Oficina. Genérico: recebe `[opcoes]` e `[ancora]`, emite `(escolheu)` com o `id` e `(fechou)`;
 * quem hospeda decide o que a opção faz e fecha pelo próprio `[aberto]` (controlado).
 *
 * Abre abaixo da âncora (ou acima, se faltar espaço) e acompanha rolagem e redimensionamento. O foco
 * vai ao campo ao abrir. Teclado: ↑ ↓ Home End movem a opção ativa, Enter escolhe, Esc e Tab fecham.
 * Clique fora fecha. As teclas não sobem do campo, para o atalho de uma página não as receber por engano.
 */
@Component({
  selector: 'app-menu-insercao',
  templateUrl: './menu-insercao.component.html',
  styleUrl: './menu-insercao.component.scss',
})
export class MenuInsercao {
  readonly aberto = input.required<boolean>();
  readonly opcoes = input.required<readonly MenuInsercaoOpcao[]>();
  /** Elemento junto do qual o menu abre (o botão "+" ou o campo do "/"). */
  readonly ancora = input<HTMLElement | null>(null);
  readonly titulo = input('Inserir peça');
  readonly placeholder = input('Filtrar… (ex.: nota)');
  readonly vazio = input('Nada encontrado.');

  readonly escolheu = output<string>();
  readonly fechou = output<MenuInsercaoMotivo>();

  protected readonly consulta = signal('');
  protected readonly indiceAtivo = signal(0);
  protected readonly posicao = signal<PosicaoMenu>({
    esquerda: MARGEM, largura: LARGURA_MAXIMA, alturaMaxima: ALTURA_PREFERIDA, topo: MARGEM, base: null,
  });
  protected readonly listaId = `menu-insercao-lista-${(sequenciaMenu += 1)}`;
  protected readonly visiveis = computed(() => filtrarMenuInsercao(this.opcoes(), this.consulta()));

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');
  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');
  private readonly painel = viewChild<ElementRef<HTMLElement>>('painel');
  private readonly injector = inject(Injector);
  private readonly aoRolar = (): void => this.reposicionar();
  private readonly aoClicarFora = (evento: Event): void => {
    const alvo = evento.target as Node | null;
    if (!alvo || this.painel()?.nativeElement.contains(alvo) || this.ancora()?.contains(alvo)) return;
    this.fechou.emit('fora');
  };

  constructor() {
    effect(() => {
      if (!this.aberto()) return;
      untracked(() => {
        this.consulta.set('');
        this.indiceAtivo.set(0);
        this.reposicionar();
        afterNextRender(() => {
          this.reposicionar();
          this.campo()?.nativeElement.focus();
        }, { injector: this.injector });
      });
    });
    effect(() => {
      this.ancora();
      this.opcoes();
      if (this.aberto()) untracked(() => this.reposicionar());
    });
    effect(() => {
      this.indiceAtivo();
      untracked(() => afterNextRender(() => this.lista()?.nativeElement
        .querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }),
      { injector: this.injector }));
    });
    // Ouvintes só enquanto aberto: o menu fica no DOM de cada slot da Oficina.
    effect((aoLimpar) => {
      if (!this.aberto()) return;
      window.addEventListener('scroll', this.aoRolar, true);
      window.addEventListener('resize', this.aoRolar);
      document.addEventListener('pointerdown', this.aoClicarFora, true);
      aoLimpar(() => {
        window.removeEventListener('scroll', this.aoRolar, true);
        window.removeEventListener('resize', this.aoRolar);
        document.removeEventListener('pointerdown', this.aoClicarFora, true);
      });
    });
  }

  protected id(indice: number): string {
    return `${this.listaId}-${indice}`;
  }

  /** Posiciona abaixo da âncora, ou acima quando falta espaço; no celular ocupa a largura da tela. */
  private reposicionar(): void {
    const ancora = this.ancora();
    const largura = Math.min(LARGURA_MAXIMA, window.innerWidth - 2 * MARGEM);
    if (!ancora) {
      this.posicao.set({
        esquerda: (window.innerWidth - largura) / 2, largura, alturaMaxima: ALTURA_PREFERIDA, topo: MARGEM * 4, base: null,
      });
      return;
    }
    const retangulo = ancora.getBoundingClientRect();
    const esquerda = Math.max(MARGEM, Math.min(retangulo.left, window.innerWidth - largura - MARGEM));
    const abaixo = window.innerHeight - retangulo.bottom - ESPACO_DA_ANCORA - MARGEM;
    const acima = retangulo.top - ESPACO_DA_ANCORA - MARGEM;
    if (abaixo >= Math.min(ALTURA_PREFERIDA, 220) || abaixo >= acima) {
      this.posicao.set({
        esquerda, largura, alturaMaxima: Math.min(ALTURA_PREFERIDA, Math.max(abaixo, 120)),
        topo: retangulo.bottom + ESPACO_DA_ANCORA, base: null,
      });
    } else {
      this.posicao.set({
        esquerda, largura, alturaMaxima: Math.min(ALTURA_PREFERIDA, Math.max(acima, 120)),
        topo: null, base: window.innerHeight - retangulo.top + ESPACO_DA_ANCORA,
      });
    }
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
      case 'Escape':
      case 'Tab':
        if (evento.key === 'Escape') evento.preventDefault();
        this.fechou.emit('teclado');
        break;
      default:
        return;
    }
    evento.stopPropagation();
  }

  protected escolher(opcao: MenuInsercaoOpcao | undefined): void {
    if (opcao) this.escolheu.emit(opcao.id);
  }
}
