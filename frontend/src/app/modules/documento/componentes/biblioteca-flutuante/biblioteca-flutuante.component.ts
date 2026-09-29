import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import {
  PainelFlutuante,
  type PainelFlutuantePosicao,
} from '../../../../shared/ui/painel-flutuante/painel-flutuante.component';
import { BibliotecaLeituraStore } from '../../biblioteca-leitura.store';
import { podeRevelarDocumento } from '../../documento-revelacao.service';
import { BibliotecaCorpo } from '../biblioteca-corpo/biblioteca-corpo.component';
import { LeitorDocumento } from '../leitor-documento/leitor-documento.component';

/** Tamanho da janela — posição e minimizado são de `app-painel-flutuante` (`id="biblioteca"`). */
interface BibliotecaTamanho {
  readonly largura: number;
  readonly altura: number;
}

const TAMANHO_STORAGE_KEY = 'contratados-rpg:biblioteca-geometria:v1';
const TAMANHO_PADRAO: BibliotecaTamanho = { largura: 960, altura: 680 };
/** Mínimo próprio: abaixo de 800px de janela o corpo já troca para uma vista por vez. */
const LARGURA_MINIMA = 440;
/**
 * Faixa da coluna de ações (o `pisoX` de 220px + respiro) que a janela não cobre fora do
 * maximizado: na tela dividida (960px), a janela de 960px cobriria o item que a fecha.
 */
const RESERVA_COLUNA_ACOES = 240;
const ALTURA_MINIMA = 480;
/** O mesmo `$bp-mobile` do tema e dos outros painéis (Caderno, Leitor): abaixo, folha cheia. */
const BREAKPOINT_MOBILE = 560;

/**
 * Biblioteca da campanha em painel flutuante (m9-11) — para ler e buscar sem sair da tela, como o
 * Caderno e a Calculadora. Casca do `CadernoFlutuante`: sem gatilho próprio (abre pelo item da
 * coluna de ações via {@link abrir}/{@link alternar}), posição inicial fora da coluna, maximizar,
 * redimensionar pelo canto e folha cheia no celular. O corpo é o `BibliotecaCorpo`, o mesmo da
 * página, e o estado é o `BibliotecaLeituraStore` — na forma mestre para quem mestra.
 *
 * **Sob demanda:** nada é pedido ao backend nem ao gateway até a primeira abertura; a tela que
 * nunca abre a Biblioteca não faz nenhuma requisição de documento. Depois disso a store vive com o
 * painel (e com a tela que o hospeda): fechar só pausa a presença de leitura, e reabrir mostra o
 * mesmo aberto.
 *
 * O mestre lê qualquer documento e alterna Revelar/Ocultar; criar, editar, reordenar, remover e
 * trocar imagem ficam na página, aberta pelo botão "Abrir página da Biblioteca" do cabeçalho.
 */
@Component({
  selector: 'app-biblioteca-flutuante',
  imports: [
    Icone,
    Tooltip,
    Botao,
    BotaoIcone,
    EstadoVazio,
    PainelFlutuante,
    BibliotecaCorpo,
    LeitorDocumento,
  ],
  providers: [BibliotecaLeituraStore],
  templateUrl: './biblioteca-flutuante.component.html',
  styleUrl: './biblioteca-flutuante.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pointermove)': 'aoMoverPonteiro($event)',
    '(window:pointerup)': 'encerrarInteracao()',
    '(window:pointercancel)': 'encerrarInteracao()',
    '(window:resize)': 'aoRedimensionarViewport()',
  },
})
export class BibliotecaFlutuante {
  readonly campanhaId = input.required<number>();
  readonly campanhaNome = input.required<string>();
  /** O papel vem da tela hospedeira, que já o conhece — o painel não lista membros de novo. */
  readonly ehMestre = input.required<boolean>();
  /**
   * Destino do botão "Abrir página da Biblioteca" — o espectador tem a rota própria (m9-12), e a de
   * mestre/jogador o devolveria à campanha. Sem valor, `/campanhas/:id/documentos`.
   */
  readonly paginaRota = input<readonly (string | number)[] | null>(null);

  protected readonly store = inject(BibliotecaLeituraStore);
  private readonly roteador = inject(Router);

  private readonly abertoInterno = signal(false);
  /** A store só é iniciada na primeira abertura (montagem sob demanda). */
  protected readonly iniciado = signal(false);
  /** Janela aberta (mesmo minimizada) — marca o item da coluna de ações da tela. */
  readonly aberto = this.abertoInterno.asReadonly();

  protected readonly ehMobile = signal(consultarMobile());
  protected readonly maximizada = signal(false);
  protected readonly tamanho = signal<BibliotecaTamanho>(carregarTamanho());
  /**
   * Fora da coluna de ações (o item que fecharia a janela não fica atrás dela), como o Caderno — e
   * em cascata com ele (`{ x: 280, y: 72 }`): abertos juntos, os dois cabeçalhos ficam à vista.
   */
  protected readonly posicaoInicial: PainelFlutuantePosicao = { x: 320, y: 112 };

  protected readonly podeRevelar = computed(() => podeRevelarDocumento(this.store.aberto()));

  protected readonly painelRef = viewChild<PainelFlutuante>('painel');
  private tamanhoAntesDeMaximizar: BibliotecaTamanho | null = null;
  private posicaoAntesDeMaximizar: PainelFlutuantePosicao | null = null;
  private redimensionando = false;
  private origemRedimensionamento = { ponteiroX: 0, ponteiroY: 0, tamanho: TAMANHO_PADRAO };

  /** Abre a janela — chamado pelo item "Biblioteca" da coluna de ações (ou do menu "⋯"). */
  abrir(): void {
    if (!this.iniciado()) {
      this.store.iniciar(this.campanhaId(), { mestre: this.ehMestre() });
      this.iniciado.set(true);
    }
    this.store.retomarLeitura();
    // O tamanho salvo pode ser de um viewport maior (a tela dividida, por exemplo).
    if (!this.ehMobile() && !this.maximizada()) this.alterarTamanho(this.tamanho(), false);
    this.abertoInterno.set(true);
  }

  /**
   * Abre se fechada, fecha se aberta — e, aberta minimizada, restaura em vez de fechar (o mesmo
   * cuidado de `CadernoFlutuante.alternar()`: senão o clique fecharia uma janela escondida).
   */
  alternar(): void {
    if (this.abertoInterno() && this.painelRef()?.minimizado()) {
      this.painelRef()?.restaurar();
      return;
    }
    if (this.abertoInterno()) {
      this.fechar();
    } else {
      this.abrir();
    }
  }

  protected fechar(): void {
    this.maximizada.set(false);
    this.tamanhoAntesDeMaximizar = null;
    this.posicaoAntesDeMaximizar = null;
    this.abertoInterno.set(false);
    this.store.pausarLeitura();
  }

  /** A página tem a gestão (criar, editar, ordem, imagem); a tela hospedeira sai com o painel. */
  protected abrirPagina(): void {
    void this.roteador.navigate([
      ...(this.paginaRota() ?? ['/campanhas', this.campanhaId(), 'documentos']),
    ]);
  }

  protected alternarMaximizacao(): void {
    if (this.ehMobile()) return;
    const painel = this.painelRef();
    const viewport = this.viewport();
    if (this.maximizada()) {
      if (this.tamanhoAntesDeMaximizar) {
        const precisaReduzir = precisaReduzirTamanho(this.tamanhoAntesDeMaximizar, viewport);
        const tamanhoRestaurado = precisaReduzir ? TAMANHO_PADRAO : this.tamanhoAntesDeMaximizar;
        this.alterarTamanho(tamanhoRestaurado);
        const posicaoRestaurada = precisaReduzir
          ? {
              x: Math.max(0, Math.round((viewport.largura - tamanhoRestaurado.largura) / 2)),
              y: Math.max(0, Math.round((viewport.altura - tamanhoRestaurado.altura) / 2)),
            }
          : this.posicaoAntesDeMaximizar;
        if (posicaoRestaurada) painel?.moverPara(posicaoRestaurada);
      }
      this.tamanhoAntesDeMaximizar = null;
      this.posicaoAntesDeMaximizar = null;
      this.maximizada.set(false);
      return;
    }
    this.tamanhoAntesDeMaximizar = this.tamanho();
    this.posicaoAntesDeMaximizar = painel?.obterPosicaoAtual() ?? null;
    this.alterarTamanho({ largura: viewport.largura, altura: viewport.altura }, false, true);
    painel?.moverPara({ x: 0, y: 0 }, { persistir: false });
    this.maximizada.set(true);
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
    const origem = this.origemRedimensionamento;
    this.alterarTamanho({
      largura: origem.tamanho.largura + evento.clientX - origem.ponteiroX,
      altura: origem.tamanho.altura + evento.clientY - origem.ponteiroY,
    });
  }

  protected encerrarInteracao(): void {
    this.redimensionando = false;
  }

  protected aoRedimensionarViewport(): void {
    this.ehMobile.set(consultarMobile());
    if (this.ehMobile()) return;
    const viewport = this.viewport();
    if (this.maximizada()) {
      this.alterarTamanho({ largura: viewport.largura, altura: viewport.altura }, false, true);
    } else {
      this.alterarTamanho(this.tamanho());
    }
  }

  /**
   * Limita ao mínimo próprio e ao viewport — menos a faixa da coluna de ações, se sobrar largura
   * para o mínimo, exceto maximizada. `persistir=false` no maximizado (tamanho provisório).
   */
  private alterarTamanho(tamanho: BibliotecaTamanho, persistir = true, maximizando = false): void {
    const viewport = this.viewport();
    const semColuna = viewport.largura - RESERVA_COLUNA_ACOES;
    const larguraMaxima =
      maximizando || semColuna < LARGURA_MINIMA ? viewport.largura : semColuna;
    const limitado = {
      largura: limitar(tamanho.largura, LARGURA_MINIMA, larguraMaxima),
      altura: limitar(tamanho.altura, ALTURA_MINIMA, viewport.altura),
    };
    this.tamanho.set(limitado);
    if (persistir) persistirTamanho(limitado);
  }

  private viewport(): BibliotecaTamanho {
    return { largura: window.innerWidth, altura: window.innerHeight };
  }
}

function consultarMobile(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE}px)`).matches
    : window.innerWidth <= BREAKPOINT_MOBILE;
}

function precisaReduzirTamanho(tamanho: BibliotecaTamanho, viewport: BibliotecaTamanho): boolean {
  return tamanho.largura >= viewport.largura * 0.9 || tamanho.altura >= viewport.altura * 0.9;
}

/** O viewport vence o mínimo: numa janela menor que o mínimo, a janela cabe na tela. */
function limitar(valor: number, minimo: number, maximo: number): number {
  const seguro = Number.isFinite(valor) ? valor : minimo;
  return Math.round(Math.min(Math.max(seguro, minimo), Math.max(maximo, 0)));
}

function carregarTamanho(): BibliotecaTamanho {
  try {
    const valor = globalThis.localStorage?.getItem(TAMANHO_STORAGE_KEY);
    if (valor) {
      const tamanho = JSON.parse(valor) as Partial<BibliotecaTamanho>;
      if (
        [tamanho.largura, tamanho.altura].every(
          (dimensao) => typeof dimensao === 'number' && Number.isFinite(dimensao),
        )
      ) {
        return { largura: tamanho.largura!, altura: tamanho.altura! };
      }
    }
  } catch {
    // Preferência local inválida ou indisponível: usa o tamanho padrão.
  }
  return TAMANHO_PADRAO;
}

function persistirTamanho(tamanho: BibliotecaTamanho): void {
  try {
    globalThis.localStorage?.setItem(TAMANHO_STORAGE_KEY, JSON.stringify(tamanho));
  } catch {
    // A janela continua funcional quando o armazenamento local está indisponível.
  }
}
