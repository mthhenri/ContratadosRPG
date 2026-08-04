import { describe, expect, it } from 'vitest';
import type { FichaAtributosDto, FichaDerivadosDto } from '../../dtos/ficha';
import { FragmentoModuloEnum } from '../../enums';
import { listarBonusConsumoFragmentoPotencializador } from '../compras';
import {
  aplicarBonusConsumoFragmento,
  reverterBonusConsumoFragmento,
  type EfeitoConsumoFragmentoDto,
} from './fragmento-consumo';

/**
 * `aplicarBonusConsumoFragmento` conferida contra `docs/core/sistema-v4.1.0.md` — "⬦
 * Potencializador", coluna "Consumido" (m3-64): o bônus é do agente, permanente — soma direto nos
 * campos persistidos (`modificadoresTeste`/`derivados`/`atributos`), nunca recalculado ao vivo (o
 * fragmento consumido não existe mais para reprocessar).
 */
const ATRIBUTOS: FichaAtributosDto = {
  destreza: 2,
  forca: 2,
  luta: 2,
  pontaria: 2,
  vigor: 2,
  intelecto: 2,
  medicina: 2,
  sentidos: 2,
  social: 2,
  vontade: 2,
};

const DERIVADOS: FichaDerivadosDto = {
  defesa: 13,
  esquiva: 15,
  bloqueio: 17,
  danoCorpoACorpo: '1D3 [Físico]',
};

function agente(): EfeitoConsumoFragmentoDto {
  return { atributos: ATRIBUTOS, derivados: DERIVADOS, modificadoresTeste: {} };
}

describe('aplicarBonusConsumoFragmento — DEFESA', () => {
  it('soma o valor da opção em derivados.defesa, sem tocar em mais nada', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III)[1];
    const resultado = aplicarBonusConsumoFragmento(agente(), opcao, null);
    expect(resultado.derivados.defesa).toBe(16);
    expect(resultado.atributos).toBe(ATRIBUTOS);
    expect(resultado.modificadoresTeste).toEqual({});
  });

  it('classe sem Defesa (defesa undefined, ex. Civil): não fabrica a stat', () => {
    const semDefesa = agente();
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.V)[1];
    const resultado = aplicarBonusConsumoFragmento(
      { ...semDefesa, derivados: { ...semDefesa.derivados, defesa: undefined } },
      opcao,
      null,
    );
    expect(resultado.derivados.defesa).toBeUndefined();
  });
});

describe('aplicarBonusConsumoFragmento — DANO_CORPO', () => {
  it('soma o valor da opção no fixo do dano do Corpo via somarDanoFixo', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III)[2];
    const resultado = aplicarBonusConsumoFragmento(agente(), opcao, null);
    expect(resultado.derivados.danoCorpoACorpo).toBe('1D3+6 [Físico]');
  });

  it('sem danoCorpoACorpo persistido: devolve o agente intacto', () => {
    const semDano = agente();
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III)[2];
    const resultado = aplicarBonusConsumoFragmento(
      { ...semDano, derivados: { ...semDano.derivados, danoCorpoACorpo: undefined } },
      opcao,
      null,
    );
    expect(resultado.derivados.danoCorpoACorpo).toBeUndefined();
  });
});

describe('aplicarBonusConsumoFragmento — TESTE', () => {
  it('soma o valor em modificadoresTeste do atributo escolhido, empilhando sobre um modificador já existente', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III)[0];
    const comModificadorPrevio = { ...agente(), modificadoresTeste: { destreza: 1 } };
    const resultado = aplicarBonusConsumoFragmento(comModificadorPrevio, opcao, 'destreza');
    expect(resultado.modificadoresTeste).toEqual({ destreza: 4 });
    expect(resultado.atributos).toBe(ATRIBUTOS);
  });

  it('sem atributo escolhido: devolve o agente intacto (guarda defensiva)', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III)[0];
    const resultado = aplicarBonusConsumoFragmento(agente(), opcao, null);
    expect(resultado).toEqual(agente());
  });

  it('módulo I soma também +1 ponto no atributo escolhido (única forma de ultrapassar 6 pontos)', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.I)[0];
    const resultado = aplicarBonusConsumoFragmento(agente(), opcao, 'vontade');
    expect(resultado.modificadoresTeste).toEqual({ vontade: 5 });
    expect(resultado.atributos.vontade).toBe(3);
    expect(resultado.atributos.forca).toBe(2);
  });

  it('módulo diferente de I não soma ponto de atributo, só o modificador de teste', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.II)[0];
    const resultado = aplicarBonusConsumoFragmento(agente(), opcao, 'intelecto');
    expect(resultado.atributos.intelecto).toBe(2);
    expect(resultado.modificadoresTeste).toEqual({ intelecto: 5 });
  });
});

describe('reverterBonusConsumoFragmento (m3-64, correção — remover um fragmento consumido)', () => {
  it('DEFESA: subtrai de volta exatamente o que aplicarBonusConsumoFragmento somou', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III)[1];
    const aplicado = aplicarBonusConsumoFragmento(agente(), opcao, null);
    const revertido = reverterBonusConsumoFragmento(aplicado, opcao, null);
    expect(revertido).toEqual(agente());
  });

  it('DANO_CORPO: desfaz o fixo somado via somarDanoFixo', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III)[2];
    const aplicado = aplicarBonusConsumoFragmento(agente(), opcao, null);
    const revertido = reverterBonusConsumoFragmento(aplicado, opcao, null);
    expect(revertido.derivados.danoCorpoACorpo).toBe('1D3 [Físico]');
  });

  it('TESTE: subtrai o modificador de teste somado', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III)[0];
    const aplicado = aplicarBonusConsumoFragmento(agente(), opcao, 'destreza');
    const revertido = reverterBonusConsumoFragmento(aplicado, opcao, 'destreza');
    expect(revertido.modificadoresTeste).toEqual({ destreza: 0 });
    expect(revertido.atributos).toBe(ATRIBUTOS);
  });

  it('TESTE módulo I: também desfaz o +1 ponto de atributo concedido', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.I)[0];
    const aplicado = aplicarBonusConsumoFragmento(agente(), opcao, 'vontade');
    const revertido = reverterBonusConsumoFragmento(aplicado, opcao, 'vontade');
    expect(revertido.atributos.vontade).toBe(2);
    expect(revertido.modificadoresTeste).toEqual({ vontade: 0 });
  });

  it('preserva um modificador de teste pré-existente ao reverter só o delta do fragmento', () => {
    const opcao = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III)[0];
    const comModificadorPrevio = { ...agente(), modificadoresTeste: { destreza: 1 } };
    const aplicado = aplicarBonusConsumoFragmento(comModificadorPrevio, opcao, 'destreza');
    const revertido = reverterBonusConsumoFragmento(aplicado, opcao, 'destreza');
    expect(revertido.modificadoresTeste).toEqual({ destreza: 1 });
  });
});
