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
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../shared/icone/icone.component';
import { renderizarMarkdownSeguro } from './markdown-seguro';
import type { CadernoGeometria } from './caderno-flutuante.model';
import { CadernoFlutuanteStore } from './caderno-flutuante.store';

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
  private readonly documento = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly estado = this.store.estado;
  protected readonly modoCaderno = signal<ModoCaderno>('MEU');
  protected readonly modoEditor = signal<ModoEditor>('EDITAR');
  protected readonly jogadorSelecionadoId = signal<number | null>(null);
  protected readonly exclusaoPendente = signal(false);
  protected readonly ehMobile = signal(this.verificarMobile());
  protected readonly nivelJanela = signal(proximoNivelJanela);
  protected readonly jogadores = computed(() =>
    this.membros().filter((membro) => membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR),
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

  constructor() {
    effect(() => {
      const rascunho = this.store.rascunho();
      untracked(() => this.formulario.setValue(rascunho, { emitEvent: false }));
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
