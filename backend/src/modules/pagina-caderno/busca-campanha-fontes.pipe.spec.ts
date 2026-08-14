import { BuscaCampanhaFonteEnum } from '@contratados-rpg/shared/enums';
import { describe, expect, it } from 'vitest';

import { BuscaCampanhaFontesPipe } from './busca-campanha-fontes.pipe';

describe('BuscaCampanhaFontesPipe', () => {
  const pipe = new BuscaCampanhaFontesPipe();

  it('mantém ausência para a service aplicar as fontes padrão', () => {
    expect(pipe.transform(undefined)).toBeUndefined();
  });

  it('separa lista por vírgula e remove espaços vazios', () => {
    expect(pipe.transform('MEU_CADERNO, MINHAS_FICHAS,')).toEqual([
      BuscaCampanhaFonteEnum.MEU_CADERNO,
      BuscaCampanhaFonteEnum.MINHAS_FICHAS,
    ]);
  });

  it('normaliza parâmetros repetidos e deixa a validação dos códigos para a service', () => {
    expect(pipe.transform(['MEU_CADERNO', 'DESCONHECIDA,FICHAS_CAMPANHA'])).toEqual([
      'MEU_CADERNO',
      'DESCONHECIDA',
      'FICHAS_CAMPANHA',
    ]);
  });
});
