import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  InjectionToken,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  rootCtx,
} from '@milkdown/kit/core';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
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

type FormatoMarkdown =
  | 'TEXTO'
  | 'TITULO_1'
  | 'TITULO_2'
  | 'NEGRITO'
  | 'ITALICO'
  | 'LISTA'
  | 'LISTA_NUMERADA'
  | 'CITACAO'
  | 'CODIGO';

const LIMITE_MARKDOWN = 100_000;

interface EditorMarkdownOpcoes {
  readonly raiz: HTMLElement;
  readonly valorInicial: string;
  readonly aoAlterar: (markdown: string) => void;
}

interface EditorMarkdownInstancia {
  criar(): Promise<void>;
  destruir(): void;
  obterMarkdown(): string;
  definirMarkdown(markdown: string): void;
  definirSomenteLeitura(somenteLeitura: boolean): void;
  aplicarFormato(formato: FormatoMarkdown): void;
}

type EditorMarkdownFactory = (opcoes: EditorMarkdownOpcoes) => EditorMarkdownInstancia;

export const EDITOR_MARKDOWN_FACTORY = new InjectionToken<EditorMarkdownFactory>(
  'EDITOR_MARKDOWN_FACTORY',
  {
    providedIn: 'root',
    factory: () => ({ raiz, valorInicial, aoAlterar }) => {
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
        } satisfies Record<FormatoMarkdown, () => unknown>;
        formatos[formato]();
        editor.action((contexto) => contexto.get(editorViewCtx).focus());
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
            .use(listener)
            .create();
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
      };
    },
  },
);

@Component({
  selector: 'app-editor-markdown',
  standalone: true,
  template: `
    @if (!somenteLeitura()) {
      <div class="editor-markdown__barra" role="toolbar" aria-label="Formatação Markdown">
        <button type="button" aria-label="Texto normal" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('TEXTO')">¶</button>
        <button type="button" aria-label="Título principal" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('TITULO_1')">H1</button>
        <button type="button" aria-label="Subtítulo" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('TITULO_2')">H2</button>
        <span aria-hidden="true"></span>
        <button type="button" aria-label="Negrito" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('NEGRITO')"><strong>B</strong></button>
        <button type="button" aria-label="Itálico" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('ITALICO')"><em>I</em></button>
        <button type="button" aria-label="Código" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('CODIGO')">&lt;/&gt;</button>
        <span aria-hidden="true"></span>
        <button type="button" aria-label="Lista" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('LISTA')">• —</button>
        <button type="button" aria-label="Lista numerada" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('LISTA_NUMERADA')">1.</button>
        <button type="button" aria-label="Citação" (mousedown)="$event.preventDefault()" (click)="aplicarFormato('CITACAO')">“</button>
      </div>
    }
    <div #raiz class="editor-markdown__superficie"></div>
  `,
  styleUrl: './editor-markdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'editor-markdown',
    '[class.editor-markdown--somente-leitura]': 'somenteLeitura()',
    '[attr.aria-label]':
      'somenteLeitura() ? "Conteúdo Markdown somente leitura" : "Editor Markdown"',
  },
})
export class EditorMarkdown implements AfterViewInit, OnDestroy {
  readonly valor = input('');
  readonly somenteLeitura = input(false);
  readonly valorChange = output<string>();

  private readonly criarEditor = inject(EDITOR_MARKDOWN_FACTORY);
  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private instancia: EditorMarkdownInstancia | null = null;
  private sincronizando = false;
  private destruido = false;

  constructor() {
    effect(() => {
      const valor = this.valor();
      const instancia = this.instancia;
      if (!instancia || this.sincronizando || instancia.obterMarkdown() === valor) return;
      this.sincronizando = true;
      instancia.definirMarkdown(valor);
      this.sincronizando = false;
    });
    effect(() => {
      const somenteLeitura = this.somenteLeitura();
      this.instancia?.definirSomenteLeitura(somenteLeitura);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const instancia = this.criarEditor({
      raiz: this.raiz().nativeElement,
      valorInicial: this.valor(),
      aoAlterar: (markdown) => {
        if (!this.sincronizando && !this.somenteLeitura()) this.valorChange.emit(markdown);
      },
    });
    this.instancia = instancia;
    await instancia.criar();
    if (this.destruido) {
      instancia.destruir();
      return;
    }
    if (instancia.obterMarkdown() !== this.valor()) instancia.definirMarkdown(this.valor());
    instancia.definirSomenteLeitura(this.somenteLeitura());
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.instancia?.destruir();
    this.instancia = null;
  }

  protected aplicarFormato(formato: FormatoMarkdown): void {
    if (!this.somenteLeitura()) this.instancia?.aplicarFormato(formato);
  }
}
