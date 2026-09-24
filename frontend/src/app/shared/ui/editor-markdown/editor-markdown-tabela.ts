import type { Node as NoProseMirror } from '@milkdown/kit/prose/model';
import { type Command, TextSelection } from '@milkdown/kit/prose/state';
import {
  TableMap,
  deleteColumn,
  deleteRow,
  deleteTable,
  isInTable,
  selectionCell,
} from '@milkdown/kit/prose/tables';

export type EstruturaTabela = 'linha' | 'coluna';

/**
 * Remove a linha/coluna do cursor sem deixar a tabela inválida. O schema GFM do Milkdown é
 * `table_header_row table_row+`, e o `deleteRow` do `prosemirror-tables` não conhece essa
 * restrição: apagar o cabeçalho deixava uma linha de cabeçalho sem células, e apagar a única
 * linha do corpo deixava uma linha vazia no lugar (parecia que nada acontecia).
 */
export function removerEstruturaTabela(estrutura: EstruturaTabela): Command {
  return (estado, despachar) => {
    if (!isInTable(estado)) return false;
    const celula = selectionCell(estado);
    const tabela = celula.node(-1);
    const mapa = TableMap.get(tabela);
    const retangulo = mapa.findCell(celula.pos - celula.start(-1));

    if (estrutura === 'coluna') {
      return mapa.width <= 1 ? deleteTable(estado, despachar) : deleteColumn(estado, despachar);
    }
    if (mapa.height <= 2) return deleteTable(estado, despachar);
    if (retangulo.top > 0) return deleteRow(estado, despachar);

    // Cabeçalho: a 1ª linha do corpo sobe e vira o novo cabeçalho, preservando alinhamento.
    const cabecalho = tabela.child(0);
    const tipoCelulaCabecalho = cabecalho.child(0).type;
    const linhaPromovida = tabela.child(1);
    const novasCelulas: NoProseMirror[] = [];
    linhaPromovida.forEach((celulaCorpo) => {
      novasCelulas.push(tipoCelulaCabecalho.create(celulaCorpo.attrs, celulaCorpo.content));
    });
    const linhas = [cabecalho.type.create(cabecalho.attrs, novasCelulas)];
    for (let indice = 2; indice < tabela.childCount; indice++) linhas.push(tabela.child(indice));
    const novaTabela = tabela.type.create(tabela.attrs, linhas);

    if (despachar) {
      const inicioTabela = celula.start(-1) - 1;
      const transacao = estado.tr.replaceWith(
        inicioTabela,
        inicioTabela + tabela.nodeSize,
        novaTabela,
      );
      const posicaoCelula =
        inicioTabela + 1 + TableMap.get(novaTabela).positionAt(0, retangulo.left, novaTabela);
      transacao.setSelection(TextSelection.near(transacao.doc.resolve(posicaoCelula + 1)));
      despachar(transacao.scrollIntoView());
    }
    return true;
  };
}

/**
 * "+ Acima" com o cursor no cabeçalho: o GFM só tem um cabeçalho, sempre na 1ª linha, então a
 * linha nova vira o cabeçalho (vazio) e o cabeçalho antigo desce para a 1ª linha do corpo. Fora
 * do cabeçalho devolve `false` e o chamador usa o `addRowBeforeCommand` do Milkdown — que, no
 * cabeçalho, criaria uma linha comum antes dele (schema inválido).
 */
export function inserirLinhaAcimaDoCabecalho(): Command {
  return (estado, despachar) => {
    if (!isInTable(estado)) return false;
    const celula = selectionCell(estado);
    if (celula.index(-1) !== 0) return false;
    const tabela = celula.node(-1);
    const cabecalho = tabela.child(0);
    const tipoLinhaCorpo = tabela.child(1).type;
    const tipoCelulaCorpo = tabela.child(1).child(0).type;

    const celulasNovas: NoProseMirror[] = [];
    const celulasRebaixadas: NoProseMirror[] = [];
    cabecalho.forEach((celula) => {
      const vazia = celula.type.createAndFill({ alignment: celula.attrs['alignment'] });
      if (vazia) celulasNovas.push(vazia);
      celulasRebaixadas.push(tipoCelulaCorpo.create(celula.attrs, celula.content));
    });
    const linhas = [
      cabecalho.type.create(cabecalho.attrs, celulasNovas),
      tipoLinhaCorpo.create(null, celulasRebaixadas),
    ];
    for (let indice = 1; indice < tabela.childCount; indice++) linhas.push(tabela.child(indice));
    const novaTabela = tabela.type.create(tabela.attrs, linhas);

    if (despachar) {
      const inicioTabela = celula.start(-1) - 1;
      const retangulo = TableMap.get(tabela).findCell(celula.pos - celula.start(-1));
      const transacao = estado.tr.replaceWith(
        inicioTabela,
        inicioTabela + tabela.nodeSize,
        novaTabela,
      );
      const posicaoCelula =
        inicioTabela + 1 + TableMap.get(novaTabela).positionAt(0, retangulo.left, novaTabela);
      transacao.setSelection(TextSelection.near(transacao.doc.resolve(posicaoCelula + 1)));
      despachar(transacao.scrollIntoView());
    }
    return true;
  };
}
