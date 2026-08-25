import { describe, expect, it } from 'vitest';

import type { FichaJogadorDadosDto, FichaRolagemDto } from '@contratados-rpg/shared/dtos/ficha';
import { ItemCategoriaEnum, SeveridadeLesaoEnum } from '@contratados-rpg/shared/enums';
import type { CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';

import { construirFichaPadrao } from './ficha-padrao';
import { dadosDeIniciativaDaFicha, rolarIniciativaDaFicha } from './rolar-iniciativa';

const PRESET_INICIATIVA: FichaRolagemDto = { nome: 'Iniciativa', formula: 'DESd6' };

/**
 * Iniciativa rola pelo **atributo** de Destreza (`sistema-v4.1.0.md`: "definida pelo seu atributo
 * de Destreza"), não pelo atributo ajustado pra testes: só lesão (que reduz o atributo em si) e o
 * dado extra de Iniciativa (que reduz/soma na Iniciativa especificamente) contam — `dadosTeste`
 * (ajuste manual de teste) e a penalidade de equipamento (Armadura Pesada) não.
 */
function fichaComDestreza(destreza: number): FichaJogadorDadosDto {
  const { dados } = construirFichaPadrao();
  return {
    ...dados,
    atributos: { ...dados.atributos, destreza },
    rolagens: [PRESET_INICIATIVA],
  };
}

describe('dadosDeIniciativaDaFicha', () => {
  it('ignora o ajuste manual de dadosTeste (só vale pra testes normais de atributo)', () => {
    const dados: FichaJogadorDadosDto = { ...fichaComDestreza(3), dadosTeste: { destreza: -2 } };
    expect(dadosDeIniciativaDaFicha(dados)).toBe(3);
  });

  it('ignora a penalidade de dado de equipamento (Armadura Pesada, −1 dado em Destreza)', () => {
    const armaduraPesada: CarrinhoItemDto = {
      nome: 'Armadura Pesada',
      categoria: ItemCategoriaEnum.PROTECOES,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
      equipado: true,
    };
    const dados: FichaJogadorDadosDto = {
      ...fichaComDestreza(3),
      inventario: { ...fichaComDestreza(3).inventario, itens: [armaduraPesada] },
    };
    expect(dadosDeIniciativaDaFicha(dados)).toBe(3);
  });

  it('lesão reduz a Iniciativa (reduz o próprio atributo)', () => {
    const dados: FichaJogadorDadosDto = {
      ...fichaComDestreza(3),
      estado: {
        ...fichaComDestreza(3).estado,
        lesoes: [{ atributo: 'destreza', pontos: 1, severidade: SeveridadeLesaoEnum.LEVE, permanente: false }],
      },
    };
    expect(dadosDeIniciativaDaFicha(dados)).toBe(2);
  });
});

describe('rolarIniciativaDaFicha', () => {
  it('rola a quantidade de dados igual à Destreza efetiva, ignorando dadosTeste', () => {
    const dados: FichaJogadorDadosDto = { ...fichaComDestreza(4), dadosTeste: { destreza: 5 } };
    const executado = rolarIniciativaDaFicha(dados);
    expect(executado?.resultado.dados[0]?.valores).toHaveLength(4);
  });
});
