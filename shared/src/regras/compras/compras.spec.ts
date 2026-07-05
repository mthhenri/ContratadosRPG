import { describe, expect, it } from 'vitest';
import { ItemCategoriaEnum, PatenteEnum } from '../../enums';
import { AMPLIFICADORES, CATALOGO_CATEGORIAS, MODIFICACOES } from './compras.dados';
import { CATALOGO_ITENS } from './catalogo.dados';
import { CarrinhoItemDto, ModificacaoAplicadaDto } from './compras.dtos';
import {
  calcularCustoAmplificador,
  calcularResumoCompras,
  calcularStatItem,
  calcularTotaisCarrinho,
  contarComprasModificacao,
  interpretarBonusArmazenamento,
  obterCategoriaEmprestada,
  obterCustoModificacao,
  obterLimiteModificacoes,
  obterPesoModificacao,
  verificarConflitoModificacao,
} from './compras';

/**
 * Regras de compras conferidas contra docs/core/sistema-v4.1.0.md —
 * "Equipamentos" (custo/peso de modificação, tabelas de item), "Prestígio e
 * Patentes" (limite de modificações) e "Amplificadores" (custo, limite Vontade×3,
 * penalidade de Vontade). Sem divergências numéricas vs
 * `contratados-calculadora/src/script.js`, exceto o peso das modificações de
 * armazenamento (o documento diz que não agregam peso — proibição #27).
 */

/** Monta um item de carrinho preenchendo os campos não informados com padrões neutros. */
function montarItem(parcial: Partial<CarrinhoItemDto> & Pick<CarrinhoItemDto, 'nome' | 'categoria'>): CarrinhoItemDto {
  return {
    custo: 0,
    peso: 0,
    quantidade: 1,
    guardada: false,
    modificacoes: [],
    ...parcial,
  };
}

const mod = (nome: string, empilhamentos: number): ModificacaoAplicadaDto => ({ nome, empilhamentos });

describe('obterLimiteModificacoes', () => {
  it('reproduz a tabela de Limite de Modificações do documento por patente', () => {
    // docs/core/sistema-v4.1.0.md — "Prestígio e Patentes"
    expect(obterLimiteModificacoes({ prestigio: 0 })).toEqual({ patente: PatenteEnum.AGENTE, maxEmpilhamentos: 1, maxModificacoes: 2 });
    expect(obterLimiteModificacoes({ prestigio: 3 })).toEqual({ patente: PatenteEnum.OPERADOR, maxEmpilhamentos: 2, maxModificacoes: 4 });
    expect(obterLimiteModificacoes({ prestigio: 12 })).toEqual({ patente: PatenteEnum.VETERANO, maxEmpilhamentos: 3, maxModificacoes: 9 });
    expect(obterLimiteModificacoes({ prestigio: 66 })).toEqual({ patente: PatenteEnum.LIDER_OPERACIONAL, maxEmpilhamentos: 5, maxModificacoes: 20 });
  });

  it('usa a última patente para Prestígio muito alto (66+)', () => {
    expect(obterLimiteModificacoes({ prestigio: 999 }).patente).toBe(PatenteEnum.LIDER_OPERACIONAL);
  });
});

describe('obterCustoModificacao', () => {
  it('cobra o custo padrão de $750 por modificação nas categorias sem exceção', () => {
    // docs/core/sistema-v4.1.0.md — "$ 750 por modificação"
    expect(obterCustoModificacao({ item: montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO }), modificacao: 'Letal' })).toBe(750);
    expect(obterCustoModificacao({ item: montarItem({ nome: 'Pistola', categoria: ItemCategoriaEnum.ARMAS_DE_FOGO }), modificacao: 'Potência' })).toBe(750);
    expect(obterCustoModificacao({ item: montarItem({ nome: 'Colete Leve', categoria: ItemCategoriaEnum.PROTECOES }), modificacao: 'Blindada' })).toBe(750);
  });

  it('aplica as exceções de custo: Explosivos/Munições $250, Armazenamento $300', () => {
    expect(obterCustoModificacao({ item: montarItem({ nome: 'Molotov', categoria: ItemCategoriaEnum.EXPLOSIVOS }), modificacao: 'Potente' })).toBe(250);
    expect(obterCustoModificacao({ item: montarItem({ nome: '9mm', categoria: ItemCategoriaEnum.MUNICOES }), modificacao: 'Calibre' })).toBe(250);
    expect(obterCustoModificacao({ item: montarItem({ nome: 'Mochila Mediana', categoria: ItemCategoriaEnum.ARMAZENAMENTO }), modificacao: 'Compartimentos Extras' })).toBe(300);
  });

  it('cobra a modificação emprestada pelo custo da categoria de origem (Faz Parte)', () => {
    const motoserra = montarItem({
      nome: 'Motoserra',
      categoria: ItemCategoriaEnum.EXOTICOS,
      modificacoes: [mod('Faz Parte', 2)],
    });
    // Motoserra empresta Corpo a Corpo → mods de CaC custam o valor de CaC ($750).
    expect(obterCategoriaEmprestada(motoserra)).toBe(ItemCategoriaEnum.CORPO_A_CORPO);
    expect(obterCustoModificacao({ item: motoserra, modificacao: 'Pesada' })).toBe(750);
  });
});

describe('obterPesoModificacao', () => {
  it('soma o peso padrão de +0,2 por empilhamento, salvo indicação contrária', () => {
    // docs/core/sistema-v4.1.0.md — "Cada modificação acrescenta +0,2 de peso"
    expect(obterPesoModificacao({ item: montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO }), modificacao: 'Letal' })).toBe(0.2);
  });

  it('respeita os pesos próprios: Pesada +0,5, Furtiva 0', () => {
    expect(obterPesoModificacao({ item: montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO }), modificacao: 'Pesada' })).toBe(0.5);
    expect(obterPesoModificacao({ item: montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO }), modificacao: 'Furtiva' })).toBe(0);
  });

  it('modificações de armazenamento não agregam peso (documento vence o site antigo)', () => {
    // docs/core/sistema-v4.1.0.md — "Estas modificações não agregam nenhum peso ao item".
    // O site antigo somava 0,2/stack aqui; corrigido em favor do documento (proibição #27).
    expect(obterPesoModificacao({ item: montarItem({ nome: 'Mochila Mediana', categoria: ItemCategoriaEnum.ARMAZENAMENTO }), modificacao: 'Compartimentos Extras' })).toBe(0);
  });
});

describe('contarComprasModificacao', () => {
  it('conta 1 compra enquanto está nos empilhamentos iniciais e +1 por empilhamento extra', () => {
    // docs/core/sistema-v4.1.0.md — "Empilhamento": mod com 3 níveis iniciais custa uma modificação.
    const item = montarItem({ nome: 'Pesada', categoria: ItemCategoriaEnum.CORPO_A_CORPO });
    expect(contarComprasModificacao({ item, modificacao: 'Pesada', empilhamentos: 3 })).toBe(1);
    expect(contarComprasModificacao({ item, modificacao: 'Pesada', empilhamentos: 5 })).toBe(3);
  });

  it('conta 1 compra por empilhamento para modificações que iniciam em 1', () => {
    const item = montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO });
    expect(contarComprasModificacao({ item, modificacao: 'Letal', empilhamentos: 1 })).toBe(1);
    expect(contarComprasModificacao({ item, modificacao: 'Letal', empilhamentos: 3 })).toBe(3);
  });
});

describe('verificarConflitoModificacao', () => {
  it('bloqueia Furtiva quando Pesada está ativa (e vice-versa)', () => {
    // docs/core/sistema-v4.1.0.md — "Pesada em armas corpo a corpo bloqueia Furtiva e Veloz".
    const comPesada = montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO, modificacoes: [mod('Pesada', 3)] });
    const conflito = verificarConflitoModificacao({ item: comPesada, modificacao: 'Furtiva' });
    expect(conflito.bloqueada).toBe(true);
    expect(conflito.bloqueadaPor).toEqual(['Pesada']);

    const comFurtiva = montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO, modificacoes: [mod('Furtiva', 1)] });
    const conflitoInverso = verificarConflitoModificacao({ item: comFurtiva, modificacao: 'Pesada' });
    expect(conflitoInverso.bloqueada).toBe(true);
    expect(conflitoInverso.bloqueia).toEqual(['Furtiva']);
  });

  it('não acusa conflito entre modificações compatíveis', () => {
    const item = montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO, modificacoes: [mod('Letal', 1)] });
    expect(verificarConflitoModificacao({ item, modificacao: 'Reforçada' }).bloqueada).toBe(false);
  });
});

describe('calcularStatItem', () => {
  const item = (nome: string, categoria: ItemCategoriaEnum, modificacoes: ModificacaoAplicadaDto[] = []) =>
    montarItem({ nome, categoria, modificacoes });

  it('devolve o dano base quando não há modificações', () => {
    // docs/core/sistema-v4.1.0.md — Corpo a Corpo: Mediana 3D4 + Força [Físico].
    expect(calcularStatItem({ item: item('Mediana', ItemCategoriaEnum.CORPO_A_CORPO) })?.dano).toBe('3D4+FOR [Físico]');
  });

  it('Pesada sobe o tipo de dado com teto D10 (arma Pesada 3D8 → 3D10)', () => {
    expect(calcularStatItem({ item: item('Pesada', ItemCategoriaEnum.CORPO_A_CORPO, [mod('Pesada', 3)]) })?.dano).toBe('3D10+FOR [Físico]');
  });

  it('Reforçada soma dados do tipo base da arma', () => {
    expect(calcularStatItem({ item: item('Mediana', ItemCategoriaEnum.CORPO_A_CORPO, [mod('Reforçada', 2)]) })?.dano).toBe('5D4+FOR [Físico]');
  });

  it('Pesada + Reforçada: Reforçada mantém o dado base ao lado do dado elevado', () => {
    expect(calcularStatItem({ item: item('Mediana', ItemCategoriaEnum.CORPO_A_CORPO, [mod('Pesada', 3), mod('Reforçada', 1)]) })?.dano).toBe('3D6+1D4+FOR [Físico]');
  });

  it('Letal soma dano fixo; Explosiva adiciona um grupo de dano por tipo', () => {
    expect(calcularStatItem({ item: item('Mediana', ItemCategoriaEnum.CORPO_A_CORPO, [mod('Letal', 3)]) })?.dano).toBe('3D4+FOR+6 [Físico]');
    expect(calcularStatItem({ item: item('Mediana', ItemCategoriaEnum.CORPO_A_CORPO, [mod('Explosiva', 2)]) })?.dano).toBe('3D4+FOR [Físico] + 2D4 [Explosão]');
  });

  it('Armas de Fogo: Potência soma fixo, Plasma adiciona dado e troca a munição', () => {
    expect(calcularStatItem({ item: item('Pistola', ItemCategoriaEnum.ARMAS_DE_FOGO, [mod('Potência', 2)]) })?.dano).toBe('2D6+4 [Balístico]');
    const comPlasma = calcularStatItem({ item: item('Pistola', ItemCategoriaEnum.ARMAS_DE_FOGO, [mod('Plasma', 1)]) });
    expect(comPlasma?.dano).toBe('2D6 [Balístico] + 1D8 [Químico]');
    expect(comPlasma?.informacao).toBe('Curto · Mun: Células de Plasma');
  });

  it('Exóticos: Vibrante soma +1D8 [Físico] por stack', () => {
    expect(calcularStatItem({ item: item('Motoserra', ItemCategoriaEnum.EXOTICOS, [mod('Vibrante', 1)]) })?.dano).toBe('2D8+1D8 [Físico]');
  });

  it('Explosivos: Potente soma 2 dados de dano por empilhamento', () => {
    // Granada de Mão 3D10; Potente inicia em 2 → +4 dados.
    expect(calcularStatItem({ item: item('Granada de Mão', ItemCategoriaEnum.EXPLOSIVOS, [mod('Potente', 2)]) })?.dano).toBe('7D10 [Explosão]');
  });

  it('Proteções: Blindada +2, Camuflada −1 (mín. 0) e Hazmat adiciona resistência Química', () => {
    expect(calcularStatItem({ item: item('Colete de Kevlar', ItemCategoriaEnum.PROTECOES, [mod('Blindada', 1)]) })?.resistencia).toBe('7 [Físico], 5 [Balístico]');
    expect(calcularStatItem({ item: item('Colete de Kevlar', ItemCategoriaEnum.PROTECOES, [mod('Camuflada', 1)]) })?.resistencia).toBe('4 [Físico], 2 [Balístico]');
    expect(calcularStatItem({ item: item('Colete de Kevlar', ItemCategoriaEnum.PROTECOES, [mod('Hazmat', 1)]) })?.resistencia).toBe('5 [Físico], 3 [Balístico], 2 [Químico]');
  });

  it('Armazenamento: bônus de inventário com Compartimentos Extras', () => {
    expect(calcularStatItem({ item: item('Mochila Mediana', ItemCategoriaEnum.ARMAZENAMENTO) })?.bonusArmazenamento).toBe(6);
    expect(calcularStatItem({ item: item('Mochila Mediana', ItemCategoriaEnum.ARMAZENAMENTO, [mod('Compartimentos Extras', 2)]) })?.bonusArmazenamento).toBe(8);
  });

  it('devolve null para item fora do catálogo', () => {
    expect(calcularStatItem({ item: item('Item Inexistente', ItemCategoriaEnum.CORPO_A_CORPO) })).toBeNull();
  });
});

describe('interpretarBonusArmazenamento', () => {
  it('extrai o número, aceitando vírgula decimal do pt-BR', () => {
    expect(interpretarBonusArmazenamento({ texto: '+6 inv.' })).toBe(6);
    expect(interpretarBonusArmazenamento({ texto: '+4,5 inv.' })).toBe(4.5);
  });

  it('devolve 0 para texto ausente ou sem número', () => {
    expect(interpretarBonusArmazenamento({ texto: null })).toBe(0);
    expect(interpretarBonusArmazenamento({ texto: undefined })).toBe(0);
    expect(interpretarBonusArmazenamento({ texto: 'sem numero' })).toBe(0);
  });
});

describe('calcularCustoAmplificador', () => {
  it('cobra $3000 no primeiro empilhamento e $1000 por empilhamento extra', () => {
    // docs/core/sistema-v4.1.0.md — "Amplificadores".
    expect(calcularCustoAmplificador({ empilhamentos: 1 })).toBe(3000);
    expect(calcularCustoAmplificador({ empilhamentos: 3 })).toBe(5000);
  });
});

describe('calcularTotaisCarrinho', () => {
  it('soma custo de item + modificações + amplificador e o peso ocupado', () => {
    const totais = calcularTotaisCarrinho({
      itens: [
        montarItem({
          nome: 'Mediana',
          categoria: ItemCategoriaEnum.CORPO_A_CORPO,
          custo: 1000,
          peso: 2,
          modificacoes: [mod('Pesada', 3)],
        }),
      ],
      amplificadores: [{ nome: 'Vida', empilhamentos: 2 }],
    });

    // Item 1000 + Pesada (1 compra × $750) + amp (3000 + 1000) = 5750
    expect(totais.gasto).toBe(5750);
    // Peso 2 (base) + 3 empilhamentos × 0,5 = 3,5
    expect(totais.pesoUsado).toBe(3.5);
    expect(totais.empilhamentosAmplificador).toBe(2);
    expect(totais.bonusInventario).toBe(0);
  });

  it('armazenamento vestido amplia o inventário e não pesa', () => {
    const totais = calcularTotaisCarrinho({
      itens: [
        montarItem({
          nome: 'Mochila Mediana',
          categoria: ItemCategoriaEnum.ARMAZENAMENTO,
          custo: 750,
          peso: 0.5,
          guardada: false,
          modificacoes: [mod('Compartimentos Extras', 2)],
        }),
      ],
      amplificadores: [],
    });

    // 750 + Compartimentos Extras (2 compras × $300) = 1350
    expect(totais.gasto).toBe(1350);
    expect(totais.pesoUsado).toBe(0);
    // Bônus base +6 + Compartimentos Extras ×2 = 8
    expect(totais.bonusInventario).toBe(8);
  });

  it('armazenamento guardado pesa (mods de armazenamento não agregam peso) e não amplia', () => {
    const totais = calcularTotaisCarrinho({
      itens: [
        montarItem({
          nome: 'Mochila Mediana',
          categoria: ItemCategoriaEnum.ARMAZENAMENTO,
          custo: 750,
          peso: 0.5,
          guardada: true,
          modificacoes: [mod('Compartimentos Extras', 2)],
        }),
      ],
      amplificadores: [],
    });

    // Guardada: pesa só o item base (mods de armazenamento têm peso 0) e não amplia inventário.
    expect(totais.pesoUsado).toBe(0.5);
    expect(totais.bonusInventario).toBe(0);
  });
});

describe('calcularResumoCompras', () => {
  it('compõe patente, restante, inventário efetivo, limite e penalidade de amplificadores', () => {
    const resumo = calcularResumoCompras({
      itens: [
        montarItem({
          nome: 'Mediana',
          categoria: ItemCategoriaEnum.CORPO_A_CORPO,
          custo: 1000,
          peso: 2,
          modificacoes: [mod('Pesada', 3)],
        }),
      ],
      amplificadores: [{ nome: 'Vida', empilhamentos: 2 }],
      dinheiro: 5000,
      prestigio: 12,
      inventario: 10,
      vontade: 2,
    });

    expect(resumo.patente).toBe(PatenteEnum.VETERANO);
    expect(resumo.limiteModificacoes).toEqual({ patente: PatenteEnum.VETERANO, maxEmpilhamentos: 3, maxModificacoes: 9 });
    expect(resumo.gasto).toBe(5750);
    expect(resumo.dinheiroRestante).toBe(-750);
    expect(resumo.pesoUsado).toBe(3.5);
    expect(resumo.inventarioEfetivo).toBe(10);
    // Limite de amplificadores = Vontade × 3; penalidade = −2 por empilhamento além do 1º.
    expect(resumo.limiteAmplificadores).toBe(6);
    expect(resumo.penalidadeVontade).toBe(2);
  });
});

describe('coerência do catálogo e das tabelas', () => {
  it('cobre todas as categorias do enum, com rótulo e ícone', () => {
    const categorias = CATALOGO_CATEGORIAS.map((categoria) => categoria.categoria);
    expect(new Set(categorias)).toEqual(new Set(Object.values(ItemCategoriaEnum)));
    CATALOGO_CATEGORIAS.forEach((categoria) => {
      expect(categoria.rotulo.length).toBeGreaterThan(0);
      expect(categoria.icone.length).toBeGreaterThan(0);
    });
  });

  it('tem itens com custo e peso não negativos em toda categoria (exceto Amplificador)', () => {
    Object.values(ItemCategoriaEnum).forEach((categoria) => {
      const itens = CATALOGO_ITENS[categoria];
      if (categoria === ItemCategoriaEnum.AMPLIFICADOR) {
        expect(itens).toHaveLength(0);
        return;
      }
      expect(itens.length).toBeGreaterThan(0);
      itens.forEach((item) => {
        expect(item.custo).toBeGreaterThanOrEqual(0);
        expect(item.peso).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('toda modificação tem empilhamentos iniciais dentro do próprio limite e "bloqueia" nomes reais da mesma categoria', () => {
    Object.entries(MODIFICACOES).forEach(([, modificacoes]) => {
      const nomes = new Set(modificacoes.map((modificacao) => modificacao.nome));
      modificacoes.forEach((modificacao) => {
        expect(modificacao.empilhamentosIniciais).toBeGreaterThanOrEqual(1);
        expect(modificacao.empilhamentosIniciais).toBeLessThanOrEqual(modificacao.empilhamentoMaximo);
        modificacao.bloqueia.forEach((bloqueado) => expect(nomes.has(bloqueado)).toBe(true));
      });
    });
  });

  it('lista os 16 amplificadores, cada um com empilhamentos iniciais dentro do limite', () => {
    expect(AMPLIFICADORES).toHaveLength(16);
    AMPLIFICADORES.forEach((amplificador) => {
      expect(amplificador.empilhamentosIniciais).toBeGreaterThanOrEqual(1);
      expect(amplificador.empilhamentosIniciais).toBeLessThanOrEqual(amplificador.empilhamentoMaximo);
    });
  });
});
