import type { FichaImagemArquivoDto } from '@contratados-rpg/shared/dtos/ficha';

/**
 * Conteúdo bruto de um upload de imagem, no value object da ficha. Um pedido sem arquivo vira um
 * arquivo vazio, que a service recusa com mensagem própria (em vez de a controller quebrar ao ler
 * `buffer` de `undefined`).
 */
export function montarArquivoImagem(arquivo: Express.Multer.File | undefined): FichaImagemArquivoDto {
  return {
    conteudo: arquivo?.buffer ?? new Uint8Array(),
    mimetype: arquivo?.mimetype ?? '',
    tamanho: arquivo?.size ?? 0,
  };
}
