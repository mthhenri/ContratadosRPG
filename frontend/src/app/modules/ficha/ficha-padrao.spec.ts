import { describe, expect, it } from 'vitest';
import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import { calcularEnergia, calcularVida } from '@contratados-rpg/shared/regras/agente';

import {
  ATRIBUTOS_BASE_PADRAO,
  construirFichaInicial,
  construirFichaPadrao,
  type OpcoesFichaInicial,
} from './ficha-padrao';

/**
 * Prova a montagem da ficha inicial do assistente de criação (m3-16): normaliza aos limites da
 * classe, aplica o bônus fixo de arquétipo, valida a Maestria e grava o snapshot de `shared/regras`.
 */
describe('construirFichaInicial', () => {
  const base = (parcial: Partial<OpcoesFichaInicial> = {}): OpcoesFichaInicial => ({
    nome: 'Agente Kane',
    classe: ClasseEnum.COMBATENTE,
    arquetipo: null,
    nivel: 3,
    prestigio: 2,
    atributos: { ...ATRIBUTOS_BASE_PADRAO },
    maestria: null,
    ...parcial,
  });

  it('grava o snapshot de Vida/Energia máximas de shared/regras (atuais cheias)', () => {
    const { dados } = construirFichaInicial(base({ atributos: { ...ATRIBUTOS_BASE_PADRAO, vigor: 4, destreza: 3 } }));
    const vida = calcularVida({ classe: ClasseEnum.COMBATENTE, nivel: 3, vigor: 4 });
    const energia = calcularEnergia({ classe: ClasseEnum.COMBATENTE, nivel: 3, destreza: 3 });
    expect(dados.estado.vidaMaxima).toBe(vida);
    expect(dados.estado.energiaMaxima).toBe(energia);
    expect(dados.estado.vidaAtual).toBe(vida);
    expect(dados.estado.energiaAtual).toBe(energia);
    expect(dados.derivados).toBeDefined();
  });

  it('soma o bônus fixo de Atributos do arquétipo aos atributos base', () => {
    const { dados } = construirFichaInicial(
      base({
        arquetipo: ArquetipoEnum.LUTADOR,
        atributos: { ...ATRIBUTOS_BASE_PADRAO, forca: 2, luta: 2 },
      }),
    );
    // Lutador concede +1 Força / +1 Luta (doc) — somado ao base.
    expect(dados.atributos.forca).toBe(3);
    expect(dados.atributos.luta).toBe(3);
    expect(dados.arquetipo).toBe(ArquetipoEnum.LUTADOR);
  });

  it('normaliza Nível e atributos aos limites do Civil e descarta o arquétipo', () => {
    const { dados } = construirFichaInicial(
      base({
        classe: ClasseEnum.CIVIL,
        arquetipo: ArquetipoEnum.LUTADOR,
        nivel: 12,
        atributos: { ...ATRIBUTOS_BASE_PADRAO, vigor: 7 },
      }),
    );
    expect(dados.classe).toBe(ClasseEnum.CIVIL);
    expect(dados.arquetipo).toBeNull(); // Civil não tem arquétipo
    expect(dados.nivel).toBe(5); // teto de Treinamentos do Civil
    expect(dados.atributos.vigor).toBe(3); // teto de atributo do Civil
  });

  it('valida a Maestria: mantém no atributo final 6+, descarta abaixo', () => {
    const mantida = construirFichaInicial(
      base({ atributos: { ...ATRIBUTOS_BASE_PADRAO, vigor: 6 }, maestria: 'vigor' }),
    );
    expect(mantida.dados.maestria).toBe('vigor');

    const descartada = construirFichaInicial(
      base({ atributos: { ...ATRIBUTOS_BASE_PADRAO, vigor: 4 }, maestria: 'vigor' }),
    );
    expect(descartada.dados.maestria).toBeNull();
  });

  it('o bônus de arquétipo pode habilitar a Maestria (total 6+)', () => {
    const { dados } = construirFichaInicial(
      base({
        arquetipo: ArquetipoEnum.LUTADOR, // +1 Força
        atributos: { ...ATRIBUTOS_BASE_PADRAO, forca: 5 },
        maestria: 'forca',
      }),
    );
    expect(dados.atributos.forca).toBe(6);
    expect(dados.maestria).toBe('forca');
  });

  it('apara o nome e cai no padrão quando vazio', () => {
    expect(construirFichaInicial(base({ nome: '  Vex  ' })).nome).toBe('Vex');
    expect(construirFichaInicial(base({ nome: '   ' })).nome).toBe('Novo agente');
  });

  it('nasce com o dinheiro inicial rolado (1000 + 4D4 × 250 — m3-31)', () => {
    const { dados } = construirFichaInicial(base());
    expect(dados.dinheiro).toBeGreaterThanOrEqual(2000);
    expect(dados.dinheiro).toBeLessThanOrEqual(5000);
  });
});

describe('construirFichaPadrao', () => {
  it('mantém a ficha padrão de fábrica (Combatente, nível 0, atributos base, sem Maestria)', () => {
    const { nome, dados } = construirFichaPadrao();
    expect(nome).toBe('Novo agente');
    expect(dados.classe).toBe(ClasseEnum.COMBATENTE);
    expect(dados.arquetipo).toBeNull();
    expect(dados.nivel).toBe(0);
    expect(dados.maestria).toBeNull();
    expect(dados.atributos).toEqual(ATRIBUTOS_BASE_PADRAO);
  });
});
