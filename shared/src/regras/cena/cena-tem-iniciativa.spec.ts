import { describe, expect, it } from 'vitest';
import { CenaTipoEnum } from '../../enums';
import { cenaTemIniciativa } from './cena-tem-iniciativa';

describe('cenaTemIniciativa', () => {
  it.each([CenaTipoEnum.COMBATE, CenaTipoEnum.FURTIVA, CenaTipoEnum.PERSEGUICAO])(
    '%s conduz iniciativa',
    (tipo) => {
      expect(cenaTemIniciativa(tipo)).toBe(true);
    },
  );

  it.each([CenaTipoEnum.INVESTIGACAO, CenaTipoEnum.RESISTENCIA])(
    '%s não conduz iniciativa',
    (tipo) => {
      expect(cenaTemIniciativa(tipo)).toBe(false);
    },
  );

  it('cobre todos os valores do enum', () => {
    const cobertos = [
      CenaTipoEnum.COMBATE,
      CenaTipoEnum.FURTIVA,
      CenaTipoEnum.PERSEGUICAO,
      CenaTipoEnum.INVESTIGACAO,
      CenaTipoEnum.RESISTENCIA,
    ];
    expect([...cobertos].sort()).toEqual(Object.values(CenaTipoEnum).sort());
  });
});
