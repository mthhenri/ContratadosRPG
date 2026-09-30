/**
 * Formatos de imagem aceitos em qualquer upload (avatar de ficha e de combatente, imagem de
 * documento): uma só lista para o cliente validar, o backend validar de verdade e o OpenAPI
 * documentar. Aceitar um formato novo é acrescentá-lo aqui, com a extensão do blob.
 */
export const IMAGEM_EXTENSAO_POR_MIME: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const IMAGEM_MIMES_PERMITIDOS: readonly string[] = Object.keys(IMAGEM_EXTENSAO_POR_MIME);

/** Valor do atributo `accept` de um `<input type="file">` de imagem. */
export const IMAGEM_MIMES_ACCEPT = IMAGEM_MIMES_PERMITIDOS.join(',');
