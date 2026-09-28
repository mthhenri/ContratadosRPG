import {
  PAGINA_CADERNO_TITULO_MAXIMO,
} from '@contratados-rpg/shared/validators';

export interface MarkdownImportadoDto {
  readonly titulo: string;
  readonly conteudoMarkdown: string;
}

export function derivarTituloDeArquivo(nomeArquivo: string): string {
  const nome = nomeArquivo.split(/[\\/]/u).at(-1) ?? '';
  const semExtensao = nome.replace(/\.(?:md|markdown)$/iu, '');
  const normalizado = semExtensao.replace(/\s+/gu, ' ').trim() || 'Página importada';
  return normalizado.slice(0, PAGINA_CADERNO_TITULO_MAXIMO).trim();
}
