import { HabilidadeCategoriaEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';

import {
  ICONE_CATEGORIA_HABILIDADE,
  ICONE_REACAO,
  ICONE_TIPO_DANO,
  iconeDefesa,
  iconeTipoDano,
} from './icones-dominio';

describe('icones-dominio', () => {
  it('cobre todos os tipos de dano e todas as categorias de habilidade', () => {
    for (const tipo of Object.values(TipoDanoEnum)) {
      expect(ICONE_TIPO_DANO[tipo]).toMatch(/^dano-/);
    }
    for (const categoria of Object.values(HabilidadeCategoriaEnum)) {
      expect(ICONE_CATEGORIA_HABILIDADE[categoria]).toMatch(/^habilidade-/);
    }
  });

  it('usa um ícone distinto por conceito', () => {
    const nomes = [
      ...Object.values(ICONE_TIPO_DANO),
      ...Object.values(ICONE_CATEGORIA_HABILIDADE),
      ...Object.values(ICONE_REACAO),
    ];
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('iconeTipoDano devolve null para texto que não é um tipo de dano', () => {
    expect(iconeTipoDano('Físico')).toBe('dano-fisico');
    expect(iconeTipoDano('Fís')).toBeNull();
    expect(iconeTipoDano('')).toBeNull();
    expect(iconeTipoDano(undefined)).toBeNull();
  });

  it('iconeDefesa mapeia os rótulos de defesa do encontro', () => {
    expect(iconeDefesa('Defesa')).toBe('defesa');
    expect(iconeDefesa('Esquiva')).toBe('reacao-esquiva');
    expect(iconeDefesa('Bloqueio')).toBe('reacao-bloqueio');
    expect(iconeDefesa('Contra')).toBe('reacao-contra-ataque');
    expect(iconeDefesa('Contra-ataque')).toBe('reacao-contra-ataque');
    expect(iconeDefesa('Esq')).toBeNull();
  });
});
