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
  bonusMunicaoConstrutor,
  calcularAfinidade,
  custoAcoplarFragmento,
  custoAquisicaoFragmento,
  custoRemoverFragmento,
  custoSanidadeConsumirFragmento,
  existeFragmentoNaMesmaFuncao,
  formaFixaConstrutor,
  listarBonusConsumoFragmentoPotencializador,
  listarBonusFragmentoPotencializador,
  listarEfeitosFixosConstrutor,
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

  /**
   * Habilidade "Anomalia" (Experimento Artificial, `P-013`) — doc: "Fragmentos custam o dobro de
   * Energia em seu uso". Dobra por cima do que já é cobrado, inclusive o dobro já aplicado ao
   * Construtor (a doc não abre exceção).
   */
  it('com Anomalia, dobra o custo do Potencializador', () => {
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.IV, true)).toBe(14);
  });

  it('com Anomalia, o dobro do Construtor se acumula com o dobro da Anomalia (4×)', () => {
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.CONSTRUTOR, FragmentoModuloEnum.IV, true)).toBe(28);
  });

  it('sem Anomalia (padrão), o comportamento não muda', () => {
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.IV, false)).toBe(7);
  });
});

describe('custoAcoplarFragmento', () => {
  it('módulo IV custa 7 de Energia + 7 de Energia Máxima (exemplo do documento)', () => {
    expect(custoAcoplarFragmento(FragmentoModuloEnum.IV)).toEqual({ energia: 7, energiaMaxima: 7 });
  });

  it('módulo I custa 20 + 20', () => {
    expect(custoAcoplarFragmento(FragmentoModuloEnum.I)).toEqual({ energia: 20, energiaMaxima: 20 });
  });

  it('com Anomalia (P-013), dobra os dois valores', () => {
    expect(custoAcoplarFragmento(FragmentoModuloEnum.IV, true)).toEqual({ energia: 14, energiaMaxima: 14 });
  });
});

describe('custoRemoverFragmento', () => {
  it('módulo IV custa 14 de Energia (Energia × 2, exemplo do documento)', () => {
    expect(custoRemoverFragmento(FragmentoModuloEnum.IV)).toBe(14);
  });

  it('módulo V custa 6', () => {
    expect(custoRemoverFragmento(FragmentoModuloEnum.V)).toBe(6);
  });

  it('com Anomalia (P-013), dobra por cima do Energia × 2 já existente', () => {
    expect(custoRemoverFragmento(FragmentoModuloEnum.IV, true)).toBe(28);
  });
});

describe('listarBonusFragmentoPotencializador', () => {
  it('módulo V devolve as 5 opções do cardápio "em um item" (m3-68: efeito ≠ dano)', () => {
    const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.V);
    expect(opcoes).toHaveLength(5);
    expect(opcoes.map((opcao) => opcao.efeito.tipo)).toEqual([
      ModificacaoEfeitoTipoEnum.EFEITO,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.EFEITO,
      ModificacaoEfeitoTipoEnum.RESISTENCIA,
    ]);
    expect(opcoes[0].efeito.variante).toBe('DADO');
    expect(opcoes[3].efeito.variante).toBe('FIXO');
    expect(opcoes[0].efeito.valor).toBe(2);
    expect(opcoes[3].efeito.valor).toBe(2);
  });

  it('módulo I tem os maiores valores da tabela (+7 dados, +10 no valor)', () => {
    const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.I);
    expect(opcoes[0].efeito.valor).toBe(7);
    expect(opcoes[3].efeito.valor).toBe(10);
    expect(opcoes[4].efeito.valor).toBe(10);
  });

  it('com o maior dado do alvo, insere a 5ª opção "N× maior dado" logo após a 1ª (m3-63) — só ela é dano de verdade', () => {
    const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.V, 8);
    expect(opcoes).toHaveLength(6);
    expect(opcoes.map((opcao) => opcao.efeito.tipo)).toEqual([
      ModificacaoEfeitoTipoEnum.EFEITO,
      ModificacaoEfeitoTipoEnum.DANO_FIXO,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.EFEITO,
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

  /**
   * Habilidade "Anomalia" (Experimento Artificial, `P-013`) — doc: "têm todos os seus efeitos
   * dobrados". Dobra o valor de cada opção do cardápio, incluindo o dano "N× maior dado".
   */
  describe('com Anomalia (P-013)', () => {
    it('dobra os valores das 5 opções sem alvo escolhido (base módulo V: 2/1/2/2/2)', () => {
      const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.V, null, true);
      expect(opcoes.map((opcao) => opcao.efeito.valor)).toEqual([4, 2, 4, 4, 4]);
    });

    it('dobra também a opção "N× maior dado" (módulo V, D8 → +16 em vez de +8)', () => {
      const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.V, 8, true);
      expect(opcoes[1].efeito.valor).toBe(16);
    });

    it('sem Anomalia (padrão), os valores não mudam', () => {
      const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.V, null, false);
      expect(opcoes.map((opcao) => opcao.efeito.valor)).toEqual([2, 1, 2, 2, 2]);
    });
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
  it('bloqueia um 2º fragmento na mesma função (dano)', () => {
    const modificacoes = [
      {
        nome: 'Fragmento Potencializador — Módulo V',
        empilhamentos: 1,
        efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 8 }],
        origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.V },
      },
    ];
    expect(
      existeFragmentoNaMesmaFuncao(modificacoes, { tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 4 }),
    ).toBe(true);
  });

  it('bloqueia um 2º fragmento na mesma função (efeito), mesmo com variantes diferentes (dados vs fixo) — m3-68', () => {
    const modificacoes = [
      {
        nome: 'Fragmento Potencializador — Módulo V',
        empilhamentos: 1,
        efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.EFEITO, valor: 2, variante: 'DADO' }],
        origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.V },
      },
    ];
    expect(
      existeFragmentoNaMesmaFuncao(modificacoes, {
        tipo: ModificacaoEfeitoTipoEnum.EFEITO,
        valor: 3,
        variante: 'FIXO',
      }),
    ).toBe(true);
  });

  it('não bloqueia funções diferentes (dano já ocupado, efeito livre) — m3-68', () => {
    const modificacoes = [
      {
        nome: 'Fragmento Potencializador — Módulo V',
        empilhamentos: 1,
        efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 8 }],
        origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.V },
      },
    ];
    expect(
      existeFragmentoNaMesmaFuncao(modificacoes, {
        tipo: ModificacaoEfeitoTipoEnum.EFEITO,
        valor: 2,
        variante: 'DADO',
      }),
    ).toBe(false);
  });

  it('ignora modificações sem origemFragmento (a regra é só entre fragmentos)', () => {
    const modificacoes = [
      {
        nome: 'Reforçado',
        empilhamentos: 1,
        efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 1 }],
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
    expect(opcoes[0]).toMatchObject({ tipo: 'TESTE', valor: 5, concedePontoAtributo: true, pontosAtributo: 1 });
    expect(opcoes[0].rotulo).toContain('+1 ponto no atributo');
    expect(opcoes[1]).toEqual({ rotulo: '+5 em Defesa', tipo: 'DEFESA', valor: 5 });
    expect(opcoes[2]).toEqual({ rotulo: '+10 de dano do Corpo', tipo: 'DANO_CORPO', valor: 10 });
  });

  it('módulo II não concede ponto de atributo (só o I concede)', () => {
    expect(listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.II)[0].concedePontoAtributo).toBeUndefined();
  });

  /**
   * Habilidade "Anomalia" (Experimento Artificial, `P-013`) — doc: "têm todos os seus efeitos
   * dobrados", sem exceção nenhuma — `pontosAtributo` do Módulo I também dobra (correção sobre a
   * primeira leitura do `P-013`, que tratava o ponto de atributo como "regra estrutural" imune à
   * dobra; o autor confirmou que 1 Fragmento de Módulo I consumido com Anomalia deve conceder 2
   * pontos, não 1).
   */
  describe('com Anomalia (P-013)', () => {
    it('dobra os 3 valores (módulo III: 3/3/6 → 6/6/12)', () => {
      const opcoes = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III, true);
      expect(opcoes.map((opcao) => opcao.valor)).toEqual([6, 6, 12]);
    });

    it('módulo I dobra o valor de teste e também concedePontoAtributo (2 pontos, não 1)', () => {
      const opcoes = listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.I, true);
      expect(opcoes[0]).toMatchObject({ tipo: 'TESTE', valor: 10, concedePontoAtributo: true, pontosAtributo: 2 });
      expect(opcoes[0].rotulo).toContain('+2 pontos no atributo');
    });

    it('sem Anomalia (padrão), os valores não mudam', () => {
      expect(listarBonusConsumoFragmentoPotencializador(FragmentoModuloEnum.III, false).map((o) => o.valor)).toEqual([
        3, 3, 6,
      ]);
    });
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

/**
 * Bônus fixo do Construtor (m3-65) — doc: "⬦ Construtor", tabela ~1950. "ele é a arma em si...
 * concede bônus adicionais de dano e testes de acordo com seu módulo" — Arma/Proteção ganham a
 * modificação automática; Munição é a ação própria "Recarregar".
 */
describe('formaFixaConstrutor', () => {
  it('Corpo a Corpo, Armas de Fogo e Exóticos são a forma ARMA', () => {
    expect(formaFixaConstrutor(ItemCategoriaEnum.CORPO_A_CORPO)).toBe('ARMA');
    expect(formaFixaConstrutor(ItemCategoriaEnum.ARMAS_DE_FOGO)).toBe('ARMA');
    expect(formaFixaConstrutor(ItemCategoriaEnum.EXOTICOS)).toBe('ARMA');
  });

  it('Proteções é a forma PROTECAO', () => {
    expect(formaFixaConstrutor(ItemCategoriaEnum.PROTECOES)).toBe('PROTECAO');
  });

  it('Munições e categorias fora da lista do doc (ou ausente) devolvem null', () => {
    expect(formaFixaConstrutor(ItemCategoriaEnum.MUNICOES)).toBeNull();
    expect(formaFixaConstrutor(ItemCategoriaEnum.ARMAZENAMENTO)).toBeNull();
    expect(formaFixaConstrutor(undefined)).toBeNull();
  });
});

describe('listarEfeitosFixosConstrutor', () => {
  it('Arma, módulo V: +1D8 de dano e +1 de teste (exemplo do documento)', () => {
    expect(listarEfeitosFixosConstrutor(FragmentoModuloEnum.V, 'ARMA')).toEqual([
      { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 1, faces: 8 },
      { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: 1, variante: 'FIXO' },
    ]);
  });

  it('Arma, módulo II: +2D12 de dano, +1 dado no dado base e +7 de teste (só II/I somam o dado base)', () => {
    expect(listarEfeitosFixosConstrutor(FragmentoModuloEnum.II, 'ARMA')).toEqual([
      { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 2, faces: 12 },
      { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: 7, variante: 'FIXO' },
      { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: 1 },
    ]);
  });

  it('Arma, módulo I: +4D12 de dano, +2 dados no dado base e +10 de teste', () => {
    expect(listarEfeitosFixosConstrutor(FragmentoModuloEnum.I, 'ARMA')).toEqual([
      { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 4, faces: 12 },
      { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: 10, variante: 'FIXO' },
      { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: 2 },
    ]);
  });

  it('Proteção, módulo V: só +2 de resistência (sem Esquiva/Bloqueio/Defesa neste módulo)', () => {
    expect(listarEfeitosFixosConstrutor(FragmentoModuloEnum.V, 'PROTECAO')).toEqual([
      { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 2 },
    ]);
  });

  it('Proteção, módulo IV: +3 de resistência e +1 em Esquiva e Bloqueio (sem Defesa ainda)', () => {
    expect(listarEfeitosFixosConstrutor(FragmentoModuloEnum.IV, 'PROTECAO')).toEqual([
      { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 3 },
      { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 1, variante: 'Esquiva' },
      { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 1, variante: 'Bloqueio' },
    ]);
  });

  it('Proteção, módulo I: +10 de resistência, +5 em Esquiva e Bloqueio e +2 em Defesa (exemplo do documento)', () => {
    expect(listarEfeitosFixosConstrutor(FragmentoModuloEnum.I, 'PROTECAO')).toEqual([
      { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 10 },
      { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 5, variante: 'Esquiva' },
      { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 5, variante: 'Bloqueio' },
      { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 2, variante: 'Defesa' },
    ]);
  });

  /**
   * Habilidade "Anomalia" (Experimento Artificial, `P-013`) — o Construtor também é um Fragmento e
   * o doc não abre exceção nenhuma ("têm todos os seus efeitos dobrados"). `faces` (o tipo de dado)
   * nunca dobra — só a quantidade de dados/valor fixo, mesmo raciocínio do multiplicador de dano do
   * Potencializador.
   */
  describe('com Anomalia (P-013)', () => {
    it('Arma, módulo II: dobra dano, dado base e teste — faces (D12) não muda', () => {
      expect(listarEfeitosFixosConstrutor(FragmentoModuloEnum.II, 'ARMA', true)).toEqual([
        { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 4, faces: 12 },
        { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: 14, variante: 'FIXO' },
        { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: 2 },
      ]);
    });

    it('Proteção, módulo I: dobra resistência, Esquiva/Bloqueio e Defesa', () => {
      expect(listarEfeitosFixosConstrutor(FragmentoModuloEnum.I, 'PROTECAO', true)).toEqual([
        { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 20 },
        { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 10, variante: 'Esquiva' },
        { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 10, variante: 'Bloqueio' },
        { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 4, variante: 'Defesa' },
      ]);
    });
  });
});

describe('bonusMunicaoConstrutor', () => {
  it('módulo V: Recarregar custa 3 de Energia, concede +5 de dano (exemplo do documento)', () => {
    expect(bonusMunicaoConstrutor(FragmentoModuloEnum.V)).toEqual({ custoRecarregar: 3, dano: 5 });
  });

  it('módulo I (mais forte): Recarregar custa 20 de Energia, concede +32 de dano', () => {
    expect(bonusMunicaoConstrutor(FragmentoModuloEnum.I)).toEqual({ custoRecarregar: 20, dano: 32 });
  });

  it('com Anomalia (P-013): dobra os dois valores (módulo V: 3/5 → 6/10)', () => {
    expect(bonusMunicaoConstrutor(FragmentoModuloEnum.V, true)).toEqual({ custoRecarregar: 6, dano: 10 });
  });
});
