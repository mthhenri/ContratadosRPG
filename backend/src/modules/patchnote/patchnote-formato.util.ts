import type { PatchnoteRecuperadoDto, PatchnoteResumoDto } from '@contratados-rpg/shared/dtos/patchnote';
import {
  PATCHNOTE_CONTEUDO_MAXIMO,
  PATCHNOTE_DATA_PADRAO,
  PATCHNOTE_TITULO_MAXIMO,
  compararVersoesPatchnote,
  ehVersaoPatchnoteValida,
} from '@contratados-rpg/shared/validators';

/**
 * Formato dos arquivos de patchnote no armazenamento (pn-03) — compartilhado pelo service, que lê,
 * e pelo script de publicação (pn-05), que grava. Cada nota é `patchnotes/<versao>.md` com front
 * matter simples:
 *
 * ```
 * ---
 * versao: 1.1.0
 * data: 2026-09-29
 * titulo: Cenas e Biblioteca de documentos
 * ---
 *
 * ## Novidades
 * ...
 * ```
 *
 * O índice é `patchnotes/indice.json`, um array de `PatchnoteResumoDto`.
 */

export type ResultadoLeituraPatchnote =
  | { readonly patchnote: PatchnoteRecuperadoDto }
  | { readonly erros: readonly string[] };

/** BOM (U+FEFF): editores no Windows costumam gravá-lo no início do arquivo. */
const CODIGO_MARCA_DE_ORDEM = 0xfeff;

function dataExiste(data: string): boolean {
  if (!PATCHNOTE_DATA_PADRAO.test(data)) {
    return false;
  }
  const instante = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(instante.getTime()) && instante.toISOString().startsWith(data);
}

function removerAspas(valor: string): string {
  const aspas = valor.match(/^(["'])(.*)\1$/);
  return aspas ? aspas[2] : valor;
}

/** Tira o BOM e uniformiza as quebras de linha para `\n` — a forma em que a nota é guardada. */
export function normalizarTextoPatchnote(texto: string): string {
  const semMarcaDeOrdem = texto.charCodeAt(0) === CODIGO_MARCA_DE_ORDEM ? texto.slice(1) : texto;
  return semMarcaDeOrdem.replace(/\r\n?/g, '\n');
}

/** Interpreta o texto de uma nota, validando front matter e corpo; nunca lança. */
export function interpretarPatchnote(texto: string): ResultadoLeituraPatchnote {
  const normalizado = normalizarTextoPatchnote(texto);
  const correspondencia = normalizado.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!correspondencia) {
    return { erros: ['O arquivo deve começar com um front matter entre linhas "---".'] };
  }

  const campos = new Map<string, string>();
  for (const linha of correspondencia[1].split('\n')) {
    const par = linha.match(/^([a-z]+):\s*(.*)$/);
    if (par) {
      campos.set(par[1], removerAspas(par[2].trim()));
    }
  }

  const versao = campos.get('versao') ?? '';
  const data = campos.get('data') ?? '';
  const titulo = campos.get('titulo') ?? '';
  const conteudoMarkdown = correspondencia[2].trim();

  const erros: string[] = [];
  if (!ehVersaoPatchnoteValida(versao)) {
    erros.push(`"versao" deve ser X.Y.Z (recebido: "${versao}").`);
  }
  if (!dataExiste(data)) {
    erros.push(`"data" deve ser uma data AAAA-MM-DD existente (recebido: "${data}").`);
  }
  if (titulo.length === 0 || titulo.length > PATCHNOTE_TITULO_MAXIMO) {
    erros.push(`"titulo" deve ter de 1 a ${PATCHNOTE_TITULO_MAXIMO} caracteres.`);
  }
  if (conteudoMarkdown.length === 0 || conteudoMarkdown.length > PATCHNOTE_CONTEUDO_MAXIMO) {
    erros.push(`O texto da nota deve ter de 1 a ${PATCHNOTE_CONTEUDO_MAXIMO} caracteres.`);
  }
  return erros.length > 0
    ? { erros }
    : { patchnote: { versao, data, titulo, conteudoMarkdown } };
}

/**
 * Interpreta o `indice.json`; `null` (arquivo ausente) é um índice vazio. JSON inválido ou fora do
 * formato lança — um índice corrompido não deve passar por "sem versões".
 */
export function interpretarIndicePatchnotes(texto: string | null): PatchnoteResumoDto[] {
  if (texto === null) {
    return [];
  }
  const bruto: unknown = JSON.parse(texto);
  if (!Array.isArray(bruto)) {
    throw new Error('O índice de patchnotes deve ser um array.');
  }
  return bruto.map((item: unknown) => {
    const { versao, data, titulo } = (item ?? {}) as Record<string, unknown>;
    if (
      typeof versao !== 'string' ||
      !ehVersaoPatchnoteValida(versao) ||
      typeof data !== 'string' ||
      !dataExiste(data) ||
      typeof titulo !== 'string' ||
      titulo.length === 0
    ) {
      throw new Error('Entrada inválida no índice de patchnotes.');
    }
    return { versao, data, titulo };
  });
}

/** Ordena do mais novo para o mais antigo, sem mutar a entrada. */
export function ordenarPatchnotes(itens: readonly PatchnoteResumoDto[]): PatchnoteResumoDto[] {
  return [...itens].sort((a, b) => compararVersoesPatchnote(b.versao, a.versao));
}
