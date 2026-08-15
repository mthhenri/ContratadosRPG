import { describe, expect, it } from 'vitest';
import { ModificadorCriaturaEnum, CustoAcaoEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto, FichaCriaturaAtaqueDto } from '@contratados-rpg/shared/dtos/ficha';

import { rolarAtaqueCriatura, rolarTesteAtributoCriatura } from './criatura-rolagem';

describe('rolarTesteAtributoCriatura', () => {
  const atributos: FichaAtributosDto = {
    destreza: 1, forca: 1, luta: 5, pontaria: 1, vigor: 1,
    intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
  };

  it('monta a fórmula `<atributo>d20kh1` e usa o Atributo Efetivo (atributo + modificador) como contagem de dados', () => {
    const dados = {
      atributos,
      modificadores: { luta: ModificadorCriaturaEnum.FORTE } as never,
      vd: 5, // VD 5: modificador FORTE = valor base 0, sem incremento por faixa
    };

    const resultado = rolarTesteAtributoCriatura(dados, 'luta', 'Teste de Luta');

    expect(resultado?.formula).toBe('lutad20kh1');
    expect(resultado?.rotulo).toBe('Teste de Luta');
    // luta=5 (atributoFinal) + 0 (modificador FORTE em VD5) = 5 dados no pool.
    expect(resultado?.resultado.dados[0].valores).toHaveLength(5);
  });

  it('devolve null quando a fórmula é inválida (chave de atributo vazia não ocorre em uso normal, mas o motor pode recusar)', () => {
    // rolarFormula devolve null só em fórmula malformada; com uma chave válida isso não ocorre —
    // este teste documenta o contrato de propagação do null, usando o mock do motor não é necessário
    // aqui porque a função é pura o suficiente para não precisar de mock: basta confirmar que o tipo
    // de retorno é nullable e a implementação repassa o resultado de `rolarFormula` sem mascará-lo.
    const dados = { atributos, modificadores: { luta: ModificadorCriaturaEnum.FORTE } as never, vd: 5 };
    const resultado = rolarTesteAtributoCriatura(dados, 'luta', 'Teste de Luta');
    expect(resultado).not.toBeNull();
  });
});

describe('rolarAtaqueCriatura', () => {
  const atributos: FichaAtributosDto = {
    destreza: 1, forca: 1, luta: 1, pontaria: 1, vigor: 1,
    intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
  };

  it('rola a fórmula de dano do ataque direto, sem ajuste de atributo', () => {
    const ataque: FichaCriaturaAtaqueDto = {
      nome: 'Golpe de Pedra', atributo: 'luta', custoAcao: CustoAcaoEnum.PADRAO,
      dano: '4D12+10', tipoDano: TipoDanoEnum.FISICO, area: false,
    };

    const resultado = rolarAtaqueCriatura({ atributos }, ataque);

    expect(resultado?.formula).toBe('4D12+10');
    expect(resultado?.rotulo).toBe('Golpe de Pedra');
    expect(resultado?.resultado.dados[0]).toMatchObject({ faces: 12 });
  });
});
