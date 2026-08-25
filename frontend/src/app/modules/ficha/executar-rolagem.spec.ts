import { describe, expect, it } from 'vitest';

import type { FichaAtributosDto, FichaRolagemDto } from '@contratados-rpg/shared/dtos/ficha';
import { executarPassoPreset } from './executar-rolagem';

const atributos: FichaAtributosDto = {
  destreza: 2,
  forca: 3,
  luta: 2,
  pontaria: 1,
  vigor: 4,
  intelecto: 1,
  medicina: 1,
  sentidos: 2,
  social: 1,
  vontade: 2,
};

const presetIniciativa: FichaRolagemDto = { nome: 'Iniciativa', formula: 'DESd6' };

describe('executarPassoPreset — dado extra de Iniciativa', () => {
  it('sem dadoExtraIniciativa, rola exatamente Destreza dados (comportamento atual)', () => {
    const executado = executarPassoPreset({
      preset: presetIniciativa,
      atributos,
      proficiencia: null,
      nivel: 1,
      habilidadesDisponiveis: [],
      indicePasso: 0,
    });
    expect(executado?.resultado.dados[0]?.valores).toHaveLength(atributos.destreza);
  });

  it('com dadoExtraIniciativa, soma no pool de dados (Atento + Formação PERICIA_DADO_INICIATIVA)', () => {
    const executado = executarPassoPreset({
      preset: presetIniciativa,
      atributos,
      proficiencia: null,
      nivel: 1,
      habilidadesDisponiveis: [],
      indicePasso: 0,
      dadoExtraIniciativa: 2,
    });
    expect(executado?.resultado.dados[0]?.valores).toHaveLength(atributos.destreza + 2);
  });

  it('não altera outros presets baseados em Destreza (o bônus é só da Iniciativa)', () => {
    const outroPreset: FichaRolagemDto = { nome: 'Furtividade', formula: 'DESd20kh1' };
    const executado = executarPassoPreset({
      preset: outroPreset,
      atributos,
      proficiencia: null,
      nivel: 1,
      habilidadesDisponiveis: [],
      indicePasso: 0,
      dadoExtraIniciativa: 2,
    });
    expect(executado?.resultado.dados[0]?.valores).toHaveLength(atributos.destreza);
  });
});

describe('executarPassoPreset — Iniciativa rola pelo atributo, não pelo atributo de testes', () => {
  /** `atributos` simula o atributo ajustado pra testes (ex.: `dadosTeste`/equipamento já somados). */
  const atributosParaTestes: FichaAtributosDto = { ...atributos, destreza: 5 };
  /** `atributosEfetivos` simula o atributo puro (base − lesões), sem esses ajustes de teste. */
  const atributosEfetivos: FichaAtributosDto = { ...atributos, destreza: 2 };

  it('usa atributosEfetivos para a Iniciativa quando fornecido, ignorando atributos', () => {
    const executado = executarPassoPreset({
      preset: presetIniciativa,
      atributos: atributosParaTestes,
      atributosEfetivos,
      proficiencia: null,
      nivel: 1,
      habilidadesDisponiveis: [],
      indicePasso: 0,
    });
    expect(executado?.resultado.dados[0]?.valores).toHaveLength(atributosEfetivos.destreza);
  });

  it('soma o dado extra de Iniciativa por cima de atributosEfetivos', () => {
    const executado = executarPassoPreset({
      preset: presetIniciativa,
      atributos: atributosParaTestes,
      atributosEfetivos,
      proficiencia: null,
      nivel: 1,
      habilidadesDisponiveis: [],
      indicePasso: 0,
      dadoExtraIniciativa: 2,
    });
    expect(executado?.resultado.dados[0]?.valores).toHaveLength(atributosEfetivos.destreza + 2);
  });

  it('sem atributosEfetivos, cai em atributos (compatibilidade)', () => {
    const executado = executarPassoPreset({
      preset: presetIniciativa,
      atributos: atributosParaTestes,
      proficiencia: null,
      nivel: 1,
      habilidadesDisponiveis: [],
      indicePasso: 0,
    });
    expect(executado?.resultado.dados[0]?.valores).toHaveLength(atributosParaTestes.destreza);
  });

  it('não usa atributosEfetivos para outros presets (só a Iniciativa é especial)', () => {
    const outroPreset: FichaRolagemDto = { nome: 'Furtividade', formula: 'DESd20kh1' };
    const executado = executarPassoPreset({
      preset: outroPreset,
      atributos: atributosParaTestes,
      atributosEfetivos,
      proficiencia: null,
      nivel: 1,
      habilidadesDisponiveis: [],
      indicePasso: 0,
    });
    expect(executado?.resultado.dados[0]?.valores).toHaveLength(atributosParaTestes.destreza);
  });
});
