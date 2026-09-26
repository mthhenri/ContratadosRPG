import { describe, expect, it } from 'vitest';

import { DocumentoAlteracaoEnum, TipoDocumentoEnum } from '../../enums';
import {
  DOCUMENTO_CONTEUDO_MAXIMO,
  DOCUMENTO_IMAGEM_MIMES_PERMITIDOS,
  DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES,
  DOCUMENTO_TITULO_MAXIMO,
} from '../../validators';

describe('contratos de documento de campanha', () => {
  it('preserva os códigos públicos dos tipos de documento', () => {
    expect(Object.values(TipoDocumentoEnum)).toEqual(['TEXTO', 'IMAGEM']);
  });

  it('preserva os códigos públicos do evento documento:alterado', () => {
    expect(Object.values(DocumentoAlteracaoEnum)).toEqual([
      'CRIADO',
      'ALTERADO',
      'REVELADO',
      'OCULTADO',
      'REMOVIDO',
      'REORDENADO',
    ]);
  });

  it('expõe os mesmos limites usados pelas três camadas', () => {
    expect({
      titulo: DOCUMENTO_TITULO_MAXIMO,
      conteudo: DOCUMENTO_CONTEUDO_MAXIMO,
      imagemBytes: DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES,
      mimes: DOCUMENTO_IMAGEM_MIMES_PERMITIDOS,
    }).toEqual({
      titulo: 120,
      conteudo: 100_000,
      imagemBytes: 10_485_760,
      mimes: ['image/jpeg', 'image/png', 'image/webp'],
    });
  });
});
