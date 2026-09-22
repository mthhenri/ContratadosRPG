import { describe, expect, it } from 'vitest';

import { resolverMachucadoPelaVida } from './machucado';

describe('resolverMachucadoPelaVida', () => {
  it('liga com Vida na metade ou abaixo', () => {
    expect(resolverMachucadoPelaVida({ vidaAtual: 20, vidaMaxima: 40, machucado: false })).toBe(true);
    expect(resolverMachucadoPelaVida({ vidaAtual: 0, vidaMaxima: 40, machucado: false })).toBe(true);
  });

  it('mantém o valor entre 50% e 99% (histerese)', () => {
    expect(resolverMachucadoPelaVida({ vidaAtual: 21, vidaMaxima: 40, machucado: true })).toBe(true);
    expect(resolverMachucadoPelaVida({ vidaAtual: 39, vidaMaxima: 40, machucado: true })).toBe(true);
    expect(resolverMachucadoPelaVida({ vidaAtual: 21, vidaMaxima: 40, machucado: false })).toBe(false);
  });

  it('desliga só com Vida em 100%', () => {
    expect(resolverMachucadoPelaVida({ vidaAtual: 40, vidaMaxima: 40, machucado: true })).toBe(false);
  });

  it('sem Vida máxima mantém o valor', () => {
    expect(resolverMachucadoPelaVida({ vidaAtual: 1, machucado: false })).toBe(false);
    expect(resolverMachucadoPelaVida({ vidaAtual: 1, machucado: true })).toBe(true);
  });
});
