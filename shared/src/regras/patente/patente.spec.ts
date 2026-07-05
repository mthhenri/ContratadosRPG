import { describe, expect, it } from 'vitest';
import { PatenteEnum } from '../../enums';
import { PATENTES } from '../dados';
import { calcularPatente, obterPatente } from './patente';

/**
 * Lookup de patente por Prestígio conferido contra docs/core/sistema-v4.1.0.md —
 * "Prestígio e Patentes" (faixas: Agente 0–2, Operador 3–5, Experiente 6–11,
 * Veterano 12–20, Força Tarefa 21–32, Força Tarefa Especial 33–47, Operações
 * Especiais 48–65, Líder Operacional 66+).
 */
describe('obterPatente', () => {
  it('resolve os limites de cada faixa de Prestígio', () => {
    expect(obterPatente({ prestigio: 0 }).patente).toBe(PatenteEnum.AGENTE);
    expect(obterPatente({ prestigio: 2 }).patente).toBe(PatenteEnum.AGENTE);
    expect(obterPatente({ prestigio: 3 }).patente).toBe(PatenteEnum.OPERADOR);
    expect(obterPatente({ prestigio: 5 }).patente).toBe(PatenteEnum.OPERADOR);
    expect(obterPatente({ prestigio: 6 }).patente).toBe(PatenteEnum.EXPERIENTE);
    expect(obterPatente({ prestigio: 11 }).patente).toBe(PatenteEnum.EXPERIENTE);
    expect(obterPatente({ prestigio: 12 }).patente).toBe(PatenteEnum.VETERANO);
    expect(obterPatente({ prestigio: 20 }).patente).toBe(PatenteEnum.VETERANO);
    expect(obterPatente({ prestigio: 21 }).patente).toBe(PatenteEnum.FORCA_TAREFA);
    expect(obterPatente({ prestigio: 32 }).patente).toBe(PatenteEnum.FORCA_TAREFA);
    expect(obterPatente({ prestigio: 33 }).patente).toBe(PatenteEnum.FORCA_TAREFA_ESPECIAL);
    expect(obterPatente({ prestigio: 47 }).patente).toBe(PatenteEnum.FORCA_TAREFA_ESPECIAL);
    expect(obterPatente({ prestigio: 48 }).patente).toBe(PatenteEnum.OPERACOES_ESPECIAIS);
    expect(obterPatente({ prestigio: 65 }).patente).toBe(PatenteEnum.OPERACOES_ESPECIAIS);
  });

  it('Prestígio 66+ (sem limite superior) resolve Líder Operacional', () => {
    expect(obterPatente({ prestigio: 66 }).patente).toBe(PatenteEnum.LIDER_OPERACIONAL);
    expect(obterPatente({ prestigio: 9999 }).patente).toBe(PatenteEnum.LIDER_OPERACIONAL);
  });

  it('devolve a linha completa da tabela (salário e multiplicador da patente)', () => {
    const forcaTarefa = obterPatente({ prestigio: 24 });
    expect(forcaTarefa.patente).toBe(PatenteEnum.FORCA_TAREFA);
    expect(forcaTarefa.salario).toBe(4500);
    expect(forcaTarefa.multiplicador).toBe(3.0);
  });
});

describe('calcularPatente', () => {
  it('devolve a patente atual mais a tabela completa de patentes', () => {
    const consulta = calcularPatente({ prestigio: 24 });
    expect(consulta.patenteAtual.patente).toBe(PatenteEnum.FORCA_TAREFA);
    expect(consulta.tabela).toBe(PATENTES);
    expect(consulta.tabela).toHaveLength(8);
  });
});
