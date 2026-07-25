import { describe, expect, it } from 'vitest';
import type { FichaHabilidadeDto } from '../../dtos/ficha';
import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum, ItemCategoriaEnum, ModificacaoEfeitoTipoEnum } from '../../enums';
import type { CarrinhoItemDto } from '../compras';
import { calcularBonusDefesaEquipamento, calcularContraAtaque, calcularDefesa, calcularProficiencia } from './defesa';

/**
 * Defesa e Proficiência conferidas contra docs/core/sistema-v4.1.0.md — "Defesa"
 * (Defesa Base = 10 + Nível), "Regras Gerais" (Esquivar soma Destreza; Bloquear
 * usa Vigor), "Progressão" (+1 de Proficiência por Nível) e "Jogando como um
 * Civil" > "Defesa e Reações" (civis não possuem defesa).
 */
describe('calcularDefesa', () => {
  it('Defesa Base = 10 + Nível; Esquiva soma Destreza; Bloqueio soma Vigor', () => {
    expect(calcularDefesa({ classe: ClasseEnum.COMBATENTE, nivel: 0, destreza: 2, vigor: 1 })).toEqual({
      defesa: 10,
      esquiva: 12,
      bloqueio: 11,
    });
    expect(calcularDefesa({ classe: ClasseEnum.SUPORTE, nivel: 5, destreza: 3, vigor: 2 })).toEqual({
      defesa: 15,
      esquiva: 18,
      bloqueio: 17,
    });
  });

  it('civil não possui defesa (retorna null)', () => {
    expect(calcularDefesa({ classe: ClasseEnum.CIVIL, nivel: 3, destreza: 2, vigor: 2 })).toBeNull();
  });
});

describe('calcularProficiencia', () => {
  it('agente: Proficiência = Nível', () => {
    expect(calcularProficiencia({ classe: ClasseEnum.COMBATENTE, nivel: 0 })).toBe(0);
    expect(calcularProficiencia({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, nivel: 7 })).toBe(7);
  });

  it('civil não possui proficiência (retorna null)', () => {
    expect(calcularProficiencia({ classe: ClasseEnum.CIVIL, nivel: 5 })).toBeNull();
  });
});

function habilidadeContraAtaque(
  categoria: HabilidadeCategoriaEnum,
  origem?: ArquetipoEnum,
): FichaHabilidadeDto {
  return {
    nome: 'Contra-Ataque',
    categoria,
    custoEnergia: 2,
    descricao: '(Reação)…',
    ...(origem === undefined ? {} : { origem }),
  };
}

describe('calcularContraAtaque', () => {
  it('sem a habilidade "Contra-Ataque" na ficha → null', () => {
    expect(calcularContraAtaque({ luta: 4, vigor: 4, defesa: 12, habilidades: [] })).toBeNull();
  });

  it('civil (defesa null) → null, mesmo com a habilidade', () => {
    const habilidades = [habilidadeContraAtaque(HabilidadeCategoriaEnum.GERAL)];
    expect(calcularContraAtaque({ luta: 4, vigor: 1, defesa: null, habilidades })).toBeNull();
  });

  it('Geral: Defesa + Luta ÷ 2, arredondado para baixo', () => {
    const habilidades = [habilidadeContraAtaque(HabilidadeCategoriaEnum.GERAL)];
    expect(calcularContraAtaque({ luta: 4, vigor: 1, defesa: 12, habilidades })).toBe(14);
    expect(calcularContraAtaque({ luta: 5, vigor: 1, defesa: 12, habilidades })).toBe(14);
  });

  it('Lutador (Melhorada): Defesa + Luta inteira', () => {
    const habilidades = [
      habilidadeContraAtaque(HabilidadeCategoriaEnum.GERAL_MELHORADA, ArquetipoEnum.LUTADOR),
    ];
    expect(calcularContraAtaque({ luta: 4, vigor: 1, defesa: 12, habilidades })).toBe(16);
  });

  it('Vanguarda (Melhorada): Defesa + o maior entre Luta ÷ 2 e Vigor ÷ 2', () => {
    const habilidades = [
      habilidadeContraAtaque(HabilidadeCategoriaEnum.GERAL_MELHORADA, ArquetipoEnum.VANGUARDA),
    ];
    // floor(5/2)=2 > floor(2/2)=1
    expect(calcularContraAtaque({ luta: 2, vigor: 5, defesa: 12, habilidades })).toBe(14);
    // floor(6/2)=3 > floor(1/2)=0
    expect(calcularContraAtaque({ luta: 6, vigor: 1, defesa: 12, habilidades })).toBe(15);
  });
});

/**
 * Bug de m3-43 (item 16): mods de Proteções "Flexível"/"Resistente" não chegavam à Esquiva/
 * Bloqueio/Defesa exibidas em Combate — conferido contra docs/core/sistema-v4.1.0.md — "⬥
 * Modificações" de Proteções e Escudos.
 */
describe('calcularBonusDefesaEquipamento', () => {
  function protecao(parcial: Partial<CarrinhoItemDto>): CarrinhoItemDto {
    return {
      nome: 'Colete de Kevlar',
      categoria: ItemCategoriaEnum.PROTECOES,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
      equipado: true,
      ...parcial,
    };
  }

  it('sem itens equipados: tudo em 0', () => {
    expect(calcularBonusDefesaEquipamento([])).toEqual({ esquiva: 0, bloqueio: 0, defesa: 0 });
  });

  it('Flexível equipado soma Esquiva; Resistente equipado soma Bloqueio', () => {
    const item = protecao({ modificacoes: [{ nome: 'Flexível', empilhamentos: 2 }, { nome: 'Resistente', empilhamentos: 3 }] });
    expect(calcularBonusDefesaEquipamento([item])).toEqual({ esquiva: 2, bloqueio: 3, defesa: 0 });
  });

  it('ignora itens de Proteções não equipados (na mochila)', () => {
    const item = protecao({ equipado: false, modificacoes: [{ nome: 'Flexível', empilhamentos: 2 }] });
    expect(calcularBonusDefesaEquipamento([item])).toEqual({ esquiva: 0, bloqueio: 0, defesa: 0 });
  });

  it('soma vários itens equipados (ex.: colete + escudo)', () => {
    const colete = protecao({ modificacoes: [{ nome: 'Flexível', empilhamentos: 1 }] });
    const escudo = protecao({ nome: 'Escudo Leve', modificacoes: [{ nome: 'Flexível', empilhamentos: 1 }] });
    expect(calcularBonusDefesaEquipamento([colete, escudo])).toEqual({ esquiva: 2, bloqueio: 0, defesa: 0 });
  });

  it('efeito custom DEFESA (variante Defesa) soma na Defesa base', () => {
    const item: CarrinhoItemDto = {
      ...protecao({}),
      resistencia: '5 [Físico]',
      modificacoes: [
        {
          nome: 'Placa Extra',
          empilhamentos: 1,
          efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 1, variante: 'Defesa' }],
        },
      ],
    };
    expect(calcularBonusDefesaEquipamento([item])).toEqual({ esquiva: 0, bloqueio: 0, defesa: 1 });
  });
});
