import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  InjectionToken,
  OnDestroy,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  rootCtx,
} from '@milkdown/kit/core';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { collab, collabServiceCtx } from '@milkdown/plugin-collab';
import {
  addColAfterCommand,
  addRowAfterCommand,
  deleteSelectedCellsCommand,
  gfm,
  insertTableCommand,
  selectColCommand,
  selectRowCommand,
} from '@milkdown/kit/preset/gfm';
import { isInTable, selectionCell, TableMap } from '@milkdown/kit/prose/tables';
import {
  commonmark,
  createCodeBlockCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark';
import { callCommand, getMarkdown, replaceAll } from '@milkdown/kit/utils';
import type { Awareness } from 'y-protocols/awareness';
import type { Doc } from 'yjs';

import { Icone } from '../../icone/icone.component';
import { Tooltip } from '../../tooltip/tooltip.directive';

type FormatoMarkdown =
  | 'TEXTO'
  | 'TITULO_1'
  | 'TITULO_2'
  | 'NEGRITO'
  | 'ITALICO'
  | 'LISTA'
  | 'LISTA_NUMERADA'
  | 'CITACAO'
  | 'CODIGO'
  | 'TABELA'
  | 'LINHA_ADICIONAR'
  | 'LINHA_REMOVER'
  | 'COLUNA_ADICIONAR'
  | 'COLUNA_REMOVER';

const LIMITE_MARKDOWN = 100_000;

interface EditorMarkdownOpcoes {
  readonly raiz: HTMLElement;
  readonly valorInicial: string;
  readonly documentoColaborativo: Doc | null;
  /** Presença Yjs (cursor/seleção remotos) do modo colaborativo; ausente no caderno privado. */
  readonly awareness: Awareness | null;
  readonly aoAlterar: (markdown: string) => void;
}

interface EditorMarkdownInstancia {
  criar(): Promise<void>;
  destruir(): void;
  obterMarkdown(): string;
  definirMarkdown(markdown: string): void;
  definirSomenteLeitura(somenteLeitura: boolean): void;
  aplicarFormato(formato: FormatoMarkdown): void;
  estaEmTabela(): boolean;
}

type EditorMarkdownFactory = (opcoes: EditorMarkdownOpcoes) => EditorMarkdownInstancia;

export const EDITOR_MARKDOWN_FACTORY = new InjectionToken<EditorMarkdownFactory>(
  'EDITOR_MARKDOWN_FACTORY',
  {
    providedIn: 'root',
    factory: () => ({ raiz, valorInicial, documentoColaborativo, awareness, aoAlterar }) => {
      let editor: Editor | null = null;
      const aplicarFormato = (formato: FormatoMarkdown): void => {
        if (!editor) return;
        const formatos = {
          TEXTO: () => editor!.action(callCommand(turnIntoTextCommand.key)),
          TITULO_1: () => editor!.action(callCommand(wrapInHeadingCommand.key, 1)),
          TITULO_2: () => editor!.action(callCommand(wrapInHeadingCommand.key, 2)),
          NEGRITO: () => editor!.action(callCommand(toggleStrongCommand.key)),
          ITALICO: () => editor!.action(callCommand(toggleEmphasisCommand.key)),
          LISTA: () => editor!.action(callCommand(wrapInBulletListCommand.key)),
          LISTA_NUMERADA: () => editor!.action(callCommand(wrapInOrderedListCommand.key)),
          CITACAO: () => editor!.action(callCommand(wrapInBlockquoteCommand.key)),
          CODIGO: () => editor!.action(callCommand(toggleInlineCodeCommand.key)) ||
            editor!.action(callCommand(createCodeBlockCommand.key)),
          TABELA: () => editor!.action(callCommand(insertTableCommand.key, { row: 3, col: 3 })),
          LINHA_ADICIONAR: () => editor!.action(callCommand(addRowAfterCommand.key)),
          COLUNA_ADICIONAR: () => editor!.action(callCommand(addColAfterCommand.key)),
          LINHA_REMOVER: () => selecionarEstrutura('linha'),
          COLUNA_REMOVER: () => selecionarEstrutura('coluna'),
        } satisfies Record<FormatoMarkdown, () => unknown>;
        formatos[formato]();
        editor.action((contexto) => contexto.get(editorViewCtx).focus());
      };
      const selecionarEstrutura = (estrutura: 'linha' | 'coluna'): unknown => {
        if (!editor) return false;
        const indice = editor.action((contexto) => {
          const estado = contexto.get(editorViewCtx).state;
          if (!isInTable(estado)) return null;
          const celula = selectionCell(estado);
          const tabela = celula.node(-1);
          const mapa = TableMap.get(tabela);
          const retangulo = mapa.findCell(celula.pos - celula.start(-1));
          return estrutura === 'linha' ? retangulo.top : retangulo.left;
        });
        if (indice === null) return false;
        const comando = estrutura === 'linha' ? selectRowCommand : selectColCommand;
        editor.action(callCommand(comando.key, { index: indice }));
        return editor.action(callCommand(deleteSelectedCellsCommand.key));
      };
      return {
        criar: async () => {
          editor = await Editor.make()
            .config((contexto) => {
              contexto.set(rootCtx, raiz);
              contexto.set(defaultValueCtx, valorInicial);
              contexto.get(listenerCtx).markdownUpdated((_contexto, markdown, anterior) => {
                if (markdown === anterior) return;
                if (markdown.length > LIMITE_MARKDOWN) {
                  editor?.action(replaceAll(markdown.slice(0, LIMITE_MARKDOWN)));
                  return;
                }
                aoAlterar(markdown);
              });
            })
            .use(commonmark)
            .use(gfm)
            .use(listener)
            .use(collab)
            .create();
          // `collabServiceCtx` só é registrado pelo pipeline depois que `.use(collab)` roda —
          // chamar `bindDoc`/`connect` dentro do `.config()` acima (antes do pipeline existir)
          // lança `MilkdownError: Context not bind`. Precisa ser uma ação pós-`create()`.
          if (documentoColaborativo) {
            editor.action((contexto) => {
              const servico = contexto
                .get(collabServiceCtx)
                .bindDoc(documentoColaborativo)
                .bindXmlFragment(documentoColaborativo.getXmlFragment('prosemirror'));
              // `setAwareness` precisa vir antes de `connect()` — só aí o `#createPlugins()`
              // interno decide incluir o `yCursorPlugin` (cursor/seleção remotos, P-039).
              if (awareness) servico.setAwareness(awareness);
              servico.connect();
            });
          }
        },
        destruir: () => { editor?.destroy(); },
        obterMarkdown: () => editor?.action(getMarkdown()) ?? valorInicial,
        definirMarkdown: (markdown) => { editor?.action(replaceAll(markdown)); },
        definirSomenteLeitura: (somenteLeitura) => {
          editor?.action((contexto) =>
            contexto.get(editorViewCtx).setProps({ editable: () => !somenteLeitura }),
          );
        },
        aplicarFormato,
        estaEmTabela: () =>
          editor?.action((contexto) => isInTable(contexto.get(editorViewCtx).state)) ?? false,
      };
    },
  },
);

@Component({
  selector: 'app-editor-markdown',
  standalone: true,
  imports: [Icone, Tooltip],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorMarkdown),
      multi: true,
    },
  ],
  template: `
    @if (!somenteLeituraEfetiva()) {
      <div class="editor-markdown__barra" role="toolbar" aria-label="Formatação Markdown">
        <button type="button" aria-label="Texto normal" [appTooltip]="'Texto normal'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('TEXTO')">¶</button>
        <button type="button" aria-label="Título principal" [appTooltip]="'Título principal (H1)'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('TITULO_1')">H1</button>
        <button type="button" aria-label="Subtítulo" [appTooltip]="'Subtítulo (H2)'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('TITULO_2')">H2</button>
        <span aria-hidden="true"></span>
        <button type="button" aria-label="Negrito" [appTooltip]="'Negrito'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('NEGRITO')"><strong>B</strong></button>
        <button type="button" aria-label="Itálico" [appTooltip]="'Itálico'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('ITALICO')"><em>I</em></button>
        <button type="button" aria-label="Código" [appTooltip]="'Código em linha ou bloco de código'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('CODIGO')">&lt;/&gt;</button>
        <span aria-hidden="true"></span>
        <button type="button" aria-label="Lista" [appTooltip]="'Lista não numerada'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('LISTA')">• —</button>
        <button type="button" aria-label="Lista numerada" [appTooltip]="'Lista numerada'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('LISTA_NUMERADA')">1.</button>
        <button type="button" aria-label="Citação" [appTooltip]="'Citação: destaca um trecho como fala ou referência'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('CITACAO')">“</button>
        <span aria-hidden="true"></span>
        <button type="button" aria-label="Inserir tabela" [appTooltip]="'Inserir tabela 3 × 3'" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('TABELA')"><app-icone nome="tabela" /></button>
        <button type="button" aria-label="Adicionar linha" [appTooltip]="'Inserir linha abaixo'" [disabled]="!emTabela()" [attr.aria-disabled]="!emTabela()" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('LINHA_ADICIONAR')"><app-icone nome="linha-adicionar" /></button>
        <button type="button" aria-label="Remover linha" [appTooltip]="'Remover linha atual'" [disabled]="!emTabela()" [attr.aria-disabled]="!emTabela()" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('LINHA_REMOVER')"><app-icone nome="linha-remover" /></button>
        <button type="button" aria-label="Adicionar coluna" [appTooltip]="'Inserir coluna à direita'" [disabled]="!emTabela()" [attr.aria-disabled]="!emTabela()" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('COLUNA_ADICIONAR')"><app-icone nome="coluna-adicionar" /></button>
        <button type="button" aria-label="Remover coluna" [appTooltip]="'Remover coluna atual'" [disabled]="!emTabela()" [attr.aria-disabled]="!emTabela()" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('COLUNA_REMOVER')"><app-icone nome="coluna-remover" /></button>
      </div>
    }
    <div #raiz class="editor-markdown__superficie"></div>
    @if (mostrarVoltarAoTopo()) {
      <button class="editor-markdown__voltar-topo" type="button" aria-label="Voltar ao topo" [appTooltip]="'Voltar ao topo'" (click)="voltarAoTopo()">
        <app-icone nome="teto" />
      </button>
    }
  `,
  styleUrl: './editor-markdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'editor-markdown',
    '[class.editor-markdown--somente-leitura]': 'somenteLeituraEfetiva()',
    '[class.editor-markdown--compacto]': 'compacto()',
    '[attr.aria-label]': 'rotuloAria()',
    '(click)': 'alterarEstadoTabela()',
    '(keyup)': 'alterarEstadoTabela()',
    '(scroll)': 'alterarPosicaoRolagem()',
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
  protected readonly emTabela = signal(false);
  protected readonly mostrarVoltarAoTopo = signal(false);

  private readonly criarEditor = inject(EDITOR_MARKDOWN_FACTORY);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private instancia: EditorMarkdownInstancia | null = null;
  private sincronizando = false;
  private destruido = false;

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
  }

  async ngAfterViewInit(): Promise<void> {
    const instancia = this.criarEditor({
      raiz: this.raiz().nativeElement,
      valorInicial: this.valorEfetivo(),
      documentoColaborativo: this.documentoColaborativo(),
      awareness: this.awareness(),
      aoAlterar: (markdown) => {
        if (this.sincronizando || this.somenteLeituraEfetiva() || markdown === this.valorEfetivo()) {
          return;
        }
        if (this.usandoCva()) {
          this.valorCva.set(markdown);
          this.onChange?.(markdown);
          this.onTouched?.();
        }
        this.valorChange.emit(markdown);
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
  }

  ngOnDestroy(): void {
    this.destruido = true;
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

  protected aplicarFormato(formato: FormatoMarkdown): void {
    if (!this.somenteLeituraEfetiva()) this.instancia?.aplicarFormato(formato);
  }

  protected alterarEstadoTabela(): void {
    this.emTabela.set(this.instancia?.estaEmTabela() ?? false);
  }

  protected alterarPosicaoRolagem(): void {
    this.mostrarVoltarAoTopo.set(this.host.nativeElement.scrollTop > 160);
  }

  protected voltarAoTopo(): void {
    this.host.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
