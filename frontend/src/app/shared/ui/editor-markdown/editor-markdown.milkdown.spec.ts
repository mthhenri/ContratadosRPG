import { TestBed } from '@angular/core/testing';
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core';
import { gfm } from '@milkdown/kit/preset/gfm';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { type Command, TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import { history } from '@milkdown/kit/plugin/history';
import { undo, closeHistory } from '@milkdown/kit/prose/history';
import { Plugin } from '@milkdown/kit/prose/state';
import { $prose } from '@milkdown/kit/utils';
import { collab, collabServiceCtx } from '@milkdown/plugin-collab';
import * as Y from 'yjs';
import { EditorMarkdownSelecoes } from './editor-markdown-selecao';
import { getMarkdown } from '@milkdown/kit/utils';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { EDITOR_MARKDOWN_FACTORY } from './editor-markdown.component';
import {
  ESTADO_EDITOR_MARKDOWN_INICIAL,
  alternarCitacao,
  alternarLista,
  alternarTitulo,
  lerFormatosAtivos,
  sairDoBlocoDeCodigo,
} from './editor-markdown-formatos';
import {
  type EstruturaTabela,
  inserirLinhaAcimaDoCabecalho,
  removerEstruturaTabela,
  tabelaAdmiteSoCabecalho,
} from './editor-markdown-tabela';

// Estes testes usam o Milkdown real (schema GFM de verdade) — a spec do componente substitui a
// fábrica por um dublê e por isso nunca pegou a tabela inválida gerada ao remover o cabeçalho.

const TABELA_3X3 = `| A | B | C |
| - | - | - |
| a1 | b1 | c1 |
| a2 | b2 | c2 |
`;

// jsdom não mede layout; o ProseMirror mede o cursor ao rolar até a seleção (`scrollIntoView`
// do undo/redo). Retângulo vazio basta — nenhum teste aqui depende de posição na tela.
beforeAll(() => {
  const vazio = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] });
  const retangulo = () => new DOMRect(0, 0, 0, 0);
  for (const prototipo of [Range.prototype, Element.prototype, Text.prototype] as object[]) {
    const alvo = prototipo as { getClientRects?: unknown; getBoundingClientRect?: unknown };
    alvo.getClientRects ??= vazio;
    alvo.getBoundingClientRect ??= retangulo;
  }
});

const raizes: HTMLElement[] = [];
const editores: Editor[] = [];

function criarRaiz(): HTMLElement {
  const raiz = document.createElement('div');
  document.body.appendChild(raiz);
  raizes.push(raiz);
  return raiz;
}

afterEach(() => {
  editores.splice(0).forEach((editor) => editor.destroy());
  raizes.splice(0).forEach((raiz) => raiz.remove());
});

/** Editor real com o cursor dentro do texto `textoCursor`; `acao` recebe a view. */
async function comCursorEm(
  markdown: string,
  textoCursor: string,
  acao: (view: EditorView) => void,
): Promise<string> {
  const editor = await Editor.make()
    .config((contexto) => {
      contexto.set(rootCtx, criarRaiz());
      contexto.set(defaultValueCtx, markdown);
    })
    .use(commonmark)
    .use(gfm)
    .use(tabelaAdmiteSoCabecalho)
    .create();
  editores.push(editor);
  editor.action((contexto) => {
    const view = contexto.get(editorViewCtx);
    let posicao = -1;
    view.state.doc.descendants((no, pos) => {
      if (posicao < 0 && no.isText && no.text === textoCursor) posicao = pos;
    });
    expect(posicao).toBeGreaterThan(-1);
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, posicao + 1)));
    acao(view);
    view.state.doc.check();
  });
  return editor.action(getMarkdown());
}

function removerNaCelula(
  markdown: string,
  textoCelula: string,
  estrutura: EstruturaTabela,
): Promise<string> {
  return comCursorEm(markdown, textoCelula, (view) => {
    expect(removerEstruturaTabela(estrutura)(view.state, view.dispatch)).toBe(true);
  });
}

function executarEm(markdown: string, texto: string, comando: Command): Promise<string> {
  return comCursorEm(markdown, texto, (view) => {
    expect(comando(view.state, view.dispatch)).toBe(true);
  });
}

function linhasDaTabela(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter((linha) => linha.startsWith('|') && !/^\|\s*:?-/.test(linha))
    .map((linha) =>
      linha
        .split('|')
        .slice(1, -1)
        // Célula vazia: o Milkdown serializa o parágrafo vazio como `<br />`.
        .map((celula) => celula.trim().replace('<br />', ''))
        .join(','),
    );
}

describe('removerEstruturaTabela (schema GFM real)', () => {
  it('remove a linha comum do cursor', async () => {
    const markdown = await removerNaCelula(TABELA_3X3, 'b1', 'linha');
    expect(linhasDaTabela(markdown)).toEqual(['A,B,C', 'a2,b2,c2']);
  });

  it('remover o cabeçalho promove a 1ª linha do corpo a cabeçalho', async () => {
    const markdown = await removerNaCelula(TABELA_3X3, 'B', 'linha');
    expect(linhasDaTabela(markdown)).toEqual(['a1,b1,c1', 'a2,b2,c2']);
  });

  it('cabeçalho + 1 linha: remover a linha deixa a tabela só com o cabeçalho', async () => {
    const tabela = '| A | B |\n| - | - |\n| a1 | b1 |\n\nfim\n';
    const markdown = await removerNaCelula(tabela, 'a1', 'linha');
    expect(linhasDaTabela(markdown)).toEqual(['A,B']);
  });

  it('cabeçalho + 1 linha: remover o cabeçalho sobe a linha e a tabela continua', async () => {
    const tabela = '| A | B |\n| - | - |\n| a1 | b1 |\n\nfim\n';
    const markdown = await removerNaCelula(tabela, 'A', 'linha');
    expect(linhasDaTabela(markdown)).toEqual(['a1,b1']);
  });

  it('só a última linha que sobrou apaga a tabela', async () => {
    const markdown = await removerNaCelula('| A | B |\n| - | - |\n\nfim\n', 'A', 'linha');
    expect(markdown).not.toContain('|');
    expect(markdown).toContain('fim');
  });

  it('tabela só com cabeçalho abre com uma linha (sem linha vazia inventada)', async () => {
    let linhas = -1;
    await comCursorEm('| A | B |\n| - | - |\n\nfim\n', 'A', (view) => {
      linhas = view.state.doc.firstChild!.childCount;
    });
    expect(linhas).toBe(1);
  });

  it('"+ Acima" funciona numa tabela só com cabeçalho', async () => {
    const markdown = await executarEm('| A | B |\n| - | - |\n', 'A', inserirLinhaAcimaDoCabecalho());
    expect(linhasDaTabela(markdown)).toEqual([',', 'A,B']);
  });

  it.each(['B', 'b1'])('remove a coluna do cursor estando em %s', async (celula) => {
    const markdown = await removerNaCelula(TABELA_3X3, celula, 'coluna');
    expect(linhasDaTabela(markdown)).toEqual(['A,C', 'a1,c1', 'a2,c2']);
  });

  it('"+ Acima" no cabeçalho cria cabeçalho vazio e desce o antigo para o corpo', async () => {
    const markdown = await executarEm(TABELA_3X3, 'B', inserirLinhaAcimaDoCabecalho());
    expect(linhasDaTabela(markdown)).toEqual([',,', 'A,B,C', 'a1,b1,c1', 'a2,b2,c2']);
  });

  it('"+ Acima" fora do cabeçalho devolve a vez ao comando padrão', async () => {
    await comCursorEm(TABELA_3X3, 'b1', (view) => {
      expect(inserirLinhaAcimaDoCabecalho()(view.state, view.dispatch)).toBe(false);
    });
  });

  it('remover a única coluna apaga a tabela', async () => {
    const markdown = await removerNaCelula('| A |\n| - |\n| a1 |\n\nfim\n', 'a1', 'coluna');
    expect(markdown).not.toContain('|');
  });
});

describe('formatos alternáveis (schema real)', () => {
  it('H1 aplica e, com o bloco já em H1, volta a parágrafo', async () => {
    expect((await executarEm('Texto\n', 'Texto', alternarTitulo(2))).trim()).toBe('## Texto');
    expect((await executarEm('# Título\n', 'Título', alternarTitulo(1))).trim()).toBe('Título');
  });

  it('lê marcas e blocos ativos no cursor', async () => {
    let ativos = new Set<string>();
    await comCursorEm('# Título\n\n**forte** e nada\n', 'forte', (view) => {
      ativos = lerFormatosAtivos(view.state);
    });
    expect([...ativos]).toEqual(['NEGRITO']);
    await comCursorEm('> - item\n', 'item', (view) => {
      ativos = lerFormatosAtivos(view.state);
    });
    expect(ativos).toEqual(new Set(['LISTA', 'CITACAO']));
  });

  it('lista numerada sobre lista com marcadores troca o tipo da lista inteira', async () => {
    let ativos = new Set<string>();
    const markdown = await comCursorEm('- a\n- b\n', 'a', (view) => {
      alternarLista('LISTA_NUMERADA')(view.state, view.dispatch);
      ativos = lerFormatosAtivos(view.state);
    });
    expect(markdown).toMatch(/^1\. a$/m);
    expect(markdown).toMatch(/^2\. b$/m);
    expect(ativos.has('LISTA_NUMERADA')).toBe(true);
  });

  it('lista com marcadores sobre lista numerada volta a marcadores', async () => {
    const markdown = await executarEm('1. a\n2. b\n', 'b', alternarLista('LISTA'));
    expect(markdown).not.toMatch(/^\d\./m);
    expect(markdown).toMatch(/^[-*] a$/m);
    expect(markdown).toMatch(/^[-*] b$/m);
  });

  it('mesma lista de novo tira o item da lista', async () => {
    const markdown = await executarEm('- a\n- b\n', 'a', alternarLista('LISTA'));
    expect(markdown).toMatch(/^a$/m);
    expect(markdown).toMatch(/^[-*] b$/m);
  });

  it('citação envolve e, dentro dela, sai', async () => {
    expect((await executarEm('texto\n', 'texto', alternarCitacao())).trim()).toBe('> texto');
    expect((await executarEm('> citado\n', 'citado', alternarCitacao())).trim()).toBe('citado');
  });

  it('código em bloco de código volta a parágrafo', async () => {
    const markdown = await executarEm('```\ncodigo\n```\n', 'codigo', sairDoBlocoDeCodigo());
    expect(markdown.trim()).toBe('codigo');
  });
});

describe('EDITOR_MARKDOWN_FACTORY — histórico (Milkdown real)', () => {
  function teclar(raiz: HTMLElement, tecla: string, shiftKey = false): void {
    const superficie = raiz.querySelector('.ProseMirror') as HTMLElement;
    superficie.dispatchEvent(
      // `keyCode` como o navegador manda: com Shift, o keymap do ProseMirror acha `Mod-Shift-z`
      // pelo código da tecla, não pelo `key` ('Z' maiúsculo).
      new KeyboardEvent('keydown', {
        key: tecla,
        keyCode: tecla.toUpperCase().charCodeAt(0),
        ctrlKey: true,
        shiftKey,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  async function criarInstancia(valorInicial: string) {
    const raiz = criarRaiz();
    const instancia = TestBed.inject(EDITOR_MARKDOWN_FACTORY)({
      raiz,
      valorInicial,
      documentoColaborativo: null,
      awareness: null,
      aoAlterar: () => undefined,
      aoAlterarEstado: (novo) => {
        estado = novo;
      },
    });
    let estado = ESTADO_EDITOR_MARKDOWN_INICIAL;
    await instancia.criar();
    return { raiz, instancia, estado: () => estado };
  }

  it('Ctrl+Z desfaz e Ctrl+Y / Ctrl+Shift+Z refazem fora do modo colaborativo', async () => {
    const { raiz, instancia } = await criarInstancia('Registro\n');
    try {
      instancia.aplicarAcao('TABELA');
      expect(instancia.obterMarkdown()).toContain('|');

      teclar(raiz, 'z');
      expect(instancia.obterMarkdown()).not.toContain('|');

      teclar(raiz, 'y');
      expect(instancia.obterMarkdown()).toContain('|');

      teclar(raiz, 'z');
      teclar(raiz, 'Z', true);
      expect(instancia.obterMarkdown()).toContain('|');
    } finally {
      instancia.destruir();
    }
  });

  it('botões Desfazer/Refazer seguem o histórico e desfazem pela barra', async () => {
    const { instancia, estado } = await criarInstancia('Registro\n');
    try {
      expect(estado().podeDesfazer).toBe(false);
      instancia.aplicarAcao('TABELA');
      expect(estado().podeDesfazer).toBe(true);

      instancia.aplicarAcao('DESFAZER');
      expect(instancia.obterMarkdown()).not.toContain('|');
      expect(estado().podeRefazer).toBe(true);

      instancia.aplicarAcao('REFAZER');
      expect(instancia.obterMarkdown()).toContain('|');
    } finally {
      instancia.destruir();
    }
  });

  it('faixa de tabela: "+ Acima" no cabeçalho cria cabeçalho novo e "sair" deixa a tabela', async () => {
    const { instancia, estado } = await criarInstancia('Registro\n');
    try {
      instancia.aplicarAcao('TABELA');
      expect(estado().emTabela).toBe(true);

      instancia.aplicarAcao('LINHA_ACIMA');
      // 3×3 inicial (cabeçalho + 2 linhas) passa a ter cabeçalho + 3 linhas, e continua válida.
      const linhas = instancia.obterMarkdown().split('\n').filter((linha) => linha.startsWith('|'));
      expect(linhas).toHaveLength(5);

      instancia.aplicarAcao('TABELA_SAIR');
      expect(estado().emTabela).toBe(false);
    } finally {
      instancia.destruir();
    }
  });

  it('cada ação da barra é um passo próprio do histórico, mesmo em sequência rápida', async () => {
    const { instancia } = await criarInstancia('Registro\n');
    try {
      instancia.aplicarAcao('TABELA');
      instancia.aplicarAcao('LINHA_ABAIXO');
      instancia.aplicarAcao('TABELA_REMOVER');
      expect(instancia.obterMarkdown()).not.toContain('|');

      // Desfazer o "Apagar" devolve a tabela com a linha nova — não volta para antes dela.
      instancia.aplicarAcao('DESFAZER');
      const linhas = instancia.obterMarkdown().split('\n').filter((linha) => linha.startsWith('|'));
      expect(linhas).toHaveLength(5);
    } finally {
      instancia.destruir();
    }
  });

  it('"Código" com o cursor parado não transforma o parágrafo em bloco de código', async () => {
    const { instancia, estado } = await criarInstancia('Use o comando no chat\n');
    try {
      instancia.aplicarAcao('CODIGO');
      expect(estado().ativos.has('CODIGO')).toBe(true);
      expect(instancia.obterMarkdown()).not.toContain('```');
    } finally {
      instancia.destruir();
    }
  });

  it('conteúdo trocado por fora zera o histórico (sem voltar à página anterior)', async () => {
    const { raiz, instancia } = await criarInstancia('Página A\n');
    try {
      instancia.aplicarAcao('TABELA');
      instancia.definirMarkdown('Página B\n');

      teclar(raiz, 'z');

      expect(instancia.obterMarkdown().trim()).toBe('Página B');
    } finally {
      instancia.destruir();
    }
  });
});

describe('EDITOR_MARKDOWN_FACTORY — leitura síncrona (Milkdown real, P-081)', () => {
  it('emite snapshot Markdown síncrono para marca recebida pelo Yjs quando habilitado', async () => {
    const documento = new Y.Doc();
    const paragrafo = new Y.XmlElement('paragraph');
    const texto = new Y.XmlText();
    documento.getXmlFragment('prosemirror').insert(0, [paragrafo]);
    paragrafo.insert(0, [texto]);
    texto.insert(0, 'trecho');
    const emitidos: string[] = [];
    const instancia = TestBed.inject(EDITOR_MARKDOWN_FACTORY)({
      raiz: criarRaiz(), valorInicial: '', documentoColaborativo: documento, awareness: null,
      propagarImediatamente: true,
      aoAlterar: (markdown) => emitidos.push(markdown),
      aoAlterarEstado: () => undefined,
    });
    await instancia.criar();
    const remoto = new Y.Doc();
    try {
      Y.applyUpdate(remoto, Y.encodeStateAsUpdate(documento));
      const paragrafoRemoto = remoto.getXmlFragment('prosemirror').get(0) as Y.XmlElement;
      const textoRemoto = paragrafoRemoto.get(0) as Y.XmlText;
      emitidos.length = 0;
      textoRemoto.format(0, 6, { link: { href: '#biblioteca-documento-12', title: null } });
      Y.applyUpdate(documento, Y.encodeStateAsUpdate(remoto));
      // Nenhum timer ou espera: o consumidor recebe o snapshot no mesmo update do Yjs.
      expect(emitidos.at(-1)).toContain('[trecho](#biblioteca-documento-12)');
      expect(emitidos.at(-1)).toBe(instancia.obterMarkdown());
      emitidos.length = 0;
      instancia.aplicarAcao('TABELA');
      expect(emitidos.at(-1)).toContain('|');
      expect(emitidos.at(-1)).toBe(instancia.obterMarkdown());
    } finally {
      instancia.destruir(); documento.destroy(); remoto.destroy();
    }
  });

  it('obterMarkdown já traz a edição que o listener debounced ainda não emitiu', async () => {
    const emitidos: string[] = [];
    const instancia = TestBed.inject(EDITOR_MARKDOWN_FACTORY)({
      raiz: criarRaiz(),
      valorInicial: 'Registro\n',
      documentoColaborativo: null,
      awareness: null,
      aoAlterar: (markdown) => emitidos.push(markdown),
      aoAlterarEstado: () => undefined,
    });
    await instancia.criar();
    try {
      instancia.aplicarAcao('TABELA');

      expect(emitidos).toEqual([]);
      expect(instancia.obterMarkdown()).toContain('|');
    } finally {
      instancia.destruir();
    }
  });
});


describe('seleção vinculada — Milkdown/ProseMirror reais', () => {
  async function montar(markdown = 'Antes **trecho** depois', documento?: Y.Doc) {
    const selecoes = new EditorMarkdownSelecoes();
    const editor = await Editor.make().config((contexto) => {
      contexto.set(rootCtx, criarRaiz());
      contexto.set(defaultValueCtx, markdown);
    }).use(commonmark).use(gfm).use($prose(() => new Plugin({
      state: { init: () => null, apply: (transacao) => { selecoes.remapear(transacao); return null; } },
    }))).use(documento ? collab : history).create();
    editores.push(editor);
    if (documento) editor.action((contexto) => contexto.get(collabServiceCtx)
      .bindDoc(documento).bindXmlFragment(documento.getXmlFragment('prosemirror')).applyTemplate(markdown).connect());
    const view = editor.action((contexto) => contexto.get(editorViewCtx));
    let inicio = 0;
    view.state.doc.descendants((no, posicao) => { if (no.isText && no.text === 'trecho') inicio = posicao; });
    const selecionar = () => view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, inicio, inicio + 6)));
    const capturar = () => selecoes.capturar(view,
      () => view.dispatch(closeHistory(view.state.tr)),
      () => view.dispatch(closeHistory(view.state.tr)));
    selecionar();
    return { editor, view, selecoes, capturar, selecionar };
  }

  it('marca o trecho, preserva negrito, serializa link sem título e desfaz', async () => {
    const { editor, view, capturar } = await montar();
    expect(capturar()!.aplicarLink('#biblioteca-documento-12')).toBe(true);
    const markdown = editor.action(getMarkdown());
    expect(markdown).toContain('#biblioteca-documento-12');
    expect(markdown).toContain('**[trecho](#biblioteca-documento-12)**');
    expect(view.state.doc.textContent).toBe('Antes trecho depois');
    const marcas = view.state.doc.resolve(8).marks();
    expect(marcas.map((marca) => marca.type.name)).toEqual(expect.arrayContaining(['strong', 'link']));
    expect(marcas.find((marca) => marca.type.name === 'link')!.attrs['title']).toBeNull();
    expect(undo(view.state, view.dispatch)).toBe(true);
    expect(editor.action(getMarkdown())).not.toContain('#biblioteca');
  });

  it('remapeia inserção anterior e não usa a seleção atual após abrir o seletor', async () => {
    const { view, capturar } = await montar();
    const selecao = capturar()!;
    view.dispatch(view.state.tr.insertText('Novo ', 1));
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)));
    expect(selecao.aplicarLink('#destino')).toBe(true);
    expect(view.state.doc.textContent).toBe('Novo Antes trecho depois');
    expect(view.state.doc.resolve(13).marks().some((marca) => marca.type.name === 'link')).toBe(true);
  });

  it('rejeita trecho removido ou substituído, mesmo pelo mesmo texto', async () => {
    for (const texto of ['', 'trecho']) {
      const { view, capturar } = await montar();
      const selecao = capturar()!;
      view.dispatch(view.state.tr.insertText(texto, 7, 13));
      expect(selecao.aplicarLink('#destino')).toBe(false);
    }
  });

  it('invalida handle anterior, cancelado, somente leitura e seleção em código', async () => {
    const { view, capturar } = await montar();
    const anterior = capturar()!;
    const atual = capturar()!;
    expect(anterior.aplicarLink('#destino')).toBe(false);
    atual.cancelar();
    expect(atual.aplicarLink('#destino')).toBe(false);
    const leitura = capturar()!;
    view.setProps({ editable: () => false });
    expect(leitura.aplicarLink('#destino')).toBe(false);
    expect(capturar()).toBeNull();
    const codigo = await montar('Antes `trecho` depois');
    expect(codigo.capturar()).toBeNull();
  });

  it('resolve posições relativas após edição remota do Yjs e rejeita remoção remota', async () => {
    const documento = new Y.Doc();
    const { view, capturar } = await montar('Antes **trecho** depois', documento);
    const remoto = new Y.Doc();
    Y.applyUpdate(remoto, Y.encodeStateAsUpdate(documento));
    const selecao = capturar()!;
    const paragrafo = remoto.getXmlFragment('prosemirror').get(0) as Y.XmlElement;
    const texto = paragrafo.get(0) as Y.XmlText;
    texto.insert(0, 'Novo ');
    Y.applyUpdate(documento, Y.encodeStateAsUpdate(remoto));
    expect(selecao.aplicarLink('#destino')).toBe(true);
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 12, 18)));
    const removida = capturar()!;
    Y.applyUpdate(remoto, Y.encodeStateAsUpdate(documento));
    texto.delete(11, 6);
    Y.applyUpdate(documento, Y.encodeStateAsUpdate(remoto));
    expect(removida.aplicarLink('#destino')).toBe(false);
    documento.destroy(); remoto.destroy();
  });
});
