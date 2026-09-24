import { InjectionToken } from '@angular/core';
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core';
import { history, redoCommand, undoCommand } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import {
  addColAfterCommand,
  addColBeforeCommand,
  addRowAfterCommand,
  addRowBeforeCommand,
  exitTable,
  gfm,
  insertTableCommand,
} from '@milkdown/kit/preset/gfm';
import {
  commonmark,
  toggleEmphasisCommand,
  toggleStrongCommand,
} from '@milkdown/kit/preset/commonmark';
import { closeHistory, redoDepth, undoDepth } from '@milkdown/kit/prose/history';
import { type Command, type EditorState, Plugin } from '@milkdown/kit/prose/state';
import { deleteTable } from '@milkdown/kit/prose/tables';
import { $prose, callCommand, getMarkdown, replaceAll } from '@milkdown/kit/utils';
import { collab, collabServiceCtx } from '@milkdown/plugin-collab';
import {
  redo as refazerColaborativo,
  undo as desfazerColaborativo,
  yUndoPluginKey,
} from 'y-prosemirror';
import type { Awareness } from 'y-protocols/awareness';
import type { Doc } from 'yjs';

import {
  type AcaoMarkdown,
  type EstadoEditorMarkdown,
  alternarCitacao,
  alternarCodigoEmLinha,
  alternarLista,
  alternarTitulo,
  lerEstadoTabela,
  lerFormatosAtivos,
  sairDoBlocoDeCodigo,
} from './editor-markdown-formatos';
import { inserirLinhaAcimaDoCabecalho, removerEstruturaTabela } from './editor-markdown-tabela';

const LIMITE_MARKDOWN = 100_000;
/** Folga padrão do ProseMirror ao rolar até o cursor (`scrollMargin`), em px. */
const MARGEM_ROLAGEM = 5;

export interface EditorMarkdownOpcoes {
  readonly raiz: HTMLElement;
  readonly valorInicial: string;
  readonly documentoColaborativo: Doc | null;
  /** Presença Yjs (cursor/seleção remotos) do modo colaborativo; ausente no caderno privado. */
  readonly awareness: Awareness | null;
  readonly aoAlterar: (markdown: string) => void;
  /** A cada atualização do ProseMirror (seleção, digitação, eco remoto). */
  readonly aoAlterarEstado: (estado: EstadoEditorMarkdown) => void;
}

export interface EditorMarkdownInstancia {
  criar(): Promise<void>;
  destruir(): void;
  obterMarkdown(): string;
  definirMarkdown(markdown: string): void;
  definirSomenteLeitura(somenteLeitura: boolean): void;
  aplicarAcao(acao: AcaoMarkdown): void;
  /** Barra ancorada sobre o fim do editor (mobile): o cursor não pode rolar para trás dela. */
  definirMargemInferiorRolagem(pixels: number): void;
}

type EditorMarkdownFactory = (opcoes: EditorMarkdownOpcoes) => EditorMarkdownInstancia;

export const EDITOR_MARKDOWN_FACTORY = new InjectionToken<EditorMarkdownFactory>(
  'EDITOR_MARKDOWN_FACTORY',
  {
    providedIn: 'root',
    factory: () => criarEditorMarkdown,
  },
);

function criarEditorMarkdown({
  raiz,
  valorInicial,
  documentoColaborativo,
  awareness,
  aoAlterar,
  aoAlterarEstado,
}: EditorMarkdownOpcoes): EditorMarkdownInstancia {
  let editor: Editor | null = null;
  const colaborativo = documentoColaborativo !== null;

  const executar = (comando: Command): boolean =>
    editor!.action((contexto) => {
      const view = contexto.get(editorViewCtx);
      return comando(view.state, view.dispatch);
    });
  const chamar = (chave: Parameters<typeof callCommand>[0], payload?: unknown): boolean =>
    editor!.action(callCommand(chave, payload));

  const acoes = {
    // No colaborativo o histórico é o `yUndoPlugin` (pilha do Yjs, só edições locais); fora dele,
    // o plugin de histórico do Milkdown. Os dois nunca coexistem (ver `criar`).
    DESFAZER: () => (colaborativo ? executar(desfazerColaborativo) : chamar(undoCommand.key)),
    REFAZER: () => (colaborativo ? executar(refazerColaborativo) : chamar(redoCommand.key)),
    TITULO_1: () => executar(alternarTitulo(1)),
    TITULO_2: () => executar(alternarTitulo(2)),
    NEGRITO: () => chamar(toggleStrongCommand.key),
    ITALICO: () => chamar(toggleEmphasisCommand.key),
    CODIGO: () => executar(sairDoBlocoDeCodigo()) || executar(alternarCodigoEmLinha()),
    LISTA: () => executar(alternarLista('LISTA')),
    LISTA_NUMERADA: () => executar(alternarLista('LISTA_NUMERADA')),
    CITACAO: () => executar(alternarCitacao()),
    TABELA: () => chamar(insertTableCommand.key, { row: 3, col: 3 }),
    LINHA_ACIMA: () =>
      executar(inserirLinhaAcimaDoCabecalho()) || chamar(addRowBeforeCommand.key),
    LINHA_ABAIXO: () => chamar(addRowAfterCommand.key),
    LINHA_REMOVER: () => executar(removerEstruturaTabela('linha')),
    COLUNA_ESQUERDA: () => chamar(addColBeforeCommand.key),
    COLUNA_DIREITA: () => chamar(addColAfterCommand.key),
    COLUNA_REMOVER: () => executar(removerEstruturaTabela('coluna')),
    TABELA_SAIR: () => chamar(exitTable.key),
    TABELA_REMOVER: () => executar(deleteTable),
  } satisfies Record<AcaoMarkdown, () => boolean>;

  /**
   * Fecha o passo atual do histórico: ações da barra em sequência rápida (< 500 ms, o
   * `newGroupDelay` do ProseMirror e o `captureTimeout` do Yjs) se fundiam com a digitação e entre
   * si — desfazer um "Apagar tabela" feito logo depois de digitar voltava para antes da tabela.
   */
  const fecharPassoDoHistorico = (): void =>
    editor!.action((contexto) => {
      const view = contexto.get(editorViewCtx);
      if (colaborativo) yUndoPluginKey.getState(view.state)?.undoManager?.stopCapturing();
      else view.dispatch(closeHistory(view.state.tr));
    });

  const lerEstado = (estado: EditorState): EstadoEditorMarkdown => ({
    ativos: lerFormatosAtivos(estado),
    ...lerEstadoTabela(estado),
    // A pilha do Yjs só recebe a edição depois desta atualização do ProseMirror — no
    // colaborativo os dois botões ficam sempre habilitados em vez de mostrar um estado atrasado.
    podeDesfazer: colaborativo || undoDepth(estado) > 0,
    podeRefazer: colaborativo || redoDepth(estado) > 0,
  });
  // Estado da barra (ativos, tabela, histórico) pelo próprio ProseMirror — `click`/`keyup` no
  // host não viam seleção por toque (alças do celular) nem alteração remota do Yjs.
  const estadoBarra = $prose(
    () =>
      new Plugin({
        view: (view) => {
          aoAlterarEstado(lerEstado(view.state));
          return { update: (atualizada) => aoAlterarEstado(lerEstado(atualizada.state)) };
        },
      }),
  );

  return {
    criar: async () => {
      const construtor = Editor.make()
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
        .use(estadoBarra)
        .use(collab);
      // Histórico local só fora do modo colaborativo: lá o `yUndoPlugin` do plugin-collab
      // já liga Mod-z/Mod-y/Mod-Shift-z, e o histórico do ProseMirror desfaria edições remotas.
      if (!colaborativo) construtor.use(history);
      editor = await construtor.create();
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
    destruir: () => {
      editor?.destroy();
    },
    obterMarkdown: () => editor?.action(getMarkdown()) ?? valorInicial,
    // `flush` recria o EditorState: troca de página/`writeValue` zera o histórico, senão o
    // Ctrl+Z logo depois traria de volta o texto da página anterior.
    definirMarkdown: (markdown) => {
      editor?.action(replaceAll(markdown, true));
    },
    definirSomenteLeitura: (somenteLeitura) => {
      editor?.action((contexto) =>
        contexto.get(editorViewCtx).setProps({ editable: () => !somenteLeitura }),
      );
    },
    aplicarAcao: (acao) => {
      if (!editor) return;
      const passoProprio = acao !== 'DESFAZER' && acao !== 'REFAZER';
      if (passoProprio) fecharPassoDoHistorico();
      acoes[acao]();
      if (passoProprio) fecharPassoDoHistorico();
      editor.action((contexto) => contexto.get(editorViewCtx).focus());
    },
    definirMargemInferiorRolagem: (pixels) => {
      editor?.action((contexto) =>
        contexto.get(editorViewCtx).setProps({
          scrollMargin: {
            top: MARGEM_ROLAGEM,
            right: MARGEM_ROLAGEM,
            bottom: MARGEM_ROLAGEM + pixels,
            left: MARGEM_ROLAGEM,
          },
        }),
      );
    },
  };
}
