import { describe, expect, it } from 'vitest';
import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  ModificacaoEfeitoTipoEnum,
} from '../../enums';
import type { CarrinhoItemDto } from './compras.dtos';
import { calcularStatItem } from './compras';
import {
  aplicarReducaoAfinidade,
  calcularAfinidade,
  custoAcoplarFragmento,
  custoAquisicaoFragmento,
  custoRemoverFragmento,
  custoSanidadeConsumirFragmento,
  existeFragmentoNaMesmaFuncao,
  listarBonusConsumoFragmentoPotencializador,
  listarBonusFragmentoPotencializador,
  listarModulosFragmentosPortados,
  maiorDadoItem,
  reducaoCustoPorAfinidade,
  valorAfinidadeFragmento,
} from './fragmento';

/**
 * Custos de Energia e cardápio de bônus de Fragmentos (m3-35, núcleo: adquirir/acoplar/remover)
 * conferidos contra docs/core/sistema-v4.1.0.md — "⬡ Fragmentos" (exemplo do documento: "acoplar um
 * fragmento de módulo IV em um item custa 7 de Energia + 7 de Energia Máxima, e removê-lo do item
 * custa 14 de Energia").
 */
describe('custoAquisicaoFragmento', () => {
  it('Potencializador custa o valor da tabela por módulo', () => {
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.V)).toBe(3);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.IV)).toBe(7);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.III)).toBe(12);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.II)).toBe(16);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.I)).toBe(20);
  });

  it('Construtor custa o dobro do valor da tabela (doc: "seu valor... é dobrado")', () => {
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.CONSTRUTOR, FragmentoModuloEnum.IV)).toBe(14);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.CONSTRUTOR, FragmentoModuloEnum.I)).toBe(40);
  });
});

describe('custoAcoplarFragmento', () => {
  it('módulo IV custa 7 de Energia + 7 de Energia Máxima (exemplo do documento)', () => {
    expect(custoAcoplarFragmento(FragmentoModuloEnum.IV)).toEqual({ energia: 7, energiaMaxima: 7 });
  });

  it('módulo I custa 20 + 20', () => {
    expect(custoAcoplarFragmento(FragmentoModuloEnum.I)).toEqual({ energia: 20, energiaMaxima: 20 });
  });
});

describe('custoRemoverFragmento', () => {
  it('módulo IV custa 14 de Energia (Energia × 2, exemplo do documento)', () => {
    expect(custoRemoverFragmento(FragmentoModuloEnum.IV)).toBe(14);
  });

  it('módulo V custa 6', () => {
    expect(custoRemoverFragmento(FragmentoModuloEnum.V)).toBe(6);
  });
});

describe('listarBonusFragmentoPotencializador', () => {
  it('módulo V devolve as 5 opções do cardápio "em um item"', () => {
    const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.V);
    expect(opcoes).toHaveLength(5);
    expect(opcoes.map((opcao) => opcao.efeito.tipo)).toEqual([
      ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.DANO_FIXO,
      ModificacaoEfeitoTipoEnum.RESISTENCIA,
    ]);
    expect(opcoes[0].efeito.valor).toBe(2);
    expect(opcoes[3].efeito.valor).toBe(2);
  });

  it('módulo I tem os maiores valores da tabela (+7 dados, +10 no valor)', () => {
    const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.I);
    expect(opcoes[0].efeito.valor).toBe(7);
    expect(opcoes[3].efeito.valor).toBe(10);
    expect(opcoes[4].efeito.valor).toBe(10);
  });

  it('com o maior dado do alvo, insere a 5ª opção "N× maior dado" logo após a 1ª (m3-63)', () => {
    const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.V, 8);
    expect(opcoes).toHaveLength(6);
    expect(opcoes.map((opcao) => opcao.efeito.tipo)).toEqual([
      ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE,
      ModificacaoEfeitoTipoEnum.DANO_FIXO,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.DANO_FIXO,
      ModificacaoEfeitoTipoEnum.RESISTENCIA,
    ]);
    // Módulo V multiplica 1×; D8 → +8 de dano.
    expect(opcoes[1].efeito.valor).toBe(8);
  });

  it('módulo I multiplica 5×; D10 do alvo vira +50 de dano', () => {
    const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.I, 10);
    expect(opcoes[1].efeito.valor).toBe(50);
  });

  it('sem maior dado (alvo sem dano, ou nenhum alvo escolhido), a opção não aparece', () => {
    expect(listarBonusFragmentoPotencializador(FragmentoModuloEnum.V, null)).toHaveLength(5);
    expect(listarBonusFragmentoPotencializador(FragmentoModuloEnum.V)).toHaveLength(5);
  });
});

describe('maiorDadoItem', () => {
  it('extrai o maior tipo de dado (mais faces) de uma notação com vários dados', () => {
    const item: CarrinhoItemDto = {
      nome: 'Espada customizada',
      categoria: ItemCategoriaEnum.CORPO_A_CORPO,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      dano: '1D6+1D8+FOR [Físico]',
      modificacoes: [],
    };
    expect(maiorDadoItem(item)).toBe(8);
  });

  it('lê minúsculo e uma única notação simples ("2D8+3")', () => {
    const item: CarrinhoItemDto = {
      nome: 'Item achado',
      categoria: ItemCategoriaEnum.EXPLOSIVOS,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      dano: '2d8+3',
      modificacoes: [],
    };
    expect(maiorDadoItem(item)).toBe(8);
  });

  it('resolve o dano do catálogo quando o item não é custom ("Mediana": 3D4+FOR → D4)', () => {
    const item: CarrinhoItemDto = {
      nome: 'Mediana',
      categoria: ItemCategoriaEnum.CORPO_A_CORPO,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
    };
    expect(maiorDadoItem(item)).toBe(4);
  });

  it('devolve null sem dado no campo (ausente ou notação sem D<n>, ex.: "— (fumaça)")', () => {
    const semCampo: CarrinhoItemDto = {
      nome: 'Colete',
      categoria: ItemCategoriaEnum.PROTECOES,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
    };
    const semDadoNaNotacao: CarrinhoItemDto = {
      nome: 'Item achado',
      categoria: ItemCategoriaEnum.EXPLOSIVOS,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      dano: '— (fumaça)',
      modificacoes: [],
    };
    expect(maiorDadoItem(semCampo)).toBeNull();
    expect(maiorDadoItem(semDadoNaNotacao)).toBeNull();
  });
});

describe('existeFragmentoNaMesmaFuncao', () => {
  it('bloqueia um 2º fragmento na mesma função (dano), mesmo com efeitos diferentes (dados vs fixo)', () => {
    const modificacoes = [
      {
        nome: 'Fragmento Potencializador — Módulo V',
        empilhamentos: 1,
        efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: 2 }],
        origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.V },
      },
    ];
    expect(
      existeFragmentoNaMesmaFuncao(modificacoes, { tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 4 }),
    ).toBe(true);
  });

  it('não bloqueia funções diferentes (dano já ocupado, teste livre)', () => {
    const modificacoes = [
      {
        nome: 'Fragmento Potencializador — Módulo V',
        empilhamentos: 1,
        efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: 2 }],
        origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.V },
      },
    ];
    expect(
      existeFragmentoNaMesmaFuncao(modificacoes, {
        tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE,
        valor: 1,
        variante: 'DADO',
      }),
    ).toBe(false);
  });

  it('ignora modificações sem origemFragmento (a regra é só entre fragmentos)', () => {
    const modificacoes = [
      {
        nome: 'Reforçado',
        empilhamentos: 1,
        efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: 1 }],
      },
    ];
    expect(
      existeFragmentoNaMesmaFuncao(modificacoes, { tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 4 }),
    ).toBe(false);
  });
});

/**
 * Cardápio "Consumido" (m3-64) — doc: "⬦ Potencializador", tabela, coluna "Consumido". Só o Módulo
 * I soma "+1 ponto no atributo", além do teste (doc: "única forma de ultrapassar limite de 6 pontos
 * em um atributo é consumindo um Fragmento de Módulo I").
 */
describe('listarBonusConsumoFragmentoPotencializador', () => {
  it('módulo V devolve as 3 opções do cardápio "Consumido", sem concedePontoAtributo', () => {
    const opcoes = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.V);
    expect(opcoes).toHaveLength(3);
    expect(opcoes.map((opcao) => opcao.tipo)).toEqual(['TESTE', 'DEFESA', 'DANO_CORPO']);
    expect(opcoes.map((opcao) => opcao.valor)).toEqual([1, 1, 2]);
    expect(opcoes[0].concedePontoAtributo).toBeUndefined();
  });

  it('módulo III tem os valores da tabela (+3 testes, +3 Defesa, +6 dano do Corpo)', () => {
    const opcoes = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III);
    expect(opcoes.map((opcao) => opcao.valor)).toEqual([3, 3, 6]);
  });

  it('módulo I: opção de teste concede também +1 ponto no atributo (única exceção)', () => {
    const opcoes = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.I);
    expect(opcoes[0]).toMatchObject({ tipo: 'TESTE', valor: 5, concedePontoAtributo: true });
    expect(opcoes[0].rotulo).toContain('+1 ponto no atributo');
    expect(opcoes[1]).toEqual({ rotulo: '+5 em Defesa', tipo: 'DEFESA', valor: 5 });
    expect(opcoes[2]).toEqual({ rotulo: '+10 de dano do Corpo', tipo: 'DANO_CORPO', valor: 10 });
  });

  it('módulo II não concede ponto de atributo (só o I concede)', () => {
    expect(listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.II)[0].concedePontoAtributo).toBeUndefined();
  });
});

describe('regressão — calcularStatItem soma mod de origemFragmento igual a mod comum', () => {
  it('RESISTENCIA de um fragmento aplicado soma na resistência do item, como qualquer mod custom', () => {
    const item: CarrinhoItemDto = {
      nome: 'Colete customizado',
      categoria: ItemCategoriaEnum.PROTECOES,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      resistencia: '10 [Físico]',
      modificacoes: [
        {
          nome: 'Fragmento Potencializador — Módulo I',
          empilhamentos: 1,
          efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 10 }],
          ignoraLimiteTotal: true,
          ignoraLimiteProprio: true,
          origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.I },
        },
      ],
    };
    expect(calcularStatItem({ item })?.resistencia).toBe('20 [Físico]');
  });

  it('DANO_DADOS_BASE de um fragmento aplicado soma no dado base do dano', () => {
    const item: CarrinhoItemDto = {
      nome: 'Espada customizada',
      categoria: ItemCategoriaEnum.CORPO_A_CORPO,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      dano: '3D4+FOR [Físico]',
      modificacoes: [
        {
          nome: 'Fragmento Potencializador — Módulo V',
          empilhamentos: 1,
          efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: 2 }],
          ignoraLimiteTotal: true,
          ignoraLimiteProprio: true,
          origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.V },
        },
      ],
    };
    expect(calcularStatItem({ item })?.dano).toBe('5D4+FOR [Físico]');
  });
});

/**
 * Afinidade (m3-42) — doc: "⬥ Afinidade com Fragmentos". Valor por fragmento = 6 - Módulo (numeral
 * romano); exemplo do documento: 2 fragmentos de módulo V + 1 de módulo IV = 4 de afinidade.
 */
describe('valorAfinidadeFragmento', () => {
  it('módulo V vale 1, módulo I vale 5 (6 - numeral romano)', () => {
    expect(valorAfinidadeFragmento(FragmentoModuloEnum.V)).toBe(1);
    expect(valorAfinidadeFragmento(FragmentoModuloEnum.IV)).toBe(2);
    expect(valorAfinidadeFragmento(FragmentoModuloEnum.III)).toBe(3);
    expect(valorAfinidadeFragmento(FragmentoModuloEnum.II)).toBe(4);
    expect(valorAfinidadeFragmento(FragmentoModuloEnum.I)).toBe(5);
  });
});

describe('calcularAfinidade', () => {
  it('2 fragmentos de módulo V + 1 de módulo IV = 4 de afinidade (exemplo do documento)', () => {
    expect(
      calcularAfinidade([FragmentoModuloEnum.V, FragmentoModuloEnum.V, FragmentoModuloEnum.IV]),
    ).toBe(4);
  });

  it('sem fragmentos portados: afinidade 0', () => {
    expect(calcularAfinidade([])).toBe(0);
  });
});

describe('listarModulosFragmentosPortados', () => {
  it('conta um fragmento solto em stack uma vez por unidade (quantidade)', () => {
    const itens: CarrinhoItemDto[] = [
      {
        nome: 'Fragmento Potencializador',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        custo: 0,
        peso: 0,
        quantidade: 2,
        guardada: false,
        modificacoes: [],
        modulo: FragmentoModuloEnum.V,
      },
    ];
    expect(listarModulosFragmentosPortados(itens)).toEqual([FragmentoModuloEnum.V, FragmentoModuloEnum.V]);
  });

  it('conta um fragmento Construtor solto (ele é o próprio item) e um Potencializador já acoplado como Modificação', () => {
    const itens: CarrinhoItemDto[] = [
      {
        nome: 'Faca de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        custo: 0,
        peso: 1,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        modulo: FragmentoModuloEnum.III,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      },
      {
        nome: 'Pistola',
        categoria: ItemCategoriaEnum.ARMAS_DE_FOGO,
        custo: 100,
        peso: 1,
        quantidade: 1,
        guardada: false,
        modificacoes: [
          {
            nome: 'Fragmento Potencializador — Módulo IV',
            empilhamentos: 1,
            efeitos: [],
            origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.IV },
          },
        ],
      },
    ];
    expect(listarModulosFragmentosPortados(itens)).toEqual([FragmentoModuloEnum.III, FragmentoModuloEnum.IV]);
  });

  it('ignora itens sem fragmento (categoria comum, sem modificação de origemFragmento)', () => {
    const itens: CarrinhoItemDto[] = [
      {
        nome: 'Colete',
        categoria: ItemCategoriaEnum.PROTECOES,
        custo: 10,
        peso: 1,
        quantidade: 1,
        guardada: false,
        modificacoes: [{ nome: 'Reforçado', empilhamentos: 1, efeitos: [] }],
      },
    ];
    expect(listarModulosFragmentosPortados(itens)).toEqual([]);
  });
});

describe('reducaoCustoPorAfinidade', () => {
  it('afinidade até 10: sem redução', () => {
    expect(reducaoCustoPorAfinidade(0)).toBe(0);
    expect(reducaoCustoPorAfinidade(10)).toBe(0);
  });

  it('afinidade 15: -2 de Energia (exemplo do documento)', () => {
    expect(reducaoCustoPorAfinidade(15)).toBe(2);
  });

  it('afinidade 11: -1 a cada 2 pontos excedentes, arredondado para baixo', () => {
    expect(reducaoCustoPorAfinidade(11)).toBe(0);
    expect(reducaoCustoPorAfinidade(12)).toBe(1);
  });
});

describe('aplicarReducaoAfinidade', () => {
  it('afinidade 15 reduz o custo em 2, sem afinidade nenhuma reduz nada', () => {
    expect(aplicarReducaoAfinidade(20, 15)).toBe(18);
    expect(aplicarReducaoAfinidade(20, 0)).toBe(20);
  });

  it('nunca zera o custo — piso de 1 (doc: "no mínimo, 1 de Energia Máxima")', () => {
    expect(aplicarReducaoAfinidade(3, 40)).toBe(1);
  });
});

/**
 * Preço de Sanidade do Consumo (m3-42) — doc: "⬦ Consumo de Fragmentos". Exemplo do documento:
 * módulo III aplica a sequela "Rejeição Biológica" 3× mais forte; módulo IV remove 21 de Energia
 * Máxima extra (custo do módulo × 3 = 7 × 3).
 */
describe('custoSanidadeConsumirFragmento', () => {
  it('módulo III: multiplicador 3, DT 22, energia extra 36 (exemplo do documento — "3× mais forte")', () => {
    expect(custoSanidadeConsumirFragmento(FragmentoModuloEnum.III)).toEqual({
      multiplicadorSequela: 3,
      dtEvitarVontade: 22,
      energiaMaximaExtra: 36,
    });
  });

  it('módulo IV: energia extra 21 (exemplo do documento)', () => {
    expect(custoSanidadeConsumirFragmento(FragmentoModuloEnum.IV).energiaMaximaExtra).toBe(21);
  });

  it('módulo V (mais fraco): multiplicador 1, DT 12', () => {
    expect(custoSanidadeConsumirFragmento(FragmentoModuloEnum.V)).toEqual({
      multiplicadorSequela: 1,
      dtEvitarVontade: 12,
      energiaMaximaExtra: 9,
    });
  });

  it('módulo I (mais forte): multiplicador 5, DT 32', () => {
    expect(custoSanidadeConsumirFragmento(FragmentoModuloEnum.I)).toEqual({
      multiplicadorSequela: 5,
      dtEvitarVontade: 32,
      energiaMaximaExtra: 60,
    });
  });
});
