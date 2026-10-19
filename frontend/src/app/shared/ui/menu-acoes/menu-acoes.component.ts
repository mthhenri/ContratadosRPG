import {
  Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, output, signal, viewChild,
} from '@angular/core';

import { Icone } from '../../icone/icone.component';
import { Botao, type BotaoEstilo, type BotaoTamanho, type BotaoVariante } from '../botao/botao.component';

/** Uma ação do menu. `desabilitado` a mostra apagada e a pula na navegação. */
export interface MenuAcoesItem {
  readonly id: string;
  readonly rotulo: string;
  readonly descricao?: string;
  readonly desabilitado?: boolean;
}

/** Sequência para os `id` de `aria-controls` de cada menu. */
let sequenciaMenuAcoes = 0;

const MARGEM = 8;
const LARGURA_MINIMA = 220;
const ALTURA_MAXIMA = 320;

interface PosicaoMenuAcoes {
  readonly direita: number;
  readonly largura: number;
  readonly topo: number | null;
  readonly base: number | null;
}

/**
 * Primitivo de menu suspenso de ações (m11-09): um botão com seta que abre uma lista curta de ações
 * ancorada a ele — o "Publicar ▾" da Oficina das Regras. Diferente de `app-menu-insercao` (filtro e
 * escolha de um tipo), aqui não há campo: cada item é uma ação e o menu fecha ao escolher.
 *
 * Teclado: Enter/Espaço/↓ no botão abrem; ↑ ↓ Home End movem o item ativo; Enter/Espaço escolhem; Esc fecha e
 * devolve o foco ao botão; Tab e clique fora fecham. ARIA `menu`/`menuitem`. Abre abaixo do botão (acima, se
 * faltar espaço), com a borda direita alinhada à do botão, e acompanha rolagem e redimensionamento.
 */
@Component({
  selector: 'app-menu-acoes',
  imports: [Botao, Icone],
  templateUrl: './menu-acoes.component.html',
  styleUrl: './menu-acoes.component.scss',
})
export class MenuAcoes {
  readonly rotulo = input.required<string>();
  readonly itens = input.required<readonly MenuAcoesItem[]>();
  readonly variante = input<BotaoVariante>('primario');
  readonly estilo = input<BotaoEstilo | undefined>(undefined);
  readonly tamanho = input<BotaoTamanho>('pequeno');
  readonly desabilitado = input(false);
  readonly escolheu = output<string>();
  /** Sem gatilho visual, aberto explicitamente por abrirContextual(). */
  readonly contextual = input(false);
  readonly fechou = output<void>();
  private pontoContextual: { x: number; y: number } | null = null;
  private focoAnterior: HTMLElement | null = null;

  abrirContextual(x: number, y: number): void {
    if (!this.contextual()) return;
    this.pontoContextual = { x, y };
    this.focoAnterior = document.activeElement as HTMLElement | null;
    this.abrir(0);
  }

  protected readonly aberto = signal(false);
  protected readonly indiceAtivo = signal(-1);
  protected readonly posicao = signal<PosicaoMenuAcoes>({ direita: MARGEM, largura: LARGURA_MINIMA, topo: MARGEM, base: null });
  protected readonly menuId = `menu-acoes-${(sequenciaMenuAcoes += 1)}`;
  protected readonly habilitados = computed(() => this.itens()
    .map((item, indice) => ({ item, indice }))
    .filter(({ item }) => !item.desabilitado)
    .map(({ indice }) => indice));

  private readonly gatilho = viewChild('gatilho', { read: ElementRef<HTMLElement> });
  private readonly painel = viewChild('painel', { read: ElementRef<HTMLElement> });
  private readonly injector = inject(Injector);
  private readonly aoRolar = (): void => this.reposicionar();
  private readonly aoClicarFora = (evento: Event): void => {
    const alvo = evento.target as Node | null;
    if (!alvo || this.painel()?.nativeElement.contains(alvo) || this.gatilho()?.nativeElement.contains(alvo)) return;
    this.fechar(false);
  };

  constructor() {
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
    return `${this.menuId}-${indice}`;
  }

  protected alternar(): void {
    if (this.aberto()) this.fechar(true);
    else this.abrir(0);
  }

  /** Abre com o primeiro (`0`) ou o último (`-1`) item habilitado ativo. */
  private abrir(inicio: 0 | -1): void {
    const habilitados = this.habilitados();
    if (this.desabilitado() || habilitados.length === 0) return;
    this.indiceAtivo.set(inicio === 0 ? habilitados[0] : habilitados[habilitados.length - 1]);
    this.reposicionar();
    this.aberto.set(true);
    afterNextRender(() => {
      this.reposicionar();
      const painel = this.painel()?.nativeElement;
      if (this.contextual()) painel?.showPopover?.();
      painel?.focus();
    }, { injector: this.injector });
  }

  private fechar(devolverFoco: boolean): void {
    this.aberto.set(false);
    this.fechou.emit();
    if (devolverFoco && this.contextual()) this.focoAnterior?.focus();
    if (devolverFoco) this.gatilho()?.nativeElement.querySelector('button')?.focus();
  }

  private reposicionar(): void {
    if (this.pontoContextual && this.contextual()) {
      const largura = Math.min(LARGURA_MINIMA, window.innerWidth - 2 * MARGEM);
      const esquerda = Math.max(MARGEM, Math.min(this.pontoContextual.x, window.innerWidth - largura - MARGEM));
      const topo = Math.max(MARGEM, Math.min(this.pontoContextual.y, window.innerHeight - 160 - MARGEM));
      this.posicao.set({ direita: window.innerWidth - esquerda - largura, largura, topo, base: null });
      return;
    }
    const botao = this.gatilho()?.nativeElement;
    if (!botao) return;
    const retangulo = botao.getBoundingClientRect();
    const largura = Math.min(Math.max(LARGURA_MINIMA, retangulo.width), window.innerWidth - 2 * MARGEM);
    const direita = Math.max(MARGEM, window.innerWidth - retangulo.right);
    const abaixo = window.innerHeight - retangulo.bottom - MARGEM;
    const acima = retangulo.top - MARGEM;
    if (abaixo >= Math.min(ALTURA_MAXIMA, 160) || abaixo >= acima) {
      this.posicao.set({ direita, largura, topo: retangulo.bottom + 4, base: null });
    } else {
      this.posicao.set({ direita, largura, topo: null, base: window.innerHeight - retangulo.top + 4 });
    }
  }

  protected aoTeclarNoGatilho(evento: KeyboardEvent): void {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      this.abrir(0);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.abrir(-1);
    }
  }

  protected aoTeclarNoMenu(evento: KeyboardEvent): void {
    const habilitados = this.habilitados();
    const posicaoAtual = habilitados.indexOf(this.indiceAtivo());
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        this.indiceAtivo.set(habilitados[(posicaoAtual + 1) % habilitados.length]);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.indiceAtivo.set(habilitados[(posicaoAtual - 1 + habilitados.length) % habilitados.length]);
        break;
      case 'Home':
        evento.preventDefault();
        this.indiceAtivo.set(habilitados[0]);
        break;
      case 'End':
        evento.preventDefault();
        this.indiceAtivo.set(habilitados[habilitados.length - 1]);
        break;
      case 'Enter':
      case ' ':
        evento.preventDefault();
        this.escolher(this.itens()[this.indiceAtivo()]);
        break;
      case 'Escape':
        evento.preventDefault();
        this.fechar(true);
        break;
      case 'Tab':
        this.fechar(false);
        return;
      default:
        return;
    }
    evento.stopPropagation();
  }

  protected escolher(item: MenuAcoesItem | undefined): void {
    if (!item || item.desabilitado) return;
    if (this.contextual()) {
      this.escolheu.emit(item.id);
      this.fechar(false);
    } else {
      this.fechar(true);
      this.escolheu.emit(item.id);
    }
  }
}
