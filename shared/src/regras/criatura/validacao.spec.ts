import { describe, expect, it } from 'vitest';
import {
  CadenciaEnum,
  ComportamentoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  TenacidadeEnum,
  TipoDanoEnum,
} from '../../enums';
import type { FichaCriaturaDadosDto } from '../../dtos/ficha';
import { validarFichaCriatura } from './validacao';

function construirFichaValida(sobrescritas: Partial<FichaCriaturaDadosDto> = {}): FichaCriaturaDadosDto {
  return {
    identidade: {
      designacao: 'Criatura de Teste',
      origem: OrigemCriaturaEnum.ORIGINAL,
      conceito: 'Uma criatura de teste.',
      naturezaFisica: 'Humanoide.',
      comportamento: ComportamentoCriaturaEnum.CACADORA,
      motivacao: 'Testar.',
      ganchoUnico: 'Nenhum.',
    },
    na: NivelAmeacaEnum.MEDIA,
    vd: 30,
    atributos: {
      destreza: 4, forca: 3, luta: 5, pontaria: 2, vigor: 3,
      intelecto: 2, medicina: 2, sentidos: 3, social: 0, vontade: 2,
    },
    modificadores: {
      destreza: ModificadorCriaturaEnum.FORTE,
      luta: ModificadorCriaturaEnum.FORTE,
      forca: ModificadorCriaturaEnum.MEDIO,
      vigor: ModificadorCriaturaEnum.MEDIO,
      sentidos: ModificadorCriaturaEnum.MEDIO,
      intelecto: ModificadorCriaturaEnum.FRACO,
      medicina: ModificadorCriaturaEnum.FRACO,
      vontade: ModificadorCriaturaEnum.FRACO,
      pontaria: ModificadorCriaturaEnum.FRAGIL,
      social: ModificadorCriaturaEnum.FRAGIL,
    },
    tenacidade: TenacidadeEnum.PADRAO,
    vidaMaxima: 1050,
    vidaAtual: 1050,
    defesa: 30,
    resistencias: [
      { tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 36 },
      { tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 16 },
    ],
    fraquezas: [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: null, valor: 26 }],
    porte: PorteCriaturaEnum.MEDIO,
    deslocamento: { terrestre: 9 },
    cadencia: CadenciaEnum.SINGULAR,
    ataques: [],
    habilidades: [],
    ...sobrescritas,
  };
}

describe('validarFichaCriatura', () => {
  it('sem violações para uma ficha coerente', () => {
    expect(validarFichaCriatura(construirFichaValida())).toEqual({ violacoes: [] });
  });

  it('acusa resistências acima do Limite', () => {
    const { violacoes } = validarFichaCriatura(
      construirFichaValida({ resistencias: [{ tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 61 }] }),
    );
    expect(violacoes).toContainEqual(expect.stringContaining('resistências: custo total'));
  });

  it('acusa ausência de fraqueza', () => {
    const { violacoes } = validarFichaCriatura(construirFichaValida({ fraquezas: [] }));
    expect(violacoes).toContain('fraquezas: ao menos uma fraqueza é obrigatória');
  });

  it('acusa fraqueza abaixo do mínimo', () => {
    const { violacoes } = validarFichaCriatura(
      construirFichaValida({ fraquezas: [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: null, valor: 20 }] }),
    );
    expect(violacoes).toContainEqual(expect.stringContaining('fraquezas:'));
  });

  it('acusa o mesmo tipo em resistência e fraqueza', () => {
    const { violacoes } = validarFichaCriatura(
      construirFichaValida({ fraquezas: [{ tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 26 }] }),
    );
    expect(violacoes).toContainEqual(expect.stringContaining('também é fraqueza'));
  });

  it('acusa distribuição de modificadores fora de 2/3/3/2', () => {
    const { violacoes } = validarFichaCriatura(
      construirFichaValida({
        modificadores: {
          destreza: ModificadorCriaturaEnum.FORTE,
          luta: ModificadorCriaturaEnum.FORTE,
          forca: ModificadorCriaturaEnum.FORTE,
          vigor: ModificadorCriaturaEnum.MEDIO,
          sentidos: ModificadorCriaturaEnum.MEDIO,
          intelecto: ModificadorCriaturaEnum.FRACO,
          medicina: ModificadorCriaturaEnum.FRACO,
          vontade: ModificadorCriaturaEnum.FRACO,
          pontaria: ModificadorCriaturaEnum.FRAGIL,
          social: ModificadorCriaturaEnum.FRAGIL,
        },
      }),
    );
    expect(violacoes).toContainEqual(expect.stringContaining('FORTE tem 3, esperado 2'));
  });

  it('acusa ausência de deslocamento', () => {
    const { violacoes } = validarFichaCriatura(construirFichaValida({ deslocamento: {} }));
    expect(violacoes).toContain('deslocamento: ao menos um modo deve ser declarado');
  });
});
