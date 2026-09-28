/** Falhas previstas da leitura local de Markdown, comuns ao Caderno e à Biblioteca. */
export type FalhaImportacaoMarkdown = 'EXTENSAO' | 'TAMANHO' | 'VAZIO';

export const TAMANHO_MAXIMO_IMPORTACAO_BYTES = 1_000_000;

/** Valida metadados antes da leitura e, quando informado, o conteúdo já normalizado. */
export function validarArquivoMarkdown(
  arquivo: Pick<File, 'name' | 'size'>,
  limiteCaracteres: number,
  conteudoNormalizado?: string,
): FalhaImportacaoMarkdown | null {
  if (!/\.(?:md|markdown)$/iu.test(arquivo.name)) return 'EXTENSAO';
  if (arquivo.size > TAMANHO_MAXIMO_IMPORTACAO_BYTES) return 'TAMANHO';
  if (conteudoNormalizado !== undefined) {
    if (conteudoNormalizado.length > limiteCaracteres) return 'TAMANHO';
    if (!conteudoNormalizado) return 'VAZIO';
  }
  return null;
}

const MARCAS_INICIAIS = /^[\u200B-\u200F\uFEFF]+/u;
const FRONT_MATTER = /^---[ \t]*\n[\s\S]*?\n(?:---|\.\.\.)[ \t]*(?:\n[ \t]*)*/u;
const IMAGEM_MARKDOWN = /!\[([^\]]*)\]\(([^)]+)\)/gu;

export function possuiFrontMatterYaml(texto: string): boolean {
  return FRONT_MATTER.test(normalizarInicio(texto));
}

export function normalizarMarkdownImportado(texto: string): string {
  let markdown = normalizarInicio(texto).replace(FRONT_MATTER, '');
  let cerca: '`' | '~' | null = null;
  let tamanhoCerca = 0;
  markdown = markdown
    .split('\n')
    .map((linha) => {
      const marcador = linha.match(/^\s*(`{3,}|~{3,})/u)?.[1];
      if (marcador) {
        const caractere = marcador[0] as '`' | '~';
        if (cerca === null) {
          cerca = caractere;
          tamanhoCerca = marcador.length;
        } else if (caractere === cerca && marcador.length >= tamanhoCerca) {
          cerca = null;
          tamanhoCerca = 0;
        }
        return linha;
      }
      return cerca === null ? transformarForaDeCodigoInline(linha) : linha;
    })
    .join('\n')
    .trim();

  return markdown.length > 0 ? `${markdown}\n` : '';
}

function normalizarInicio(texto: string): string {
  return texto.replace(MARCAS_INICIAIS, '').replace(/\r\n?/gu, '\n');
}

function transformarForaDeCodigoInline(linha: string): string {
  let resultado = '';
  let inicio = 0;
  const codigos = linha.matchAll(/(`+)([\s\S]*?)\1/gu);
  for (const codigo of codigos) {
    const indice = codigo.index;
    resultado += transformarImagens(linha.slice(inicio, indice));
    resultado += codigo[0];
    inicio = indice + codigo[0].length;
  }
  return resultado + transformarImagens(linha.slice(inicio));
}

function transformarImagens(texto: string): string {
  return texto.replace(IMAGEM_MARKDOWN, (_imagem, alt: string, destino: string) => {
    const url = destino.trim().split(/\s+/u)[0] ?? '';
    return /^https?:\/\//iu.test(url) ? `[${alt}](${destino})` : alt;
  });
}
