import { describe, expect, it } from 'vitest';
import { montarArquivoImagem } from './arquivo-imagem.util';

describe('montarArquivoImagem', () => {
  it('monta o value object a partir do arquivo do Multer', () => {
    const buffer = Buffer.from([1, 2, 3]);

    expect(
      montarArquivoImagem({ buffer, mimetype: 'image/png', size: 3 } as Express.Multer.File),
    ).toEqual({ conteudo: buffer, mimetype: 'image/png', tamanho: 3 });
  });

  it('transforma a ausência de arquivo em arquivo vazio, em vez de quebrar', () => {
    expect(montarArquivoImagem(undefined)).toEqual({
      conteudo: new Uint8Array(),
      mimetype: '',
      tamanho: 0,
    });
  });
});
