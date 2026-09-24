import { lift, setBlockType, toggleMark, wrapIn } from '@milkdown/kit/prose/commands';
import type { MarkType, NodeType } from '@milkdown/kit/prose/model';
import type { Command, EditorState } from '@milkdown/kit/prose/state';
import { liftListItem, wrapInList } from '@milkdown/kit/prose/schema-list';
import { isInTable } from '@milkdown/kit/prose/tables';
import { liftTarget } from '@milkdown/kit/prose/transform';

/** Ações da barra do editor. As de formato também são as que podem aparecer como ativas. */
export type AcaoMarkdown =
  | 'DESFAZER'
  | 'REFAZER'
  | 'TITULO_1'
  | 'TITULO_2'
  | 'NEGRITO'
  | 'ITALICO'
  | 'CODIGO'
  | 'LISTA'
  | 'LISTA_NUMERADA'
  | 'CITACAO'
  | 'TABELA'
  | 'LINHA_ACIMA'
  | 'LINHA_ABAIXO'
  | 'LINHA_REMOVER'
  | 'COLUNA_ESQUERDA'
  | 'COLUNA_DIREITA'
  | 'COLUNA_REMOVER'
  | 'TABELA_SAIR'
  | 'TABELA_REMOVER';

export interface EstadoEditorMarkdown {
  readonly ativos: ReadonlySet<AcaoMarkdown>;
  readonly emTabela: boolean;
  readonly podeDesfazer: boolean;
  readonly podeRefazer: boolean;
}

export const ESTADO_EDITOR_MARKDOWN_INICIAL: EstadoEditorMarkdown = {
  ativos: new Set(),
  emTabela: false,
  podeDesfazer: false,
  podeRefazer: false,
};

// Nomes dos nós/marcas dos presets `commonmark`/`gfm` do Milkdown.
const MARCAS = { NEGRITO: 'strong', ITALICO: 'emphasis', CODIGO: 'inlineCode' } as const;
const LISTAS = { LISTA: 'bullet_list', LISTA_NUMERADA: 'ordered_list' } as const;
type AcaoLista = keyof typeof LISTAS;

function tipoNo(estado: EditorState, nome: string): NodeType {
  const tipo = estado.schema.nodes[nome];
  if (!tipo) throw new Error(`Nó "${nome}" ausente do schema do editor Markdown`);
  return tipo;
}

function marcaAtiva(estado: EditorState, tipo: MarkType | undefined): boolean {
  if (!tipo) return false;
  const { empty, $from, from, to } = estado.selection;
  if (empty) return Boolean(tipo.isInSet(estado.storedMarks ?? $from.marks()));
  return estado.doc.rangeHasMark(from, to, tipo);
}

/** Profundidade do ancestral mais próximo do cursor com um dos nomes, ou `null`. */
function profundidadeAncestral(estado: EditorState, nomes: readonly string[]): number | null {
  const { $from } = estado.selection;
  for (let profundidade = $from.depth; profundidade > 0; profundidade--) {
    if (nomes.includes($from.node(profundidade).type.name)) return profundidade;
  }
  return null;
}

export function lerFormatosAtivos(estado: EditorState): Set<AcaoMarkdown> {
  const ativos = new Set<AcaoMarkdown>();
  for (const [acao, nome] of Object.entries(MARCAS) as [keyof typeof MARCAS, string][]) {
    if (marcaAtiva(estado, estado.schema.marks[nome])) ativos.add(acao);
  }
  const bloco = estado.selection.$from.parent;
  if (bloco.type.name === 'code_block') ativos.add('CODIGO');
  if (bloco.type.name === 'heading' && bloco.attrs['level'] === 1) ativos.add('TITULO_1');
  if (bloco.type.name === 'heading' && bloco.attrs['level'] === 2) ativos.add('TITULO_2');
  const lista = profundidadeAncestral(estado, Object.values(LISTAS));
  if (lista !== null) {
    const nome = estado.selection.$from.node(lista).type.name;
    ativos.add(nome === LISTAS.LISTA ? 'LISTA' : 'LISTA_NUMERADA');
  }
  if (profundidadeAncestral(estado, ['blockquote']) !== null) ativos.add('CITACAO');
  return ativos;
}

export function lerEstadoTabela(estado: EditorState): Pick<EstadoEditorMarkdown, 'emTabela'> {
  return { emTabela: isInTable(estado) };
}

/** H1/H2: aplica o nível; se o bloco já é esse título, volta a parágrafo. */
export function alternarTitulo(nivel: 1 | 2): Command {
  return (estado, despachar) => {
    const bloco = estado.selection.$from.parent;
    if (bloco.type.name === 'heading' && bloco.attrs['level'] === nivel) {
      return setBlockType(tipoNo(estado, 'paragraph'))(estado, despachar);
    }
    return setBlockType(tipoNo(estado, 'heading'), { level: nivel })(estado, despachar);
  };
}

/** Bloco de código ativo volta a parágrafo; fora dele, `false` (o chamador segue adiante). */
export function sairDoBlocoDeCodigo(): Command {
  return (estado, despachar) => {
    if (estado.selection.$from.parent.type.name !== 'code_block') return false;
    return setBlockType(tipoNo(estado, 'paragraph'))(estado, despachar);
  };
}

/**
 * Lista/Lista numerada: fora de lista, envolve; na lista do mesmo tipo, tira o item dela; na do
 * outro tipo, troca o tipo da lista inteira (como editores de texto fazem). A troca também
 * reescreve `listType`/`label` dos itens — sem isso o `syncListOrderPlugin` do Milkdown vê itens
 * `ordered` numa `bullet_list` e desfaz a troca.
 */
export function alternarLista(acao: AcaoLista): Command {
  return (estado, despachar) => {
    const tipoAlvo = tipoNo(estado, LISTAS[acao]);
    const tipoItem = tipoNo(estado, 'list_item');
    const profundidade = profundidadeAncestral(estado, Object.values(LISTAS));
    if (profundidade === null) return wrapInList(tipoAlvo)(estado, despachar);

    const { $from } = estado.selection;
    const lista = $from.node(profundidade);
    if (lista.type === tipoAlvo) return liftListItem(tipoItem)(estado, despachar);

    if (despachar) {
      const posicaoLista = $from.before(profundidade);
      const transacao = estado.tr.setNodeMarkup(posicaoLista, tipoAlvo);
      const ordenada = acao === 'LISTA_NUMERADA';
      lista.forEach((item, deslocamento, indice) => {
        if (item.type !== tipoItem) return;
        transacao.setNodeMarkup(posicaoLista + 1 + deslocamento, undefined, {
          ...item.attrs,
          listType: ordenada ? 'ordered' : 'bullet',
          label: ordenada ? `${indice + 1}.` : '•',
        });
      });
      despachar(transacao);
    }
    return true;
  };
}

/** Citação: fora dela, envolve; dentro, tira o bloco do cursor da citação mais próxima. */
export function alternarCitacao(): Command {
  return (estado, despachar) => {
    const tipoCitacao = tipoNo(estado, 'blockquote');
    if (profundidadeAncestral(estado, ['blockquote']) === null) {
      return wrapIn(tipoCitacao)(estado, despachar);
    }
    const { $from, $to } = estado.selection;
    const intervalo = $from.blockRange($to, (no) => no.type === tipoCitacao);
    const alvo = intervalo ? liftTarget(intervalo) : null;
    if (!intervalo || alvo === null) return lift(estado, despachar);
    if (despachar) despachar(estado.tr.lift(intervalo, alvo).scrollIntoView());
    return true;
  };
}

/**
 * Código em linha, sempre: com seleção, no trecho; sem seleção, no texto que vier a seguir (marca
 * armazenada). O `toggleInlineCodeCommand` do Milkdown devolve `false` sem seleção, e a barra
 * caía no `createCodeBlockCommand` — o parágrafo inteiro virava bloco de código sem aviso.
 */
export function alternarCodigoEmLinha(): Command {
  return (estado, despachar) => {
    const tipo = estado.schema.marks[MARCAS.CODIGO];
    return tipo ? toggleMark(tipo)(estado, despachar) : false;
  };
}
