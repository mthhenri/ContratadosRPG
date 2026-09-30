import { describe, expect, it } from 'vitest';
import {
  DOCUMENTO_IMAGEM_MIMES_PERMITIDOS,
  IMAGEM_EXTENSAO_POR_MIME,
  IMAGEM_MIMES_ACCEPT,
  IMAGEM_MIMES_PERMITIDOS,
} from './index';

describe('formatos de imagem aceitos', () => {
  it('derivam todos da mesma tabela MIME → extensão', () => {
    expect(IMAGEM_MIMES_PERMITIDOS).toEqual(Object.keys(IMAGEM_EXTENSAO_POR_MIME));
    expect(IMAGEM_MIMES_ACCEPT).toBe(IMAGEM_MIMES_PERMITIDOS.join(','));
    expect(DOCUMENTO_IMAGEM_MIMES_PERMITIDOS).toBe(IMAGEM_MIMES_PERMITIDOS);
  });

  it('aceita JPEG, PNG e WEBP, cada um com sua extensão', () => {
    expect(IMAGEM_EXTENSAO_POR_MIME).toEqual({
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    });
  });
});
