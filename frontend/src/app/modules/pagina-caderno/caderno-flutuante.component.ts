import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';

import { Icone } from '../../shared/icone/icone.component';
import { Tooltip } from '../../shared/tooltip/tooltip.directive';
import { BotaoIcone } from '../../shared/ui/botao-icone/botao-icone.component';
import {
  PainelFlutuante,
  type PainelFlutuantePosicao,
} from '../../shared/ui/painel-flutuante/painel-flutuante.component';
import { type CadernoTamanho, consultarCadernoMobile } from './caderno-flutuante.model';
import { CadernoFlutuanteStore } from './caderno-flutuante.store';
import { CadernoConteudo } from './caderno-conteudo.component';
import { CadernoEsquadraoColaborativoService } from './caderno-esquadrao-colaborativo.service';
import { CadernoJanelaService } from './caderno-janela.service';
import { CadernoSalvamento } from './caderno-salvamento.component';

/**
 * Caderno da campanha em painel flutuante: gatilho, janela arrastável, maximizar e redimensionar.
 * O corpo é `CadernoConteudo`, o mesmo da janela externa (I-027); enquanto o Caderno da campanha
 * está aberto em janela externa nesta aba, o painel sai da tela e os pedidos de abertura focam a
 * janela.
 */
@Component({
  selector: 'app-caderno-flutuante',
  standalone: true,
  imports: [BotaoIcone, CadernoConteudo, CadernoSalvamento, Icone, PainelFlutuante, Tooltip],
  providers: [CadernoFlutuanteStore, CadernoEsquadraoColaborativoService],
  templateUrl: './caderno-flutuante.component.html',
  styleUrl: './caderno-flutuante.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pointermove)': 'aoMoverPonteiro($event)',
    '(window:pointerup)': 'encerrarInteracao()',
    '(window:pointercancel)': 'encerrarInteracao()',
    '(window:resize)': 'aoRedimensionarViewport()',
  },
})
export class CadernoFlutuante implements OnDestroy {
  readonly campanhaId = input.required<number>();
  readonly campanhaNome = input.required<string>();
  readonly usuarioAtivoId = input.required<number>();
  readonly ehMestre = input.required<boolean>();
  readonly membros = input.required<readonly CampanhaMembroResumoDto[]>();
  /**
   * `false` nas telas sem `InventarioEsquadraoSidebar` (Iniciativa) — a vaga 2 da pilha de
   * utilitários nunca existe ali, mestre ou jogador, então o caderno sempre a assume. Default
   * `true` preserva o comportamento na campanha, onde o mestre vê o inventário e o jogador não.
   */
  readonly temInventario = input(true);
  /**
   * `false` esconde o círculo `.utilitario-flutuante` próprio (`campanha-detalhe-mestre-coluna-
   * acoes.spec.md`) — usado só pelo mestre da campanha, que abre por um item de `app-coluna-acoes`
   * (via {@link abrir}) em vez do gatilho flutuante. `true` por padrão: os outros consumidores
   * continuam com o gatilho próprio, fora do escopo dessa migração.
   */
  readonly mostrarGatilho = input(true);
  readonly abrirFicha = output<number>();

  /**
   * Posição inicial da janela — desloca pra longe da coluna esquerda (`app-coluna-acoes`) quando
   * `mostrarGatilho` é `false`: o padrão `{ x: 80, y: 72 }` fica embaixo da própria coluna de
   * ações nesse caso, e o item que abre o caderno (e fecharia de novo) fica atrás da janela —
   * mesmo achado ao vivo desta task já corrigido em `CalculadoraFlutuante`.
   */
  protected readonly posicaoInicial = computed<PainelFlutuantePosicao>(() =>
    this.mostrarGatilho() ? { x: 80, y: 72 } : { x: 280, y: 72 },
  );

  /** Mesmo racional de `posicaoInicial` acima, mas cobrindo também uma posição já persistida de
   *  antes desse desvio existir — ver `PainelFlutuante.pisoX`. */
  protected readonly pisoX = computed(() => (this.mostrarGatilho() ? 0 : 220));

  protected readonly store = inject(CadernoFlutuanteStore);
  private readonly colaboracaoEsquadrao = inject(CadernoEsquadraoColaborativoService);
  private readonly janelaCaderno = inject(CadernoJanelaService);
  protected readonly estado = this.store.estado;
  /** O Caderno desta campanha está aberto em janela externa nesta aba (I-027). */
  protected readonly recolhido = computed(() => this.janelaCaderno.estaAberta(this.campanhaId()));
  /**
   * Janela do caderno aberta (mesmo minimizada) — marca o item da coluna de ações da tela. Recolhido
   * para a janela externa, deixa de marcar: o painel não está na tela.
   */
  readonly aberto = computed(() => this.estado().aberto && !this.recolhido());
  protected readonly ehMobile = signal(consultarCadernoMobile());
  protected readonly maximizada = signal(false);
  protected readonly semVagaInventario = computed(() => !this.ehMestre() || !this.temInventario());

  protected readonly painelRef = viewChild<PainelFlutuante>('painel');
  private readonly gatilho = viewChild<ElementRef<HTMLButtonElement>>('gatilho');
  private tamanhoAntesDeMaximizar: CadernoTamanho | null = null;
  private posicaoAntesDeMaximizar: PainelFlutuantePosicao | null = null;
  private redimensionando = false;
  private origemRedimensionamento = {
    ponteiroX: 0,
    ponteiroY: 0,
    tamanho: { largura: 960, altura: 680 } as CadernoTamanho,
  };

  constructor() {
    effect(() => {
      const campanhaId = this.campanhaId();
      const campanhaAnterior = this.store.campanhaId();
      if (campanhaAnterior !== null && campanhaAnterior !== campanhaId) {
        untracked(() => {
          this.store.descartarCampanha();
          this.store.fechar();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.colaboracaoEsquadrao.fechar();
    this.store.descartarCampanha();
  }

  /** Abre a janela — pública (não `protected`) para que um consumidor externo dispare a abertura
   *  via referência de template, mesmo padrão de `FichaFlutuante.abrir()` (ex.: o item "Caderno"
   *  da coluna de ações do mestre da campanha, que substitui o gatilho flutuante próprio). Com o
   *  Caderno em janela externa, foca a janela em vez de abrir o painel. */
  abrir(): void {
    if (this.recolhido()) {
      this.janelaCaderno.abrir(this.campanhaId());
      return;
    }
    this.store.abrir(this.campanhaId());
  }

  /**
   * Abre se fechado, fecha se aberto — mas se estiver aberto **minimizado**, restaura em vez de
   * fechar (senão o clique fecha uma janela que já estava escondida, sem nunca mostrar nada:
   * `store.estado().aberto` continua `true` enquanto só minimizado, então o toggle simples caía
   * direto em `fechar()` — achado ao vivo, o mesmo defeito que `CalculadoraFlutuante.alternar()`
   * já evitava checando `painelRef()?.minimizado()`, e que faltava aqui). Mesmo padrão de toggle.
   * Com o Caderno em janela externa, foca a janela.
   */
  alternar(): void {
    if (this.recolhido()) {
      this.janelaCaderno.abrir(this.campanhaId());
      return;
    }
    if (this.store.estado().aberto && this.painelRef()?.minimizado()) {
      this.painelRef()?.restaurar();
      return;
    }
    if (this.store.estado().aberto) {
      this.fechar();
    } else {
      this.abrir();
    }
  }

  /**
   * Síncrono no `(click)` — senão o navegador bloqueia o pop-up. O rascunho pendente vai para a API
   * antes: a janela lista as páginas por conta própria.
   */
  protected abrirEmJanela(): void {
    this.store.salvarAgora();
    this.janelaCaderno.abrir(this.campanhaId());
  }

  protected aoMinimizadoChange(minimizado: boolean): void {
    if (minimizado) setTimeout(() => this.gatilho()?.nativeElement?.focus());
  }

  protected alternarMaximizacao(): void {
    if (this.ehMobile()) return;
    const painel = this.painelRef();
    if (this.maximizada()) {
      const viewport = this.viewport();
      if (this.tamanhoAntesDeMaximizar) {
        const precisaReduzir = precisaReduzirTamanho(this.tamanhoAntesDeMaximizar, viewport);
        const tamanhoRestaurado = precisaReduzir
          ? { largura: 800, altura: 800 }
          : this.tamanhoAntesDeMaximizar;
        this.store.alterarTamanho(tamanhoRestaurado, viewport);
        const posicaoRestaurada = precisaReduzir
          ? {
              x: Math.round((viewport.largura - tamanhoRestaurado.largura) / 2),
              y: Math.round((viewport.altura - tamanhoRestaurado.altura) / 2),
            }
          : this.posicaoAntesDeMaximizar;
        if (posicaoRestaurada) painel?.moverPara(posicaoRestaurada);
      }
      this.tamanhoAntesDeMaximizar = null;
      this.posicaoAntesDeMaximizar = null;
      this.maximizada.set(false);
      return;
    }
    this.tamanhoAntesDeMaximizar = this.estado().tamanho;
    this.posicaoAntesDeMaximizar = painel?.obterPosicaoAtual() ?? null;
    const viewport = this.viewport();
    this.store.alterarTamanho({ largura: viewport.largura, altura: viewport.altura }, viewport);
    painel?.moverPara({ x: 0, y: 0 }, { persistir: false });
    this.maximizada.set(true);
  }

  protected fechar(): void {
    this.maximizada.set(false);
    this.tamanhoAntesDeMaximizar = null;
    this.posicaoAntesDeMaximizar = null;
    this.store.fechar();
  }

  protected iniciarRedimensionamento(evento: PointerEvent): void {
    if (this.ehMobile() || this.maximizada() || evento.button !== 0) return;
    const retangulo = this.painelRef()?.obterElemento()?.getBoundingClientRect();
    if (!retangulo) return;
    evento.preventDefault();
    this.redimensionando = true;
    this.origemRedimensionamento = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      tamanho: { largura: retangulo.width, altura: retangulo.height },
    };
  }

  protected aoMoverPonteiro(evento: PointerEvent): void {
    if (!this.redimensionando) return;
    this.store.alterarTamanho(
      {
        largura:
          this.origemRedimensionamento.tamanho.largura +
          evento.clientX -
          this.origemRedimensionamento.ponteiroX,
        altura:
          this.origemRedimensionamento.tamanho.altura +
          evento.clientY -
          this.origemRedimensionamento.ponteiroY,
      },
      this.viewport(),
    );
  }

  protected encerrarInteracao(): void {
    this.redimensionando = false;
  }

  protected aoRedimensionarViewport(): void {
    this.ehMobile.set(consultarCadernoMobile());
    if (this.ehMobile()) return;
    const viewport = this.viewport();
    if (this.maximizada()) {
      this.store.alterarTamanho({ largura: viewport.largura, altura: viewport.altura }, viewport);
    } else {
      this.store.alterarTamanho(this.estado().tamanho, viewport);
    }
  }

  private viewport(): { largura: number; altura: number } {
    return { largura: window.innerWidth, altura: window.innerHeight };
  }
}

function precisaReduzirTamanho(
  tamanho: CadernoTamanho,
  viewport: { largura: number; altura: number },
): boolean {
  return tamanho.largura >= viewport.largura * 0.9 || tamanho.altura >= viewport.altura * 0.9;
}
