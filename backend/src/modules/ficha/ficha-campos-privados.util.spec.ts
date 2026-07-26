import { describe, expect, it } from 'vitest';
import type { FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import { ClasseEnum } from '@contratados-rpg/shared/enums';
import { omitirCamposPrivados } from './ficha-campos-privados.util';

function criarDados(overrides: Partial<FichaJogadorDadosDto> = {}): FichaJogadorDadosDto {
  return {
    classe: ClasseEnum.COMBATENTE,
    arquetipo: null,
    nivel: 1,
    prestigio: 0,
    atributos: {
      destreza: 1,
      forca: 1,
      luta: 1,
      pontaria: 1,
      vigor: 1,
      intelecto: 1,
      medicina: 1,
      sentidos: 1,
      social: 1,
      vontade: 1,
    },
    maestria: null,
    estado: { vidaAtual: 10, energiaAtual: 5, sequelas: [], traumas: [], lesoes: [] },
    habilidades: [],
    inventario: { itens: [], amplificadores: [] },
    anotacoes: '',
    ...overrides,
  };
}

describe('omitirCamposPrivados', () => {
  it('remove historia do dados', () => {
    const dados = criarDados({ historia: 'Nasceu numa colônia orbital.' });

    const dadosFiltrados = omitirCamposPrivados(dados);

    expect(dadosFiltrados.historia).toBeUndefined();
    expect('historia' in dadosFiltrados).toBe(false);
  });

  it('não mexe em outros campos nem no objeto original', () => {
    const dados = criarDados({ historia: 'Nasceu numa colônia orbital.' });

    const dadosFiltrados = omitirCamposPrivados(dados);

    expect(dadosFiltrados.classe).toBe(ClasseEnum.COMBATENTE);
    expect(dadosFiltrados.anotacoes).toBe('');
    expect(dados.historia).toBe('Nasceu numa colônia orbital.');
  });

  it('é um no-op de conteúdo quando não há historia', () => {
    const dados = criarDados();

    const dadosFiltrados = omitirCamposPrivados(dados);

    expect(dadosFiltrados).toEqual(dados);
  });
});
