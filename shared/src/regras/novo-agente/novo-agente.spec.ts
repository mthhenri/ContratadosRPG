import { describe, expect, it } from 'vitest';
import { MotivoEntradaAgenteEnum, PatenteEnum } from '../../enums';
import {
  calcularBonusMonetario,
  calcularDinheiroInicial,
  calcularNivelInicial,
  calcularNovoAgente,
  calcularPrestigioInicial,
  rolarDinheiroInicial,
} from './novo-agente';

/**
 * Fórmulas de novo agente conferidas contra docs/core/sistema-v4.1.0.md —
 * "Iniciando um Novo Agente" (Nível Inicial, Prestígio Inicial, Bônus Monetário)
 * e "Aposentadoria" > "Contido ou Exterminado" (divisores por humanidade do
 * sucessor). Os exemplos numéricos do documento estão replicados abaixo.
 */
describe('calcularNivelInicial', () => {
  it('média 5,0 → arredonda 5, subtrai 1 → 4 (exemplo do documento)', () => {
    expect(calcularNivelInicial({ mediaNivel: 5.0 })).toBe(4);
  });

  it('arredonda 0,5 para cima antes de subtrair 1', () => {
    expect(calcularNivelInicial({ mediaNivel: 5.5 })).toBe(5);
    expect(calcularNivelInicial({ mediaNivel: 4.5 })).toBe(4);
    expect(calcularNivelInicial({ mediaNivel: 4.4 })).toBe(3);
  });

  it('nunca inicia abaixo de Nível 0', () => {
    expect(calcularNivelInicial({ mediaNivel: 1.0 })).toBe(0);
    expect(calcularNivelInicial({ mediaNivel: 0.4 })).toBe(0);
    expect(calcularNivelInicial({ mediaNivel: 0 })).toBe(0);
  });
});

describe('calcularPrestigioInicial', () => {
  it('Por Morte ou Início do zero: média 28 ÷7 → 24 (exemplo do documento)', () => {
    const resultado = calcularPrestigioInicial({
      motivo: MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO,
      mediaPrestigio: 28,
    });
    expect(resultado.deducao).toBe(4);
    expect(resultado.prestigioInicial).toBe(24);
    expect(resultado.patenteGrupo.patente).toBe(PatenteEnum.FORCA_TAREFA);
    expect(resultado.patenteCapMinimo.patente).toBe(PatenteEnum.FORCA_TAREFA);
  });

  it('Por Aposentadoria: média 28 ÷10 → 26 (exemplo do documento)', () => {
    const resultado = calcularPrestigioInicial({
      motivo: MotivoEntradaAgenteEnum.APOSENTADORIA,
      mediaPrestigio: 28,
    });
    expect(resultado.deducao).toBe(2);
    expect(resultado.prestigioInicial).toBe(26);
  });

  it('Experimento (sucessor convencional): média 28 ÷5 → 23, podendo cair até Veterano', () => {
    const resultado = calcularPrestigioInicial({
      motivo: MotivoEntradaAgenteEnum.EXPERIMENTO_SUCESSOR_CONVENCIONAL,
      mediaPrestigio: 28,
    });
    expect(resultado.deducao).toBe(5);
    expect(resultado.prestigioInicial).toBe(23);
    expect(resultado.patenteGrupo.patente).toBe(PatenteEnum.FORCA_TAREFA);
    // permite iniciar uma patente abaixo (piso vira Veterano), embora 23 ainda seja Força Tarefa
    expect(resultado.patenteCapMinimo.patente).toBe(PatenteEnum.VETERANO);
  });

  it('Contido ou Exterminado, sucessor convencional: média 30 ÷5 → 24 Força Tarefa (exemplo do documento)', () => {
    const resultado = calcularPrestigioInicial({
      motivo: MotivoEntradaAgenteEnum.CONTIDO_OU_EXTERMINADO_SUCESSOR_CONVENCIONAL,
      mediaPrestigio: 30,
    });
    expect(resultado.deducao).toBe(6);
    expect(resultado.prestigioInicial).toBe(24);
    expect(resultado.patenteCapMinimo.patente).toBe(PatenteEnum.VETERANO);
  });

  it('Contido ou Exterminado, sucessor Experimento: média 30 ÷3 → 20 Veterano (exemplo do documento)', () => {
    const resultado = calcularPrestigioInicial({
      motivo: MotivoEntradaAgenteEnum.CONTIDO_OU_EXTERMINADO_SUCESSOR_EXPERIMENTO,
      mediaPrestigio: 30,
    });
    expect(resultado.deducao).toBe(10);
    expect(resultado.prestigioInicial).toBe(20);
  });

  it('o piso impede cair abaixo da patente da média do grupo (sem permitir patente abaixo)', () => {
    // Veterano no mínimo (12): dedução ⌊12÷7⌋=1 → 11, mas o piso Veterano o eleva a 12.
    const resultado = calcularPrestigioInicial({
      motivo: MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO,
      mediaPrestigio: 12,
    });
    expect(resultado.prestigioInicial).toBe(12);
    expect(resultado.patenteCapMinimo.patente).toBe(PatenteEnum.VETERANO);
  });

  it('na patente inicial (Agente) o piso não desce, mesmo permitindo patente abaixo', () => {
    const resultado = calcularPrestigioInicial({
      motivo: MotivoEntradaAgenteEnum.EXPERIMENTO_SUCESSOR_EXPERIMENTO,
      mediaPrestigio: 2,
    });
    expect(resultado.patenteGrupo.patente).toBe(PatenteEnum.AGENTE);
    expect(resultado.patenteCapMinimo.patente).toBe(PatenteEnum.AGENTE);
    expect(resultado.prestigioInicial).toBe(2);
  });
});

describe('calcularBonusMonetario', () => {
  it('Prestígio 24 na Força Tarefa (3×) → 24 × (500 × 3) = 36.000 (exemplo do documento)', () => {
    const resultado = calcularBonusMonetario({ prestigioInicial: 24 });
    expect(resultado.patente.patente).toBe(PatenteEnum.FORCA_TAREFA);
    expect(resultado.bonus).toBe(36000);
  });

  it('Prestígio 0 (Agente, 1×) → sem bônus', () => {
    expect(calcularBonusMonetario({ prestigioInicial: 0 }).bonus).toBe(0);
  });
});

describe('calcularDinheiroInicial', () => {
  it('1000 + soma × 250 (exemplo do documento: 1000 + 4D4 × 250)', () => {
    expect(calcularDinheiroInicial({ somaDados: 4 })).toEqual({ dinheiro: 2000, somaDados: 4 });
    expect(calcularDinheiroInicial({ somaDados: 16 })).toEqual({ dinheiro: 5000, somaDados: 16 });
    expect(calcularDinheiroInicial({ somaDados: 10 })).toEqual({ dinheiro: 3500, somaDados: 10 });
  });
});

describe('rolarDinheiroInicial', () => {
  it('rola 4D4 e aplica a fórmula — sempre dentro da faixa $2.000–$5.000', () => {
    for (let tentativa = 0; tentativa < 50; tentativa++) {
      const resultado = rolarDinheiroInicial();
      expect(resultado.somaDados).toBeGreaterThanOrEqual(4);
      expect(resultado.somaDados).toBeLessThanOrEqual(16);
      expect(resultado.dinheiro).toBe(1000 + resultado.somaDados * 250);
    }
  });
});

describe('calcularNovoAgente', () => {
  it('agrega Nível, Prestígio, patente resultante e bônus (Morte, média Nível 5, média Prestígio 28)', () => {
    const resultado = calcularNovoAgente({
      motivo: MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO,
      mediaNivel: 5,
      mediaPrestigio: 28,
    });
    expect(resultado.nivelInicial).toBe(4);
    expect(resultado.prestigio.prestigioInicial).toBe(24);
    expect(resultado.patenteResultante.patente).toBe(PatenteEnum.FORCA_TAREFA);
    expect(resultado.bonus.bonus).toBe(36000);
    expect(resultado.recebeAmaldicoadoPeloPassado).toBe(false);
  });

  it('marca Amaldiçoado pelo Passado apenas em Contenção ou Extermínio', () => {
    const contido = calcularNovoAgente({
      motivo: MotivoEntradaAgenteEnum.CONTIDO_OU_EXTERMINADO_SUCESSOR_EXPERIMENTO,
      mediaNivel: 6,
      mediaPrestigio: 30,
    });
    expect(contido.recebeAmaldicoadoPeloPassado).toBe(true);

    const experimento = calcularNovoAgente({
      motivo: MotivoEntradaAgenteEnum.EXPERIMENTO_SUCESSOR_EXPERIMENTO,
      mediaNivel: 6,
      mediaPrestigio: 30,
    });
    expect(experimento.recebeAmaldicoadoPeloPassado).toBe(false);
  });
});
