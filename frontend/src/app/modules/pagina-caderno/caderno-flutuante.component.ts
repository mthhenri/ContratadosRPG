import { DOCUMENT, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { BuscaCampanhaResultadoDto } from '@contratados-rpg/shared/dtos/pagina-caderno';
import { PAGINA_CADERNO_CONTEUDO_MAXIMO } from '@contratados-rpg/shared/validators';
import {
  BuscaCampanhaFonteEnum,
  BuscaCampanhaResultadoTipoEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

import { Icone } from '../../shared/icone/icone.component';
import { Tooltip } from '../../shared/tooltip/tooltip.directive';
import { Botao } from '../../shared/ui/botao/botao.component';
import { TempoRealService } from '../../core/services/tempo-real.service';
import type { CadernoGeometria } from './caderno-flutuante.model';
import { CadernoFlutuanteStore } from './caderno-flutuante.store';
import { EditorMarkdown } from './editor-markdown.component';
import { PaginaCadernoService } from './pagina-caderno.service';
import { CadernoEsquadraoColaborativoService } from './caderno-esquadrao-colaborativo.service';
import {
  derivarTituloDeArquivo,
  normalizarMarkdownImportado,
  possuiFrontMatterYaml,
  type FalhaImportacaoMarkdown,
} from './importar-markdown';

const BREAKPOINT_MOBILE = 560;
const TAMANHO_MAXIMO_IMPORTACAO_BYTES = 1_000_000;
let proximoNivelJanela = 1210;

type ModoCaderno = 'MEU' | 'ESQUADRAO' | 'JOGADORES';

interface TrocaPaginaPendente {
  readonly paginaId: number | null;
}

@Component({
  selector: 'app-caderno-flutuante',
  standalone: true,
  imports: [Botao, DatePipe, EditorMarkdown, Icone, ReactiveFormsModule, Tooltip],
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
  readonly abrirFicha = output<number>();

  protected readonly store = inject(CadernoFlutuanteStore);
  private readonly api = inject(PaginaCadernoService);
  private readonly tempoReal = inject(TempoRealService);
  protected readonly colaboracaoEsquadrao = inject(CadernoEsquadraoColaborativoService);
  private readonly documento = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly estado = this.store.estado;
  protected readonly modoCaderno = signal<ModoCaderno>('MEU');
  protected readonly jogadorSelecionadoId = signal<number | null>(null);
  protected readonly exclusaoPendente = signal(false);
  protected readonly trocaPaginaPendente = signal<TrocaPaginaPendente | null>(null);
  protected readonly listaRecolhida = signal(false);
  protected readonly fontesSelecionadas = signal<readonly BuscaCampanhaFonteEnum[]>([]);
  protected readonly buscando = signal(false);
  protected readonly erroBusca = signal(false);
  protected readonly avisoImportacao = signal<{ texto: string; erro: boolean } | null>(null);
  private readonly termoBuscaAtual = signal('');
  protected readonly ehMobile = signal(this.verificarMobile());
  protected readonly maximizada = signal(false);
  protected readonly nivelJanela = signal(proximoNivelJanela);
  protected readonly semVagaInventario = computed(() => !this.ehMestre() || !this.temInventario());
  protected readonly jogadores = computed(() =>
    this.membros().filter((membro) => membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR),
  );
  protected readonly fontesPermitidas = computed<
    readonly { readonly valor: BuscaCampanhaFonteEnum; readonly rotulo: string }[]
  >(() =>
    this.ehMestre()
      ? [
          { valor: BuscaCampanhaFonteEnum.MEU_CADERNO, rotulo: 'Meu caderno' },
          { valor: BuscaCampanhaFonteEnum.CADERNO_ESQUADRAO, rotulo: 'Caderno do esquadrão' },
          {
            valor: BuscaCampanhaFonteEnum.CADERNOS_JOGADORES,
            rotulo: 'Cadernos dos jogadores',
          },
          { valor: BuscaCampanhaFonteEnum.FICHAS_CAMPANHA, rotulo: 'Fichas da campanha' },
        ]
      : [
          { valor: BuscaCampanhaFonteEnum.MEU_CADERNO, rotulo: 'Meu caderno' },
          { valor: BuscaCampanhaFonteEnum.CADERNO_ESQUADRAO, rotulo: 'Caderno do esquadrão' },
          { valor: BuscaCampanhaFonteEnum.MINHAS_FICHAS, rotulo: 'Minhas fichas' },
        ],
  );
  protected readonly somenteLeitura = computed(
    () => this.store.paginaAtiva()?.somenteLeitura ?? this.modoCaderno() === 'JOGADORES',
  );
  protected readonly rotuloSalvamento = computed(() => {
    const rotulos = {
      INATIVO: '',
      SALVANDO: 'Salvando…',
      SALVO: 'Salvo',
      FALHA: 'Falha ao salvar',
      CONFLITO: 'Conflito de versão',
    } as const;
    return rotulos[this.store.estadoSalvamento()];
  });
  protected readonly formulario = new FormGroup({
    titulo: new FormControl('', { nonNullable: true }),
    conteudoMarkdown: new FormControl('', { nonNullable: true }),
  });
  protected readonly termoBusca = new FormControl('', { nonNullable: true });
  protected readonly buscaAtiva = computed(() => this.termoBuscaAtual().trim().length > 0);

  private readonly janela = viewChild<ElementRef<HTMLElement>>('janela');
  private readonly cabecalho = viewChild<ElementRef<HTMLElement>>('cabecalho');
  private readonly gatilho = viewChild<ElementRef<HTMLButtonElement>>('gatilho');
  private abridorOriginal: HTMLElement | null = null;
  private geometriaAntesDeMaximizar: CadernoGeometria | null = null;
  private arrastando = false;
  private redimensionando = false;
  private origemArraste = { ponteiroX: 0, ponteiroY: 0, janelaX: 0, janelaY: 0 };
  private origemRedimensionamento = {
    ponteiroX: 0,
    ponteiroY: 0,
    geometria: { x: 0, y: 0, largura: 960, altura: 680 } as CadernoGeometria,
  };
  private readonly buscaSolicitada = new Subject<{
    readonly termo: string;
    readonly fontes: readonly BuscaCampanhaFonteEnum[];
    readonly pagina: number;
  }>();

  constructor() {
    effect(() => {
      const rascunho = this.store.rascunho();
      untracked(() => this.formulario.setValue(rascunho, { emitEvent: false }));
    });
    effect(() => {
      const pagina = this.colaboracaoEsquadrao.pagina();
      if (pagina) untracked(() => this.store.refletirPaginaColaborativa(pagina));
    });
    effect(() => {
      const titulo = this.colaboracaoEsquadrao.titulo();
      const pagina = this.colaboracaoEsquadrao.pagina();
      if (!pagina) return;
      untracked(() => {
        this.formulario.controls.titulo.setValue(titulo, { emitEvent: false });
        this.store.refletirPaginaColaborativa({ ...pagina, titulo });
      });
    });
    effect(() => {
      const titulo = this.colaboracaoEsquadrao.titulo();
      const pagina = this.colaboracaoEsquadrao.pagina();
      if (!pagina) return;
      untracked(() => {
        this.formulario.controls.titulo.setValue(titulo, { emitEvent: false });
        this.store.refletirPaginaColaborativa({ ...pagina, titulo });
      });
    });
    effect(() => {
      const fontes = this.fontesPermitidas().map((fonte) => fonte.valor);
      untracked(() => this.fontesSelecionadas.set(fontes));
    });
    effect(() => {
      const campanhaId = this.campanhaId();
      const campanhaAnterior = this.store.campanhaId();
      if (campanhaAnterior !== null && campanhaAnterior !== campanhaId) {
        untracked(() => {
          this.avisoImportacao.set(null);
          this.store.descartarCampanha();
          this.store.fechar();
        });
      }
    });
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rascunho) =>
        this.modoCaderno() === 'ESQUADRAO'
          ? this.colaboracaoEsquadrao.definirTitulo(rascunho.titulo ?? '')
          : this.store.alterarRascunho({
              titulo: rascunho.titulo ?? '',
              conteudoMarkdown: rascunho.conteudoMarkdown ?? '',
            }),
      );
    this.termoBusca.valueChanges
      .pipe(
        tap((termo) => this.termoBuscaAtual.set(termo)),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.solicitarBusca(1));
    this.buscaSolicitada
      .pipe(
        switchMap(({ termo, fontes, pagina }) => {
          this.buscando.set(true);
          this.erroBusca.set(false);
          return this.api
            .buscarCampanha({
              campanhaId: this.campanhaId(),
              termo,
              fontes,
              pagina,
              limite: 20,
            })
            .pipe(
              catchError(() => {
                this.erroBusca.set(true);
                return of({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 });
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        this.buscando.set(false);
        this.store.definirResultados(resultado);
      });
    this.tempoReal.paginaEsquadraoCriada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pagina) => {
        if (this.modoCaderno() === 'ESQUADRAO' && pagina.campanhaId === this.campanhaId()) {
          this.store.refletirResumoColaborativo(pagina);
        }
      });
    this.tempoReal.paginaEsquadraoAlterada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (this.modoCaderno() === 'ESQUADRAO' && evento.campanhaId === this.campanhaId()) {
          this.store.refletirResumoColaborativo(evento.pagina);
        }
      });
    this.tempoReal.paginaEsquadraoExcluida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (this.modoCaderno() === 'ESQUADRAO' && evento.campanhaId === this.campanhaId()) {
          this.store.removerPaginaColaborativa(evento.paginaId);
        }
      });
  }

  ngOnDestroy(): void {
    this.colaboracaoEsquadrao.fechar();
    this.store.descartarCampanha();
  }

  protected abrir(): void {
    this.abridorOriginal = this.documento.activeElement as HTMLElement | null;
    this.store.abrir(this.campanhaId());
    this.trazerParaFrente();
    setTimeout(() => this.cabecalho()?.nativeElement.focus());
  }

  protected minimizar(): void {
    this.store.minimizar();
    setTimeout(() => this.gatilho()?.nativeElement.focus());
  }

  protected alternarMaximizacao(): void {
    if (this.ehMobile()) return;
    if (this.maximizada()) {
      if (this.geometriaAntesDeMaximizar) {
        this.store.alterarGeometria(
          reduzirGeometriaRestaurada(this.geometriaAntesDeMaximizar, this.viewport()),
          this.viewport(),
        );
      }
      this.geometriaAntesDeMaximizar = null;
      this.maximizada.set(false);
      return;
    }
    this.geometriaAntesDeMaximizar = this.estado().geometria;
    const viewport = this.viewport();
    this.store.alterarGeometria(
      { x: 0, y: 0, largura: viewport.largura, altura: viewport.altura },
      viewport,
    );
    this.maximizada.set(true);
  }

  protected restaurar(): void {
    this.store.restaurar();
    this.trazerParaFrente();
    setTimeout(() => this.cabecalho()?.nativeElement.focus());
  }

  protected fechar(): void {
    this.exclusaoPendente.set(false);
    this.maximizada.set(false);
    this.geometriaAntesDeMaximizar = null;
    this.store.fechar();
    const destino = this.abridorOriginal;
    setTimeout(() => destino?.isConnected && destino.focus());
    this.abridorOriginal = null;
  }

  protected selecionarModo(modo: ModoCaderno): void {
    if (modo === this.modoCaderno()) return;
    this.store.salvarAgora();
    this.modoCaderno.set(modo);
    this.jogadorSelecionadoId.set(null);
    this.exclusaoPendente.set(false);
    this.avisoImportacao.set(null);
    this.colaboracaoEsquadrao.fechar();
    if (modo === 'MEU') this.store.carregarMeuCaderno();
    else if (modo === 'ESQUADRAO') this.carregarCadernoEsquadrao();
    else this.store.iniciarNovaPagina();
    this.store.definirVistaMobile('LISTA');
  }

  protected selecionarJogador(evento: Event): void {
    const valor = Number((evento.target as HTMLSelectElement).value);
    this.jogadorSelecionadoId.set(Number.isInteger(valor) && valor > 0 ? valor : null);
    if (this.jogadorSelecionadoId() !== null) {
      this.store.carregarCadernoMembro(this.campanhaId(), this.jogadorSelecionadoId()!);
    }
  }

  protected selecionarPagina(id: number): void {
    this.exclusaoPendente.set(false);
    this.avisoImportacao.set(null);
    const paginaId = this.store.paginaAtiva()?.id === id ? null : id;
    if (this.store.temAlteracoesNaoSalvas()) {
      this.store.definirVistaMobile('CONTEUDO');
      this.trocaPaginaPendente.set({ paginaId });
      return;
    }
    this.executarTrocaPagina(paginaId);
  }

  protected alternarLista(): void {
    this.listaRecolhida.update((recolhida) => !recolhida);
  }

  protected iniciarNovaPagina(): void {
    this.exclusaoPendente.set(false);
    this.avisoImportacao.set(null);
    this.listaRecolhida.set(true);
    if (this.modoCaderno() === 'ESQUADRAO') this.colaboracaoEsquadrao.criar(this.campanhaId());
    else this.store.iniciarNovaPagina();
    setTimeout(() => this.documento.querySelector<HTMLInputElement>('.caderno__titulo-input')?.focus());
  }

  protected async aoSelecionarArquivo(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    if (!arquivo) return;
    this.avisoImportacao.set(null);
    if (!/\.(?:md|markdown)$/iu.test(arquivo.name)) {
      this.definirFalhaImportacao('EXTENSAO');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_IMPORTACAO_BYTES) {
      this.definirFalhaImportacao('TAMANHO');
      return;
    }
    const texto = await arquivo.text();
    const frontMatterRemovido = possuiFrontMatterYaml(texto);
    const conteudoMarkdown = normalizarMarkdownImportado(texto);
    if (conteudoMarkdown.length > PAGINA_CADERNO_CONTEUDO_MAXIMO) {
      this.definirFalhaImportacao('TAMANHO');
      return;
    }
    if (!conteudoMarkdown) {
      this.definirFalhaImportacao('VAZIO');
      return;
    }
    this.store.importarPagina({
      titulo: derivarTituloDeArquivo(arquivo.name),
      conteudoMarkdown,
    });
    this.avisoImportacao.set({
      texto: `Importado de "${arquivo.name}".${frontMatterRemovido ? ' Front matter removido.' : ''}`,
      erro: false,
    });
    setTimeout(() => this.documento.querySelector<HTMLInputElement>('.caderno__titulo-input')?.focus());
  }

  private definirFalhaImportacao(falha: FalhaImportacaoMarkdown): void {
    const textos = {
      EXTENSAO: 'Formato inválido: envie um arquivo .md',
      TAMANHO: 'Arquivo maior que o limite da página (100.000 caracteres)',
      VAZIO: 'O arquivo não tem conteúdo',
    } as const;
    this.avisoImportacao.set({ texto: textos[falha], erro: true });
  }

  protected alterarConteudoMarkdown(conteudoMarkdown: string): void {
    if (this.modoCaderno() === 'ESQUADRAO') {
      this.colaboracaoEsquadrao.definirConteudoMarkdown(conteudoMarkdown);
      const pagina = this.store.paginaAtiva();
      if (pagina) this.store.refletirPaginaColaborativa({ ...pagina, conteudoMarkdown });
      return;
    }
    this.formulario.controls.conteudoMarkdown.setValue(conteudoMarkdown);
  }

  /** Inicial exibida no indicador de presença (P-039) — nome completo vai só na tooltip. */
  protected iniciaisDoParticipante(nome: string): string {
    return nome.trim().charAt(0).toUpperCase() || '?';
  }

  protected salvar(): void {
    if (this.modoCaderno() !== 'ESQUADRAO') this.store.salvarAgora();
  }

  protected recarregarVersao(): void {
    this.store.recarregarPaginaAtiva();
  }

  protected pedirExclusao(): void {
    this.exclusaoPendente.set(true);
  }

  protected cancelarExclusao(): void {
    this.exclusaoPendente.set(false);
  }

  protected confirmarDescarteDeRascunho(): void {
    const troca = this.trocaPaginaPendente();
    if (!troca) return;
    this.trocaPaginaPendente.set(null);
    this.store.desselecionarPagina();
    this.executarTrocaPagina(troca.paginaId);
  }

  protected cancelarDescarteDeRascunho(): void {
    this.trocaPaginaPendente.set(null);
  }

  protected confirmarExclusao(): void {
    this.exclusaoPendente.set(false);
    const pagina = this.store.paginaAtiva();
    if (this.modoCaderno() === 'ESQUADRAO' && pagina) {
      this.api.excluirPaginaEsquadrao(pagina.id).subscribe({
        next: () => {
          this.colaboracaoEsquadrao.fechar();
          this.store.removerPaginaColaborativa(pagina.id);
        },
      });
      return;
    }
    this.store.excluirPaginaAtiva();
  }

  protected voltarParaPaginas(): void {
    this.store.definirVistaMobile('LISTA');
  }

  private executarTrocaPagina(paginaId: number | null): void {
    if (paginaId === null) {
      this.colaboracaoEsquadrao.fechar();
      this.store.desselecionarPagina();
    } else if (this.modoCaderno() === 'ESQUADRAO') this.colaboracaoEsquadrao.abrir(paginaId);
    else this.store.recuperarPagina(paginaId);
  }

  private carregarCadernoEsquadrao(): void {
    this.api.listarPaginasEsquadrao(this.campanhaId()).subscribe({
      next: (paginas) => this.store.definirPaginasColaborativas(paginas),
    });
  }

  protected fonteSelecionada(fonte: BuscaCampanhaFonteEnum): boolean {
    return this.fontesSelecionadas().includes(fonte);
  }

  protected alterarFonte(fonte: BuscaCampanhaFonteEnum, evento: Event): void {
    const selecionada = (evento.target as HTMLInputElement).checked;
    this.fontesSelecionadas.update((fontes) =>
      selecionada
        ? [...new Set([...fontes, fonte])]
        : fontes.filter((item) => item !== fonte),
    );
    this.solicitarBusca(1);
  }

  protected solicitarBusca(pagina: number): void {
    const termo = this.termoBusca.value.trim();
    const fontes = this.fontesSelecionadas();
    if (!termo || fontes.length === 0) {
      this.buscando.set(false);
      this.erroBusca.set(false);
      this.store.limparResultados();
      return;
    }
    this.buscaSolicitada.next({ termo, fontes, pagina });
  }

  protected selecionarResultado(resultado: BuscaCampanhaResultadoDto): void {
    if (resultado.tipo === BuscaCampanhaResultadoTipoEnum.ANOTACAO_FICHA) {
      this.abrirFicha.emit(resultado.id);
      return;
    }
    this.termoBusca.setValue('', { emitEvent: false });
    this.termoBuscaAtual.set('');
    this.store.limparResultados();
    this.store.recuperarPagina(resultado.id);
  }

  protected trazerParaFrente(): void {
    proximoNivelJanela += 1;
    this.nivelJanela.set(proximoNivelJanela);
  }

  protected iniciarArraste(evento: PointerEvent): void {
    if (
      this.ehMobile() ||
      this.maximizada() ||
      evento.button !== 0 ||
      this.alvoEhControle(evento.target)
    ) return;
    const retangulo = this.janela()?.nativeElement.getBoundingClientRect();
    if (!retangulo) return;
    evento.preventDefault();
    this.arrastando = true;
    this.origemArraste = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      janelaX: retangulo.left,
      janelaY: retangulo.top,
    };
  }

  protected iniciarRedimensionamento(evento: PointerEvent): void {
    if (this.ehMobile() || this.maximizada() || evento.button !== 0) return;
    evento.preventDefault();
    this.redimensionando = true;
    this.origemRedimensionamento = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      geometria: this.estado().geometria,
    };
  }

  protected aoMoverPonteiro(evento: PointerEvent): void {
    if (this.arrastando) {
      this.store.alterarGeometria(
        {
          ...this.estado().geometria,
          x: this.origemArraste.janelaX + evento.clientX - this.origemArraste.ponteiroX,
          y: this.origemArraste.janelaY + evento.clientY - this.origemArraste.ponteiroY,
        },
        this.viewport(),
      );
    } else if (this.redimensionando) {
      this.store.alterarGeometria(
        {
          ...this.origemRedimensionamento.geometria,
          largura:
            this.origemRedimensionamento.geometria.largura +
            evento.clientX -
            this.origemRedimensionamento.ponteiroX,
          altura:
            this.origemRedimensionamento.geometria.altura +
            evento.clientY -
            this.origemRedimensionamento.ponteiroY,
        },
        this.viewport(),
      );
    }
  }

  protected encerrarInteracao(): void {
    this.arrastando = false;
    this.redimensionando = false;
  }

  protected aoRedimensionarViewport(): void {
    this.ehMobile.set(this.verificarMobile());
    if (this.maximizada() && !this.ehMobile()) {
      const viewport = this.viewport();
      this.store.alterarGeometria(
        { x: 0, y: 0, largura: viewport.largura, altura: viewport.altura },
        viewport,
      );
    } else if (!this.ehMobile()) {
      this.store.alterarGeometria(this.estado().geometria, this.viewport());
    }
  }

  protected aoTecladoJanela(evento: KeyboardEvent): void {
    if (evento.key !== 'Escape' || !this.janela()?.nativeElement.contains(evento.target as Node)) {
      return;
    }
    evento.preventDefault();
    this.fechar();
  }

  private alvoEhControle(alvo: EventTarget | null): boolean {
    return alvo instanceof Element && Boolean(alvo.closest('button, a, input, select, textarea'));
  }

  private verificarMobile(): boolean {
    return typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE}px)`).matches
      : window.innerWidth <= BREAKPOINT_MOBILE;
  }

  private viewport(): { largura: number; altura: number } {
    return { largura: window.innerWidth, altura: window.innerHeight };
  }
}

function reduzirGeometriaRestaurada(
  geometria: CadernoGeometria,
  viewport: { largura: number; altura: number },
): CadernoGeometria {
  if (geometria.largura < viewport.largura * 0.9 && geometria.altura < viewport.altura * 0.9) {
    return geometria;
  }
  const largura = 800;
  const altura = 800;
  return {
    x: Math.round((viewport.largura - largura) / 2),
    y: Math.round((viewport.altura - altura) / 2),
    largura,
    altura,
  };
}
