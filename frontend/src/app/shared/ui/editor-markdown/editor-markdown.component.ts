import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { Awareness } from 'y-protocols/awareness';
import type { Doc } from 'yjs';

import { Icone, type IconeNome } from '../../icone/icone.component';
import { Tooltip } from '../../tooltip/tooltip.directive';
import { Botao } from '../botao/botao.component';
import { BotaoIcone } from '../botao-icone/botao-icone.component';
import {
  EDITOR_MARKDOWN_FACTORY,
  type EditorMarkdownInstancia,
  LIMITE_MARKDOWN,
} from './editor-markdown-fabrica';
import {
  type AcaoMarkdown,
  ESTADO_EDITOR_MARKDOWN_INICIAL,
  type EstadoEditorMarkdown,
} from './editor-markdown-formatos';

export { EDITOR_MARKDOWN_FACTORY } from './editor-markdown-fabrica';

interface BotaoBarraMarkdown {
  readonly acao: AcaoMarkdown;
  readonly rotulo: string;
  readonly dica: string;
  readonly icone?: IconeNome;
  /** Glifo textual no lugar do ícone (H1, B, I…); `estilo` reproduz o efeito do próprio formato. */
  readonly glifo?: string;
  readonly estilo?: 'negrito' | 'italico';
  /** Alternância: mostra `aria-pressed`/destaque quando o formato está ativo no cursor. */
  readonly alterna?: boolean;
}

interface GrupoTabelaMarkdown {
  /**
   * Fora do celular a faixa de tabela é uma grade 4 × 2 (linha em cima, coluna embaixo); os grupos
   * laterais ("Texto abaixo", "Apagar tabela") ficam empilhados na 1ª coluna.
   */
  readonly lateral?: boolean;
  readonly acoes: readonly {
    readonly acao: AcaoMarkdown;
    readonly rotulo: string;
    readonly dica: string;
    readonly perigo?: boolean;
  }[];
}

/** Faixa visível dentro de tabela no celular — só cabe uma linha acima do teclado. */
type FaixaEmTabela = 'TABELA' | 'TEXTO';

/** Fora da rolagem lateral: depois de um erro, desfazer tem de estar à vista, sem procurar. */
const BOTOES_HISTORICO: readonly BotaoBarraMarkdown[] = [
  { acao: 'DESFAZER', rotulo: 'Desfazer', dica: 'Desfazer (Ctrl+Z)', icone: 'desfazer' },
  { acao: 'REFAZER', rotulo: 'Refazer', dica: 'Refazer (Ctrl+Y)', icone: 'refazer' },
];

const GRUPOS_BARRA: readonly (readonly BotaoBarraMarkdown[])[] = [
  [
    { acao: 'TITULO_1', rotulo: 'Título principal', dica: 'Título principal (H1)', glifo: 'H1', alterna: true },
    { acao: 'TITULO_2', rotulo: 'Subtítulo', dica: 'Subtítulo (H2)', glifo: 'H2', alterna: true },
  ],
  [
    { acao: 'NEGRITO', rotulo: 'Negrito', dica: 'Negrito (Ctrl+B)', glifo: 'B', estilo: 'negrito', alterna: true },
    { acao: 'ITALICO', rotulo: 'Itálico', dica: 'Itálico (Ctrl+I)', glifo: 'I', estilo: 'italico', alterna: true },
    {
      acao: 'CODIGO',
      rotulo: 'Código',
      dica: 'Código em linha. Para um bloco de código, digite ``` e espaço',
      glifo: '</>',
      alterna: true,
    },
  ],
  [
    { acao: 'LISTA', rotulo: 'Lista', dica: 'Lista com marcadores', glifo: '• —', alterna: true },
    { acao: 'LISTA_NUMERADA', rotulo: 'Lista numerada', dica: 'Lista numerada', glifo: '1.', alterna: true },
    {
      acao: 'CITACAO',
      rotulo: 'Citação',
      dica: 'Citação: destaca um trecho como fala ou referência',
      glifo: '“',
      alterna: true,
    },
  ],
  [{ acao: 'TABELA', rotulo: 'Inserir tabela', dica: 'Inserir tabela 3 × 3', icone: 'tabela' }],
];

// Ordem pelo uso no celular, onde a faixa rola de lado: sair da tabela primeiro (sem setas no
// teclado virtual é o único jeito de continuar escrevendo abaixo dela), apagar por último. Cada
// rótulo se explica sozinho ("Remover linha", não "Remover" sob um título "Linha"): no celular o
// título de grupo rolava para fora da tela e o botão ficava ambíguo.
const GRUPOS_TABELA: readonly GrupoTabelaMarkdown[] = [
  {
    lateral: true,
    acoes: [
      { acao: 'TABELA_SAIR', rotulo: 'Texto abaixo', dica: 'Continuar escrevendo abaixo da tabela' },
    ],
  },
  {
    acoes: [
      { acao: 'LINHA_ABAIXO', rotulo: '+ Linha abaixo', dica: 'Inserir linha abaixo' },
      { acao: 'LINHA_ACIMA', rotulo: '+ Linha acima', dica: 'Inserir linha acima' },
      { acao: 'LINHA_REMOVER', rotulo: 'Remover linha', dica: 'Remover a linha atual', perigo: true },
    ],
  },
  {
    acoes: [
      { acao: 'COLUNA_DIREITA', rotulo: '+ Coluna à direita', dica: 'Inserir coluna à direita' },
      { acao: 'COLUNA_ESQUERDA', rotulo: '+ Coluna à esquerda', dica: 'Inserir coluna à esquerda' },
      {
        acao: 'COLUNA_REMOVER',
        rotulo: 'Remover coluna',
        dica: 'Remover a coluna atual',
        perigo: true,
      },
    ],
  },
  {
    lateral: true,
    acoes: [
      { acao: 'TABELA_REMOVER', rotulo: 'Apagar tabela', dica: 'Apagar a tabela inteira', perigo: true },
    ],
  },
];

@Component({
  selector: 'app-editor-markdown',
  standalone: true,
  imports: [Botao, BotaoIcone, Icone, Tooltip],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorMarkdown),
      multi: true,
    },
  ],
  templateUrl: './editor-markdown.component.html',
  styleUrl: './editor-markdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'editor-markdown',
    '[class.editor-markdown--somente-leitura]': 'somenteLeituraEfetiva()',
    '[class.editor-markdown--compacto]': 'compacto()',
    '[class.editor-markdown--focado]': 'focado()',
    '[attr.aria-label]': 'rotuloAria()',
    '(scroll)': 'alterarPosicaoRolagem()',
    '(focusin)': 'aoFocar()',
    '(focusout)': 'aoDesfocar($event)',
  },
})
export class EditorMarkdown implements AfterViewInit, OnDestroy, ControlValueAccessor {
  readonly valor = input('');
  /** Documento Yjs da página do esquadrão; ausente no caderno privado. */
  readonly documentoColaborativo = input<Doc | null>(null);
  /** Presença Yjs (cursor/seleção remotos, P-039) da mesma página; ausente no caderno privado. */
  readonly awareness = input<Awareness | null>(null);
  readonly somenteLeitura = input(false);
  /**
   * `true` reduz padding/toolbar/`min-height` para caber num campo de formulário (Efeito
   * adicional, Descrição/Restrição de Habilidade) em vez de uma página inteira do Caderno.
   */
  readonly compacto = input(false);
  /**
   * `<app-editor-markdown>` não é um elemento de formulário nativo — um `<label>` em volta não
   * associa nada, e o `@angular-eslint/template/label-has-associated-control` reprova
   * (Efeito adicional/Descrição/Restrição). Este input é o nome acessível do campo, propagado
   * pro `aria-label` do próprio host; sem ele, cai no rótulo genérico do editor.
   */
  readonly rotulo = input<string | null>(null);
  protected readonly rotuloAria = computed(
    () =>
      this.rotulo() ??
      (this.somenteLeituraEfetiva() ? 'Conteúdo Markdown somente leitura' : 'Editor Markdown'),
  );
  readonly valorChange = output<string>();
  /**
   * Foco entra/sai do editor (texto ou barra). O caderno usa para tirar abas/busca da frente
   * enquanto se escreve no celular.
   */
  readonly focadoChange = output<boolean>();
  protected readonly botoesHistorico = BOTOES_HISTORICO;
  protected readonly gruposBarra = GRUPOS_BARRA;
  protected readonly gruposTabela = GRUPOS_TABELA;
  protected readonly estado = signal<EstadoEditorMarkdown>(ESTADO_EDITOR_MARKDOWN_INICIAL);
  protected readonly mostrarVoltarAoTopo = signal(false);
  /** Qual faixa aparece dentro de tabela no celular; volta a `TABELA` ao entrar numa tabela. */
  protected readonly faixaEmTabela = signal<FaixaEmTabela>('TABELA');
  /** Foco dentro do editor — no mobile é o que prende a barra acima do teclado virtual. */
  protected readonly focado = signal(false);

  private readonly criarEditor = inject(EDITOR_MARKDOWN_FACTORY);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private readonly barra = viewChild<ElementRef<HTMLElement>>('barra');
  private readonly faixas = viewChildren<ElementRef<HTMLElement>>('faixa');
  private instancia: EditorMarkdownInstancia | null = null;
  private sincronizando = false;
  private destruido = false;
  /** Até o `criar()` terminar, `obterMarkdown()` devolve o `valorInicial`, não o texto atual. */
  private criado = false;
  /** Distância atual entre o fim do containing block da barra ancorada e o fim da área visível. */
  private deslocamentoTeclado = 0;
  private ancorada = false;
  private alturaAncorada = 0;
  private readonly aoMudarViewport = (): void => this.atualizarAncoragem();

  /**
   * `writeValue`/`registerOnChange` (Reactive Forms — `formControlName="efeito"` em Ataque/
   * Habilidade) e `[valor]`/`(valorChange)` (Caderno) são dois modos de alimentar o mesmo
   * conteúdo; `usandoCva` decide qual dos dois é a fonte de verdade, travado assim que o Angular
   * chamar `writeValue` pela primeira vez (todo `FormControl` chama na montagem).
   */
  private readonly usandoCva = signal(false);
  private readonly valorCva = signal<string | null>(null);
  private readonly desabilitadoCva = signal(false);
  private onChange: ((valor: string) => void) | null = null;
  private onTouched: (() => void) | null = null;
  protected readonly valorEfetivo = computed(() =>
    this.usandoCva() ? this.valorCva() ?? '' : this.valor(),
  );
  protected readonly somenteLeituraEfetiva = computed(
    () => this.somenteLeitura() || this.desabilitadoCva(),
  );

  constructor() {
    effect(() => {
      const valor = this.valorEfetivo();
      const instancia = this.instancia;
      // No modo colaborativo o Y.Doc já está vinculado ao ProseMirror (bindXmlFragment) e é a
      // única fonte de verdade do conteúdo — `[valor]` aqui só ecoa o próprio `markdownUpdated`
      // do usuário local (`alterarConteudoMarkdown`), sempre um passo atrás do doc remoto que
      // acabou de chegar por Yjs. Aplicar `definirMarkdown` mesmo assim substitui (replaceAll) o
      // texto já sincronizado por esse eco desatualizado — apagando a edição concorrente.
      if (
        !instancia ||
        this.sincronizando ||
        this.documentoColaborativo() ||
        instancia.obterMarkdown() === valor
      ) {
        return;
      }
      this.sincronizando = true;
      instancia.definirMarkdown(valor);
      this.sincronizando = false;
    });
    effect(() => {
      const somenteLeitura = this.somenteLeituraEfetiva();
      this.instancia?.definirSomenteLeitura(somenteLeitura);
    });
    // A faixa de tabela aparecer/sumir muda a altura da barra ancorada; a largura das faixas
    // muda o indicador de "tem mais botões à direita".
    effect((aoLimpar) => {
      const barra = this.barra()?.nativeElement;
      if (!barra || typeof ResizeObserver === 'undefined') return;
      const observador = new ResizeObserver(() => {
        this.atualizarAncoragem();
        this.trazerBarraParaVista();
      });
      observador.observe(barra);
      aoLimpar(() => observador.disconnect());
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const instancia = this.criarEditor({
      raiz: this.raiz().nativeElement,
      valorInicial: this.valorEfetivo(),
      documentoColaborativo: this.documentoColaborativo(),
      awareness: this.awareness(),
      aoAlterar: (markdown) => this.propagarMarkdown(markdown),
      aoAlterarEstado: (estado) => {
        if (!estado.emTabela) this.faixaEmTabela.set('TABELA');
        this.estado.set(estado);
      },
    });
    this.instancia = instancia;
    await instancia.criar();
    if (this.destruido) {
      instancia.destruir();
      return;
    }
    // Mesmo cuidado do effect acima: no modo colaborativo o `.criar()` já deixou o Y.Doc
    // (com o conteúdo remoto que outros colaboradores já tenham escrito) vinculado ao
    // ProseMirror — sobrescrever aqui com `valorInicial` (o rascunho local, possivelmente
    // desatualizado) apagaria essa sincronização inicial.
    if (!this.documentoColaborativo() && instancia.obterMarkdown() !== this.valorEfetivo()) {
      instancia.definirMarkdown(this.valorEfetivo());
    }
    instancia.definirSomenteLeitura(this.somenteLeituraEfetiva());
    this.criado = true;
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.pararDeObservarViewport();
    this.instancia?.destruir();
    this.instancia = null;
  }

  writeValue(valor: string | null): void {
    this.usandoCva.set(true);
    this.valorCva.set(valor ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitadoCva.set(desabilitado);
  }

  /**
   * Lê o markdown atual do editor e o propaga agora (`valorChange`/CVA), sem esperar o
   * `markdownUpdated` do plugin `listener`, que é debounced (~200 ms): um "Salvar" clicado logo
   * depois da última tecla lia o rascunho sem o fim do texto (P-081). Quem confirma um rascunho
   * chama isto e usa o retorno; o `focusout` do próprio editor também chama, o que cobre os
   * formulários CVA.
   */
  confirmarValor(): string {
    if (!this.criado || !this.instancia) return this.valorEfetivo();
    const markdown = this.instancia.obterMarkdown();
    // Acima do limite o `listener` trunca o documento e emite depois; o retorno já sai truncado.
    if (markdown.length > LIMITE_MARKDOWN) return markdown.slice(0, LIMITE_MARKDOWN);
    this.propagarMarkdown(markdown);
    return markdown;
  }

  protected aplicarAcao(acao: AcaoMarkdown): void {
    if (!this.somenteLeituraEfetiva()) this.instancia?.aplicarAcao(acao);
  }

  protected estaAtivo(acao: AcaoMarkdown): boolean {
    return this.estado().ativos.has(acao);
  }

  protected estaDesabilitado(acao: AcaoMarkdown): boolean {
    const estado = this.estado();
    if (acao === 'DESFAZER') return !estado.podeDesfazer;
    if (acao === 'REFAZER') return !estado.podeRefazer;
    // O schema não aceita tabela dentro de célula.
    if (acao === 'TABELA') return estado.emTabela;
    return false;
  }

  protected alternarFaixaEmTabela(): void {
    this.faixaEmTabela.update((faixa) => (faixa === 'TABELA' ? 'TEXTO' : 'TABELA'));
  }

  protected alterarPosicaoRolagem(): void {
    this.mostrarVoltarAoTopo.set(this.host.nativeElement.scrollTop > 160);
  }

  protected voltarAoTopo(): void {
    this.host.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected aoFocar(): void {
    if (this.focado()) return;
    this.focado.set(true);
    this.focadoChange.emit(true);
    window.visualViewport?.addEventListener('resize', this.aoMudarViewport);
    window.visualViewport?.addEventListener('scroll', this.aoMudarViewport);
    window.addEventListener('resize', this.aoMudarViewport);
    // A classe `--focado` (que ancora a barra no mobile) só chega ao DOM na próxima renderização.
    requestAnimationFrame(() => {
      this.atualizarAncoragem();
      this.trazerBarraParaVista();
    });
  }

  protected aoDesfocar(evento: FocusEvent): void {
    const destino = evento.relatedTarget as Node | null;
    if (destino && this.host.nativeElement.contains(destino)) return;
    this.confirmarValor();
    this.focado.set(false);
    this.focadoChange.emit(false);
    this.pararDeObservarViewport();
    requestAnimationFrame(() => this.atualizarAncoragem());
  }

  /**
   * No mobile, com foco, a barra é `position: fixed; bottom: var(--editor-markdown-teclado)`.
   * O `fixed` é relativo ao containing block — que pode não ser a janela: o painel flutuante do
   * caderno tem `container-type`, que o torna containing block de descendentes `fixed`. Por isso
   * o deslocamento é medido (fim atual da barra + deslocamento atual = fim do containing block)
   * contra o fim da área visível (`visualViewport`, que encolhe com o teclado virtual), em vez
   * de supor `window.innerHeight`.
   */
  protected atualizarAncoragem(): void {
    const barra = this.barra()?.nativeElement;
    const estiloHost = (this.host.nativeElement as HTMLElement).style;
    const ancorada = !!barra && this.focado() && getComputedStyle(barra).position === 'fixed';
    if (!ancorada) {
      if (this.ancorada) {
        this.ancorada = false;
        this.deslocamentoTeclado = 0;
        this.alturaAncorada = 0;
        estiloHost.removeProperty('--editor-markdown-teclado');
        estiloHost.removeProperty('--editor-markdown-altura-barra');
        this.instancia?.definirMargemInferiorRolagem(0);
      }
      this.atualizarIndicadoresRolagem();
      return;
    }
    this.ancorada = true;
    const viewport = window.visualViewport;
    const fimVisivel = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const fimContainingBlock = barra.getBoundingClientRect().bottom + this.deslocamentoTeclado;
    this.deslocamentoTeclado = Math.max(0, Math.round(fimContainingBlock - fimVisivel));
    estiloHost.setProperty('--editor-markdown-teclado', `${this.deslocamentoTeclado}px`);
    const altura = barra.offsetHeight;
    if (altura !== this.alturaAncorada) {
      this.alturaAncorada = altura;
      estiloHost.setProperty('--editor-markdown-altura-barra', `${altura}px`);
      this.instancia?.definirMargemInferiorRolagem(altura);
    }
    this.atualizarIndicadoresRolagem();
  }

  /** Degradê na borda da faixa que ainda tem botões fora da vista (rolagem lateral no mobile). */
  protected atualizarIndicadoresRolagem(): void {
    for (const { nativeElement: faixa } of this.faixas()) {
      const temMaisNoFim = faixa.scrollLeft + faixa.clientWidth < faixa.scrollWidth - 1;
      faixa.classList.toggle('editor-markdown__faixa--mais-inicio', faixa.scrollLeft > 1);
      faixa.classList.toggle('editor-markdown__faixa--mais-fim', temMaisNoFim);
    }
  }

  /**
   * Campo curto: a barra fica embaixo do texto e aparece só com o campo em uso. Dentro de uma
   * lista que rola (ataques/habilidades de criatura), ao aparecer ou crescer (faixa de tabela) ela
   * ficava abaixo da parte visível do cartão — achado na POC. Fora do campo curto a barra é
   * `sticky`/ancorada e já está à vista.
   */
  private trazerBarraParaVista(): void {
    const barra = this.barra()?.nativeElement;
    if (!barra || !this.compacto() || !this.focado() || this.ancorada) return;
    barra.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  private propagarMarkdown(markdown: string): void {
    if (this.sincronizando || this.somenteLeituraEfetiva() || markdown === this.valorEfetivo()) {
      return;
    }
    if (this.usandoCva()) {
      this.valorCva.set(markdown);
      this.onChange?.(markdown);
      this.onTouched?.();
    }
    this.valorChange.emit(markdown);
  }

  private pararDeObservarViewport(): void {
    window.visualViewport?.removeEventListener('resize', this.aoMudarViewport);
    window.visualViewport?.removeEventListener('scroll', this.aoMudarViewport);
    window.removeEventListener('resize', this.aoMudarViewport);
  }
}
