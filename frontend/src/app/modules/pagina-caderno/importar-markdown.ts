import {
  PAGINA_CADERNO_TITULO_MAXIMO,
} from '@contratados-rpg/shared/validators';

export interface MarkdownImportadoDto {
  readonly titulo: string;
  readonly conteudoMarkdown: string;
}

export type FalhaImportacaoMarkdown = 'EXTENSAO' | 'TAMANHO' | 'VAZIO';

const MARCAS_INICIAIS = /^[\u200B-\u200F\uFEFF]+/u;
const FRONT_MATTER = /^---[ \t]*\n[\s\S]*?\n(?:---|\.\.\.)[ \t]*(?:\n[ \t]*)*/u;
const IMAGEM_MARKDOWN = /!\[([^\]]*)\]\(([^)]+)\)/gu;

export function derivarTituloDeArquivo(nomeArquivo: string): string {
  const nome = nomeArquivo.split(/[\\/]/u).at(-1) ?? '';
  const semExtensao = nome.replace(/\.(?:md|markdown)$/iu, '');
  const normalizado = semExtensao.replace(/\s+/gu, ' ').trim() || 'Página importada';
  return normalizado.slice(0, PAGINA_CADERNO_TITULO_MAXIMO).trim();
}

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
