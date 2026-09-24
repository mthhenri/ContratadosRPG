import { TestBed } from '@angular/core/testing';
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core';
import { gfm } from '@milkdown/kit/preset/gfm';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { type Command, TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
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

  it.each(['A', 'a1'])('cabeçalho + 1 linha: remover %s apaga a tabela', async (celula) => {
    const tabela = '| A | B |\n| - | - |\n| a1 | b1 |\n\nfim\n';
    const markdown = await removerNaCelula(tabela, celula, 'linha');
    expect(markdown).not.toContain('|');
    expect(markdown).toContain('fim');
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
