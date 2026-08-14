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
import { DomSanitizer } from '@angular/platform-browser';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { BuscaCampanhaResultadoDto } from '@contratados-rpg/shared/dtos/pagina-caderno';
import {
  BuscaCampanhaFonteEnum,
  BuscaCampanhaResultadoTipoEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

import { Icone } from '../../shared/icone/icone.component';
import { renderizarMarkdownSeguro } from './markdown-seguro';
import type { CadernoGeometria } from './caderno-flutuante.model';
import { CadernoFlutuanteStore } from './caderno-flutuante.store';
import { PaginaCadernoService } from './pagina-caderno.service';

const BREAKPOINT_MOBILE = 560;
let proximoNivelJanela = 1210;

type ModoCaderno = 'MEU' | 'JOGADORES';
type ModoEditor = 'EDITAR' | 'VISUALIZAR';

@Component({
  selector: 'app-caderno-flutuante',
  standalone: true,
  imports: [DatePipe, Icone, ReactiveFormsModule],
  providers: [CadernoFlutuanteStore],
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
  readonly abrirFicha = output<number>();

  protected readonly store = inject(CadernoFlutuanteStore);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly api = inject(PaginaCadernoService);
  private readonly documento = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly estado = this.store.estado;
  protected readonly modoCaderno = signal<ModoCaderno>('MEU');
  protected readonly modoEditor = signal<ModoEditor>('EDITAR');
  protected readonly jogadorSelecionadoId = signal<number | null>(null);
  protected readonly exclusaoPendente = signal(false);
  protected readonly listaRecolhida = signal(false);
  protected readonly fontesSelecionadas = signal<readonly BuscaCampanhaFonteEnum[]>([]);
  protected readonly buscando = signal(false);
  protected readonly erroBusca = signal(false);
  private readonly termoBuscaAtual = signal('');
  protected readonly ehMobile = signal(this.verificarMobile());
  protected readonly nivelJanela = signal(proximoNivelJanela);
  protected readonly jogadores = computed(() =>
    this.membros().filter((membro) => membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR),
  );
  protected readonly fontesPermitidas = computed<
    readonly { readonly valor: BuscaCampanhaFonteEnum; readonly rotulo: string }[]
  >(() =>
    this.ehMestre()
      ? [
          { valor: BuscaCampanhaFonteEnum.MEU_CADERNO, rotulo: 'Meu caderno' },
          {
            valor: BuscaCampanhaFonteEnum.CADERNOS_JOGADORES,
            rotulo: 'Cadernos dos jogadores',
          },
          { valor: BuscaCampanhaFonteEnum.FICHAS_CAMPANHA, rotulo: 'Fichas da campanha' },
        ]
      : [
          { valor: BuscaCampanhaFonteEnum.MEU_CADERNO, rotulo: 'Meu caderno' },
          { valor: BuscaCampanhaFonteEnum.MINHAS_FICHAS, rotulo: 'Minhas fichas' },
        ],
  );
  protected readonly somenteLeitura = computed(
    () => this.store.paginaAtiva()?.somenteLeitura ?? this.modoCaderno() === 'JOGADORES',
  );
  protected readonly markdownRenderizado = computed(() =>
    renderizarMarkdownSeguro(this.store.rascunho().conteudoMarkdown, this.sanitizer),
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
      const fontes = this.fontesPermitidas().map((fonte) => fonte.valor);
      untracked(() => this.fontesSelecionadas.set(fontes));
    });
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
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rascunho) =>
        this.store.alterarRascunho({
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
  }

  ngOnDestroy(): void {
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

  protected restaurar(): void {
    this.store.restaurar();
    this.trazerParaFrente();
    setTimeout(() => this.cabecalho()?.nativeElement.focus());
  }

  protected fechar(): void {
    this.exclusaoPendente.set(false);
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
    this.modoEditor.set('EDITAR');
    if (modo === 'MEU') this.store.carregarMeuCaderno();
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
    this.modoEditor.set('EDITAR');
    this.store.recuperarPagina(id);
  }

  protected alternarLista(): void {
    this.listaRecolhida.update((recolhida) => !recolhida);
  }

  protected iniciarNovaPagina(): void {
    this.exclusaoPendente.set(false);
    this.modoEditor.set('EDITAR');
    this.store.iniciarNovaPagina();
    setTimeout(() => this.documento.querySelector<HTMLInputElement>('.caderno__titulo-input')?.focus());
  }

  protected definirModoEditor(modo: ModoEditor): void {
    this.modoEditor.set(modo);
  }

  protected salvar(): void {
    this.store.salvarAgora();
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

  protected confirmarExclusao(): void {
    this.exclusaoPendente.set(false);
    this.store.excluirPaginaAtiva();
  }

  protected voltarParaPaginas(): void {
    this.store.definirVistaMobile('LISTA');
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
    if (this.ehMobile() || evento.button !== 0 || this.alvoEhControle(evento.target)) return;
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
    if (this.ehMobile() || evento.button !== 0) return;
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
    if (!this.ehMobile()) this.store.alterarGeometria(this.estado().geometria, this.viewport());
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
