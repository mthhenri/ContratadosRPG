import { describe, expect, it } from 'vitest';
import type { FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import { ClasseEnum } from '@contratados-rpg/shared/enums';
import { omitirCamposPrivados, preservarCamposPrivados } from './ficha-campos-privados.util';

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

  it('remove anotacoes do dados (m3-51 — mesmo tratamento de historia)', () => {
    const dados = criarDados({ anotacoes: 'Anotações confidenciais.' });

    const dadosFiltrados = omitirCamposPrivados(dados);

    expect(dadosFiltrados.anotacoes).toBeUndefined();
    expect('anotacoes' in dadosFiltrados).toBe(false);
  });

  it('não mexe em outros campos nem no objeto original', () => {
    const dados = criarDados({ historia: 'Nasceu numa colônia orbital.' });

    const dadosFiltrados = omitirCamposPrivados(dados);

    expect(dadosFiltrados.classe).toBe(ClasseEnum.COMBATENTE);
    expect(dados.historia).toBe('Nasceu numa colônia orbital.');
    expect(dados.anotacoes).toBe('');
  });

  it('é um no-op de conteúdo quando não há historia nem anotacoes', () => {
    const dados = criarDados({ anotacoes: undefined });

    const dadosFiltrados = omitirCamposPrivados(dados);

    expect(dadosFiltrados).toEqual(dados);
  });
});

describe('preservarCamposPrivados', () => {
  it('copia do documento gravado os campos privados ausentes no enviado', () => {
    const gravados = criarDados({ anotacoes: 'Pista.', historia: 'Origem.' });
    const enviados = omitirCamposPrivados(criarDados({ nivel: 2 }));

    const resultado = preservarCamposPrivados(gravados, enviados);

    expect(resultado.anotacoes).toBe('Pista.');
    expect(resultado.historia).toBe('Origem.');
    expect(resultado.nivel).toBe(2);
    expect('anotacoes' in enviados).toBe(false);
  });

  it('respeita o valor enviado, inclusive vazio', () => {
    const gravados = criarDados({ anotacoes: 'Pista.' });

    expect(preservarCamposPrivados(gravados, criarDados({ anotacoes: '' })).anotacoes).toBe('');
    expect(preservarCamposPrivados(gravados, criarDados({ anotacoes: 'Nova.' })).anotacoes).toBe('Nova.');
  });

  it('não inventa a chave quando o documento gravado também não a tem', () => {
    const resultado = preservarCamposPrivados(criarDados(), omitirCamposPrivados(criarDados()));

    expect('historia' in resultado).toBe(false);
  });
});
