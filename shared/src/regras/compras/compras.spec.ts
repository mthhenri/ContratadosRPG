import { describe, expect, it } from 'vitest';
import { FragmentoModuloEnum, FragmentoTipoEnum, ItemCategoriaEnum, ModificacaoEfeitoTipoEnum, PatenteEnum } from '../../enums';
import { AMPLIFICADORES, CATALOGO_CATEGORIAS, MODIFICACOES } from './compras.dados';
import { CATALOGO_ITENS } from './catalogo.dados';
import { CarrinhoItemDto, ModificacaoAplicadaDto } from './compras.dtos';
import {
  calcularCustoAmplificador,
  alterarContagemMunicao,
  calcularResumoCompras,
  calcularStatItem,
  calcularTotaisCarrinho,
  contarComprasModificacao,
  descreverEfeitoModificacao,
  descreverEfeitosModificacao,
  escalarDescricaoCatalogoPorCompras,
  interpretarBonusArmazenamento,
  criarContagemMunicao,
  listarModificacoesDisponiveis,
  listarSubInventarios,
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

describe('contagem de munição', () => {
  it('cria 9mm cheia, consome sem ficar negativa e mantém o Míssil como disparo', () => {
    const noveMm = criarContagemMunicao(montarItem({ nome: '9mm', categoria: ItemCategoriaEnum.MUNICOES }));
    expect(noveMm).toEqual({ atual: 3, maxima: 3, unidade: 'CENA' });
    expect(alterarContagemMunicao(noveMm!, -9)).toEqual({ atual: 0, maxima: 3, unidade: 'CENA' });

    expect(criarContagemMunicao(montarItem({ nome: 'Míssil', categoria: ItemCategoriaEnum.MUNICOES }))).toEqual({
      atual: 1,
      maxima: 1,
      unidade: 'DISPARO',
    });
  });
});

describe('listarModificacoesDisponiveis — "Apenas escudos" (Combativo/Arremesso)', () => {
  // docs/core/sistema-v4.1.0.md — Proteções: "Combativo" e "Arremesso" são "Apenas para escudos".
  // A categoria PROTECOES mistura proteções (coletes/armaduras) e escudos: as mods de escudo só
  // podem ser oferecidas aos escudos.
  it('não oferece as mods exclusivas de escudo para proteções que não são escudo', () => {
    const colete = montarItem({ nome: 'Colete Leve', categoria: ItemCategoriaEnum.PROTECOES });
    const nomes = listarModificacoesDisponiveis(colete).map((modificacao) => modificacao.nome);
    expect(nomes).not.toContain('Combativo');
    expect(nomes).not.toContain('Arremesso');
    // As demais modificações de proteção continuam disponíveis.
    expect(nomes).toContain('Blindada');
    expect(nomes).toContain('Reforçada');
  });

  it('oferece as mods exclusivas de escudo para escudos', () => {
    const escudo = montarItem({ nome: 'Escudo Médio', categoria: ItemCategoriaEnum.PROTECOES });
    const nomes = listarModificacoesDisponiveis(escudo).map((modificacao) => modificacao.nome);
    expect(nomes).toContain('Combativo');
    expect(nomes).toContain('Arremesso');
  });

  it('só o escudo com Combativo empresta as modificações de Corpo a Corpo', () => {
    const escudoCombativo = montarItem({
      nome: 'Escudo Médio',
      categoria: ItemCategoriaEnum.PROTECOES,
      modificacoes: [mod('Combativo', 1)],
    });
    expect(obterCategoriaEmprestada(escudoCombativo)).toBe(ItemCategoriaEnum.CORPO_A_CORPO);
    const nomes = listarModificacoesDisponiveis(escudoCombativo).map((modificacao) => modificacao.nome);
    expect(nomes).toContain('Letal'); // modificação de Corpo a Corpo emprestada

    // Uma proteção comum com o mesmo dado não vira "combativa" nem empresta Corpo a Corpo.
    const coleteCombativo = montarItem({
      nome: 'Colete Leve',
      categoria: ItemCategoriaEnum.PROTECOES,
      modificacoes: [mod('Combativo', 1)],
    });
    expect(obterCategoriaEmprestada(coleteCombativo)).toBeNull();
  });
});

/** Bug de m3-44: "Bolso de Corpo" oferecia todas as mods de Armazenamento (doc — "Apenas pode aplicar a modificação Bolso Tático"). */
describe('listarModificacoesDisponiveis — restrição por item (m3-44, "modificacoesPermitidas")', () => {
  it('"Bolso de Corpo" só oferece "Bolso Tático", nenhuma outra mod de Armazenamento', () => {
    const bolso = montarItem({ nome: 'Bolso de Corpo', categoria: ItemCategoriaEnum.ARMAZENAMENTO });
    const nomes = listarModificacoesDisponiveis(bolso).map((modificacao) => modificacao.nome);
    expect(nomes).toEqual(['Bolso Tático']);
  });

  it('uma Mochila comum continua oferecendo todas as mods de Armazenamento (sem restrição)', () => {
    const mochila = montarItem({ nome: 'Mochila Pequena', categoria: ItemCategoriaEnum.ARMAZENAMENTO });
    const nomes = listarModificacoesDisponiveis(mochila).map((modificacao) => modificacao.nome);
    expect(nomes).toEqual(
      expect.arrayContaining(['Compartimentos Extras', 'Bolso Tático', 'Camadas Extras', 'Espaço Reservado', 'Arsenal Reserva', 'Distribuição de Peso']),
    );
  });

  it('"Pochete" não tem restrição de modificações (só de categoria de item aceito dentro dela)', () => {
    const pochete = montarItem({ nome: 'Pochete', categoria: ItemCategoriaEnum.ARMAZENAMENTO });
    const nomes = listarModificacoesDisponiveis(pochete).map((modificacao) => modificacao.nome);
    expect(nomes).toContain('Compartimentos Extras');
  });
});

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

  it('Fragmento Construtor cobra o dobro do custo (doc — "⬦ Construtor", m3-65)', () => {
    const espadaConstrutor = montarItem({
      nome: 'Espada de Ossos',
      categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
    });
    // Empresta Corpo a Corpo ($750/mod) → dobrado pelo Construtor = $1500.
    expect(obterCustoModificacao({ item: espadaConstrutor, modificacao: 'Letal' })).toBe(1500);

    const coleteConstrutor = montarItem({
      nome: 'Colete de Vísceras',
      categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      categoriaEmprestada: ItemCategoriaEnum.PROTECOES,
    });
    expect(obterCustoModificacao({ item: coleteConstrutor, modificacao: 'Blindada' })).toBe(1500);
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

  it('Fragmento Potencializador acoplado (origemFragmento) nunca pesa no item alvo — regressão do bug que somava o peso padrão de mod (+0,2) ao acoplar num item', () => {
    const arma = montarItem({ nome: 'Pistola', categoria: ItemCategoriaEnum.ARMAS_DE_FOGO });
    expect(
      obterPesoModificacao({
        item: arma,
        modificacao: 'Fragmento Potencializador — Módulo III',
        origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.III },
      }),
    ).toBe(0);
  });

  it('Fragmento Construtor nunca pesa por modificação, mesmo "Pesada" (doc — "⬦ Construtor", m3-65)', () => {
    const espadaConstrutor = montarItem({
      nome: 'Espada de Ossos',
      categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
    });
    expect(obterPesoModificacao({ item: espadaConstrutor, modificacao: 'Pesada' })).toBe(0);
  });

  describe('pesoCustom (m3-76)', () => {
    it('mod custom sem pesoCustom cai no padrão de +0,2 (regra: "salvo indicação contrária")', () => {
      const item = montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO });
      expect(obterPesoModificacao({ item, modificacao: 'Encantada' })).toBe(0.2);
    });

    it('mod custom com pesoCustom usa o valor declarado em vez do padrão', () => {
      const item = montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO });
      expect(obterPesoModificacao({ item, modificacao: 'Encantada', pesoCustom: 0.5 })).toBe(0.5);
    });

    it('mod custom com pesoCustom 0 (zero) pesa 0, não cai no padrão de 0,2 — 0 é um valor declarado, não "ausente"', () => {
      const item = montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO });
      expect(obterPesoModificacao({ item, modificacao: 'Leve como pluma', pesoCustom: 0 })).toBe(0);
    });

    it('mod do catálogo real ignora pesoCustom mesmo se vier preenchido — o catálogo é a fonte de verdade', () => {
      const item = montarItem({ nome: 'Mediana', categoria: ItemCategoriaEnum.CORPO_A_CORPO });
      expect(obterPesoModificacao({ item, modificacao: 'Pesada', pesoCustom: 9 })).toBe(0.5);
    });
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

  it('Explosivos: Potente soma 2 dados de dano por compra (a 1ª compra, mesmo já vindo em ■■, não dobra)', () => {
    // Granada de Mão 3D10; Potente inicia em 2 (1ª compra) → +2 dados, não +4.
    expect(calcularStatItem({ item: item('Granada de Mão', ItemCategoriaEnum.EXPLOSIVOS, [mod('Potente', 2)]) })?.dano).toBe('5D10 [Explosão]');
    // Uma compra extra (3 stacks) reaplica o efeito: +4 dados.
    expect(calcularStatItem({ item: item('Granada de Mão', ItemCategoriaEnum.EXPLOSIVOS, [mod('Potente', 3)]) })?.dano).toBe('7D10 [Explosão]');
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

  it('Armazenamento: "Camadas Extras" não soma inventário (doc: só resistência) — regressão do bug que somava 0,5/stack', () => {
    expect(calcularStatItem({ item: item('Mochila Mediana', ItemCategoriaEnum.ARMAZENAMENTO, [mod('Camadas Extras', 3)]) })?.bonusArmazenamento).toBe(6);
  });

  it('devolve null para item fora do catálogo', () => {
    expect(calcularStatItem({ item: item('Item Inexistente', ItemCategoriaEnum.CORPO_A_CORPO) })).toBeNull();
  });

  it('Fragmento Construtor forma Proteção: a Resistência da Base escolhida funde com o bônus fixo do módulo (m3-69)', () => {
    // Mesmo padrão do bloco de DANO (roda pra qualquer categoria com `itemCatalogo.dano`) — antes
    // desta task o gate de Resistência excluía FRAGMENTO_CONSTRUTOR e o stat computado ficava
    // `null`, mesmo com a Resistência do item e o efeito RESISTENCIA da modificação automática
    // corretos nos dados (a UI nunca fundia os dois num único stat visível).
    const construtor = montarItem({
      nome: 'Colete de Vísceras',
      categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      resistencia: '4 [Físico]',
      categoriaEmprestada: ItemCategoriaEnum.PROTECOES,
      modificacoes: [
        {
          nome: 'Fragmento Construtor — Módulo I',
          empilhamentos: 1,
          efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 10 }],
        },
      ],
    });
    expect(calcularStatItem({ item: construtor })?.resistencia).toBe('14 [Físico]');
  });

  /**
   * Bugs de m3-43 (item 16 do lote): mods de Proteções "Flexível"/"Resistente" (doc — "⬥
   * Modificações" de Proteções e Escudos) não tinham efeito mecânico algum — só o chip descritivo.
   */
  describe('Proteções: Esquiva/Bloqueio/Defesa (m3-43)', () => {
    it('Flexível soma Esquiva por compra; Resistente soma Bloqueio por compra (a 1ª compra, mesmo em ■■, não dobra)', () => {
      expect(calcularStatItem({ item: item('Colete de Kevlar', ItemCategoriaEnum.PROTECOES, [mod('Flexível', 2)]) })?.bonusEsquiva).toBe(1);
      expect(calcularStatItem({ item: item('Colete de Kevlar', ItemCategoriaEnum.PROTECOES, [mod('Resistente', 2)]) })?.bonusBloqueio).toBe(1);
    });

    it('uma compra extra de Flexível/Resistente (além da 1ª) reaplica o efeito normalmente', () => {
      expect(calcularStatItem({ item: item('Colete de Kevlar', ItemCategoriaEnum.PROTECOES, [mod('Flexível', 3)]) })?.bonusEsquiva).toBe(2);
      expect(calcularStatItem({ item: item('Colete de Kevlar', ItemCategoriaEnum.PROTECOES, [mod('Resistente', 5)]) })?.bonusBloqueio).toBe(4);
    });

    it('sem Flexível/Resistente, os bônus ficam undefined (nada pra somar)', () => {
      const stat = calcularStatItem({ item: item('Colete de Kevlar', ItemCategoriaEnum.PROTECOES) });
      expect(stat?.bonusEsquiva).toBeUndefined();
      expect(stat?.bonusBloqueio).toBeUndefined();
      expect(stat?.bonusDefesa).toBeUndefined();
    });

    it('efeito custom DEFESA soma na variante indicada (Esquiva por padrão, ou Bloqueio/Defesa)', () => {
      const comEfeito = (variante: string | undefined) =>
        montarItem({
          nome: 'Colete customizado',
          categoria: ItemCategoriaEnum.PROTECOES,
          resistencia: '5 [Físico]',
          modificacoes: [
            {
              nome: 'Placa Extra',
              empilhamentos: 1,
              efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 2, variante }],
            },
          ],
        });
      expect(calcularStatItem({ item: comEfeito(undefined) })?.bonusEsquiva).toBe(2);
      expect(calcularStatItem({ item: comEfeito('Bloqueio') })?.bonusBloqueio).toBe(2);
      expect(calcularStatItem({ item: comEfeito('Defesa') })?.bonusDefesa).toBe(2);
    });
  });

  /**
   * Bug de m3-43 (item 28): armazenamento com resistência embutida (ex. Mochila Kevlar) ou com a
   * mod "Camadas Extras" (doc: "+1 de resistência à Físico e Balístico") não computava resistência
   * nenhuma — a ramificação de resistência só rodava quando o catálogo já tinha `resistencia`.
   */
  describe('Armazenamento: resistência (m3-43)', () => {
    it('Mochila Kevlar tem resistência embutida (doc: "Resistência: 2 Físico e Balístico")', () => {
      expect(calcularStatItem({ item: item('Mochila Kevlar', ItemCategoriaEnum.ARMAZENAMENTO) })?.resistencia).toBe(
        '2 [Físico], 2 [Balístico]',
      );
    });

    it('Camadas Extras soma resistência mesmo em armazenamento sem resistência de catálogo', () => {
      expect(
        calcularStatItem({ item: item('Mochila Mediana', ItemCategoriaEnum.ARMAZENAMENTO, [mod('Camadas Extras', 2)]) })
          ?.resistencia,
      ).toBe('2 [Físico], 2 [Balístico]');
    });

    it('Mochila Kevlar mantém o bônus de inventário ao lado da resistência (os dois stats coexistem)', () => {
      const stat = calcularStatItem({ item: item('Mochila Kevlar', ItemCategoriaEnum.ARMAZENAMENTO) });
      expect(stat?.bonusArmazenamento).toBe(4.5);
      expect(stat?.resistencia).toBe('2 [Físico], 2 [Balístico]');
    });
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

  it('Fragmento Potencializador acoplado a uma arma não soma peso ao total (regressão: só o peso base da arma conta)', () => {
    const totais = calcularTotaisCarrinho({
      itens: [
        montarItem({
          nome: 'Pistola',
          categoria: ItemCategoriaEnum.ARMAS_DE_FOGO,
          custo: 500,
          peso: 1,
          modificacoes: [
            {
              nome: 'Fragmento Potencializador — Módulo III',
              empilhamentos: 1,
              origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.III },
            },
          ],
        }),
      ],
      amplificadores: [],
    });

    expect(totais.pesoUsado).toBe(1);
  });

  it('mod custom com pesoCustom pesa o valor declarado, não o padrão de +0,2 (m3-76)', () => {
    const totais = calcularTotaisCarrinho({
      itens: [
        montarItem({
          nome: 'Mediana',
          categoria: ItemCategoriaEnum.CORPO_A_CORPO,
          custo: 1000,
          peso: 2,
          modificacoes: [{ nome: 'Encantada', empilhamentos: 1, pesoCustom: 0.5 }],
        }),
      ],
      amplificadores: [],
    });

    // Peso 2 (base) + 1 empilhamento × 0,5 (pesoCustom) = 2,5
    expect(totais.pesoUsado).toBe(2.5);
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

  /** Bug de m3-44 (item 14): Pochete/Bolso de Corpo têm inventário separado, não ampliam o principal. */
  describe('sub-inventário próprio (Pochete/Bolso de Corpo, m3-44)', () => {
    it('vestida, não soma o bônus de uma Pochete no inventário principal', () => {
      const totais = calcularTotaisCarrinho({
        itens: [montarItem({ nome: 'Pochete', categoria: ItemCategoriaEnum.ARMAZENAMENTO, custo: 200, peso: 0.2, id: 'poch-1' })],
        amplificadores: [],
      });
      expect(totais.bonusInventario).toBe(0);
      expect(totais.pesoUsado).toBe(0);
    });

    it('um item com containerId não pesa contra o inventário principal, mesmo fora de qualquer container real', () => {
      const totais = calcularTotaisCarrinho({
        itens: [
          montarItem({ nome: '9mm', categoria: ItemCategoriaEnum.MUNICOES, peso: 0.5, quantidade: 4, containerId: 'poch-1' }),
        ],
        amplificadores: [],
      });
      expect(totais.pesoUsado).toBe(0);
    });

    it('vestida, não soma o bônus de uma Mochila Médica no inventário principal (restrita a Medicinal)', () => {
      const totais = calcularTotaisCarrinho({
        itens: [montarItem({ nome: 'Mochila Médica', categoria: ItemCategoriaEnum.ARMAZENAMENTO, custo: 1600, peso: 0.5, id: 'med-1' })],
        amplificadores: [],
      });
      expect(totais.bonusInventario).toBe(0);
    });

    it('Mochila comum (sem inventarioProprio) continua ampliando o principal normalmente', () => {
      const totais = calcularTotaisCarrinho({
        itens: [montarItem({ nome: 'Mochila Pequena', categoria: ItemCategoriaEnum.ARMAZENAMENTO, custo: 300, peso: 0.3 })],
        amplificadores: [],
      });
      expect(totais.bonusInventario).toBe(3);
    });

    // A UI não deixa mover um armazenamento pra dentro de outro (proteção contra o
    // caso do usuário: "Mochila Mediana" dentro de "Bolso de Corpo" mostrava +6 inv. duplicado no
    // principal E contando peso no sub-inventário) — o motor não confia só nisso.
    it('um armazenamento comum com `containerId` (defesa: não deveria acontecer pela UI) não soma bônus nem peso no principal', () => {
      const totais = calcularTotaisCarrinho({
        itens: [
          montarItem({ nome: 'Bolso de Corpo', categoria: ItemCategoriaEnum.ARMAZENAMENTO, custo: 75, peso: 0.1, id: 'bolso-1' }),
          montarItem({
            nome: 'Mochila Pequena',
            categoria: ItemCategoriaEnum.ARMAZENAMENTO,
            custo: 300,
            peso: 0.3,
            containerId: 'bolso-1',
          }),
        ],
        amplificadores: [],
      });
      expect(totais.bonusInventario).toBe(0);
      expect(totais.pesoUsado).toBe(0);
    });
  });
});

describe('listarSubInventarios (m3-44)', () => {
  it('devolve vazio sem containers vestidos', () => {
    expect(listarSubInventarios([])).toEqual([]);
    const guardada = montarItem({ nome: 'Pochete', categoria: ItemCategoriaEnum.ARMAZENAMENTO, id: 'poch-1', guardada: true });
    expect(listarSubInventarios([guardada])).toEqual([]);
  });

  it('ignora um container sem `id` (de antes da m3-44)', () => {
    const semId = montarItem({ nome: 'Pochete', categoria: ItemCategoriaEnum.ARMAZENAMENTO });
    expect(listarSubInventarios([semId])).toEqual([]);
  });

  it('ignora um armazenamento comum (Mochila) — não tem `inventarioProprio`', () => {
    const mochila = montarItem({ nome: 'Mochila Pequena', categoria: ItemCategoriaEnum.ARMAZENAMENTO, id: 'moch-1' });
    expect(listarSubInventarios([mochila])).toEqual([]);
  });

  it('uma Pochete vestida abre sub-inventário com capacidade 2 e a categoria permitida', () => {
    const pochete = montarItem({ nome: 'Pochete', categoria: ItemCategoriaEnum.ARMAZENAMENTO, id: 'poch-1' });
    const subInventarios = listarSubInventarios([pochete]);
    expect(subInventarios).toHaveLength(1);
    expect(subInventarios[0]).toMatchObject({
      containerId: 'poch-1',
      nomeContainer: 'Pochete',
      capacidade: 2,
      pesoUsado: 0,
      categoriasPermitidas: [ItemCategoriaEnum.MUNICOES, ItemCategoriaEnum.OPERACIONAL, ItemCategoriaEnum.MEDICINAL],
    });
  });

  it('soma o peso dos itens com containerId apontando pra este container (não os de outro)', () => {
    const pochete = montarItem({ nome: 'Pochete', categoria: ItemCategoriaEnum.ARMAZENAMENTO, id: 'poch-1' });
    const municao = montarItem({
      nome: '9mm',
      categoria: ItemCategoriaEnum.MUNICOES,
      peso: 0.5,
      quantidade: 3,
      containerId: 'poch-1',
    });
    const deOutraPochete = montarItem({
      nome: '10mm',
      categoria: ItemCategoriaEnum.MUNICOES,
      peso: 0.7,
      containerId: 'outra-pochete',
    });
    const subInventarios = listarSubInventarios([pochete, municao, deOutraPochete]);
    expect(subInventarios[0].pesoUsado).toBe(1.5);
    expect(subInventarios[0].itens).toEqual([municao]);
  });

  it('soma o pesoCustom de uma mod custom aplicada a um item dentro do sub-inventário (m3-76)', () => {
    const pochete = montarItem({ nome: 'Pochete', categoria: ItemCategoriaEnum.ARMAZENAMENTO, id: 'poch-1' });
    const item = montarItem({
      nome: '9mm',
      categoria: ItemCategoriaEnum.MUNICOES,
      peso: 0.5,
      containerId: 'poch-1',
      modificacoes: [{ nome: 'Encantada', empilhamentos: 1, pesoCustom: 0.5 }],
    });
    const subInventarios = listarSubInventarios([pochete, item]);
    // 0,5 (base) + 0,5 (pesoCustom) = 1
    expect(subInventarios[0].pesoUsado).toBe(1);
  });

  it('Mochila Médica: abre sub-inventário só p/ Medicinal, capacidade 5, e reduz 0,5 de peso por item (piso 0)', () => {
    const mochila = montarItem({ nome: 'Mochila Médica', categoria: ItemCategoriaEnum.ARMAZENAMENTO, id: 'med-1' });
    const desfibrilador = montarItem({
      nome: 'Desfibrilador',
      categoria: ItemCategoriaEnum.MEDICINAL,
      peso: 1,
      containerId: 'med-1',
    });
    const calmante = montarItem({
      nome: 'Calmante',
      categoria: ItemCategoriaEnum.MEDICINAL,
      peso: 0.5,
      quantidade: 2,
      containerId: 'med-1',
    });
    const subInventarios = listarSubInventarios([mochila, desfibrilador, calmante]);
    expect(subInventarios[0]).toMatchObject({
      containerId: 'med-1',
      capacidade: 5,
      categoriasPermitidas: [ItemCategoriaEnum.MEDICINAL],
      // Desfibrilador: max(0, 1 − 0,5) × 1 = 0,5; Calmante: max(0, 0,5 − 0,5) × 2 = 0 (piso).
      pesoUsado: 0.5,
    });
  });

  it('um Bolso de Corpo vestido abre sub-inventário com capacidade 1 e sem restrição de categoria', () => {
    const bolso = montarItem({ nome: 'Bolso de Corpo', categoria: ItemCategoriaEnum.ARMAZENAMENTO, id: 'bolso-1' });
    const subInventarios = listarSubInventarios([bolso]);
    expect(subInventarios[0].capacidade).toBe(1);
    expect(subInventarios[0].categoriasPermitidas).toBeUndefined();
  });

  it('usa o apelido do container como nomeContainer quando definido (m3-33)', () => {
    const pochete = montarItem({
      nome: 'Pochete',
      categoria: ItemCategoriaEnum.ARMAZENAMENTO,
      id: 'poch-1',
      apelido: 'Pochete de campo',
    });
    expect(listarSubInventarios([pochete])[0].nomeContainer).toBe('Pochete de campo');
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

  it('tem itens com custo e peso não negativos em toda categoria (exceto Amplificador/Fragmentos)', () => {
    // Amplificadores e Fragmentos não têm catálogo comprável: amps vivem em AMPLIFICADORES; fragmentos
    // são achados e montados como itens custom (módulo + forma base + stats próprios).
    const semCatalogo: readonly ItemCategoriaEnum[] = [
      ItemCategoriaEnum.AMPLIFICADOR,
      ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
      ItemCategoriaEnum.SEM_CATEGORIA,
    ];
    Object.values(ItemCategoriaEnum).forEach((categoria) => {
      const itens = CATALOGO_ITENS[categoria];
      if (semCatalogo.includes(categoria)) {
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

  describe('itens e modificações custom "de verdade"', () => {
    function itemCustom(parcial: Partial<CarrinhoItemDto>): CarrinhoItemDto {
      return {
        nome: 'Custom',
        categoria: ItemCategoriaEnum.CORPO_A_CORPO,
        custo: 0,
        peso: 1,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        ...parcial,
      };
    }

    it('calcula o dano de um item custom a partir do stat embutido nele', () => {
      const item = itemCustom({ dano: '3D6+FOR [Físico]' });
      expect(calcularStatItem({ item })?.dano).toBe('3D6+FOR [Físico]');
    });

    it('calcula a resistência de uma proteção custom pelo stat embutido', () => {
      const item = itemCustom({ categoria: ItemCategoriaEnum.PROTECOES, resistencia: '10 [Físico]' });
      expect(calcularStatItem({ item })?.resistencia).toBe('10 [Físico]');
    });

    it('conta o bônus de inventário de um armazenamento custom vestido nos totais', () => {
      const item = itemCustom({ categoria: ItemCategoriaEnum.ARMAZENAMENTO, bonus: '+6 inv.', guardada: false });
      expect(calcularTotaisCarrinho({ itens: [item], amplificadores: [] }).bonusInventario).toBe(6);
    });

    it('exótico custom que declara categoria emprestada se encaixa nela sem "Faz Parte"', () => {
      const item = itemCustom({
        categoria: ItemCategoriaEnum.EXOTICOS,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      });
      expect(obterCategoriaEmprestada(item)).toBe(ItemCategoriaEnum.CORPO_A_CORPO);
    });

    it('mod custom DANO_FIXO soma ao dano do item, escalando com os empilhamentos', () => {
      const item = itemCustom({
        dano: '1D6 [Físico]',
        modificacoes: [
          { nome: 'Encantada', empilhamentos: 2, efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 2 }] },
        ],
      });
      // +2 por empilhamento × 2 = +4.
      expect(calcularStatItem({ item })?.dano).toBe('1D6+4 [Físico]');
    });

    it('mod custom DANO_DADOS acrescenta um grupo de dano do tipo informado', () => {
      const item = itemCustom({
        dano: '1D6 [Físico]',
        modificacoes: [
          {
            nome: 'Flamejante',
            empilhamentos: 2,
            efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 1, faces: 4, tipoDano: 'Químico' }],
          },
        ],
      });
      const dano = calcularStatItem({ item })?.dano;
      expect(dano).toContain('1D6 [Físico]');
      expect(dano).toContain('2D4 [Químico]');
    });

    it('mod custom DANO_DADOS_BASE soma dados ao dado base da arma', () => {
      const item = itemCustom({
        dano: '2D6+FOR [Físico]',
        modificacoes: [
          { nome: 'Reforço', empilhamentos: 2, efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: 1 }] },
        ],
      });
      // +1 dado base por empilhamento × 2 = 2D6 → 4D6.
      expect(calcularStatItem({ item })?.dano).toBe('4D6+FOR [Físico]');
    });

    it('mod custom ELEVAR_DADO sobe o tipo do dado de dano (máx D12)', () => {
      const item = itemCustom({
        dano: '2D6 [Físico]',
        modificacoes: [
          { nome: 'Peso', empilhamentos: 1, efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.ELEVAR_DADO, valor: 1 }] },
        ],
      });
      // D6 → D8.
      expect(calcularStatItem({ item })?.dano).toBe('2D8 [Físico]');
    });

    it('mod custom RESISTENCIA (todas) soma à proteção custom', () => {
      const item = itemCustom({
        categoria: ItemCategoriaEnum.PROTECOES,
        resistencia: '10 [Físico], 4 [Balístico]',
        modificacoes: [
          { nome: 'Blindagem', empilhamentos: 1, efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 5 }] },
        ],
      });
      expect(calcularStatItem({ item })?.resistencia).toBe('15 [Físico], 9 [Balístico]');
    });

    it('mod custom RESISTENCIA de um tipo específico cria/soma só nesse tipo', () => {
      const item = itemCustom({
        categoria: ItemCategoriaEnum.PROTECOES,
        resistencia: '10 [Físico]',
        modificacoes: [
          {
            nome: 'Hazmat caseiro',
            empilhamentos: 2,
            efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 2, tipoDano: 'Químico' }],
          },
        ],
      });
      const resistencia = calcularStatItem({ item })?.resistencia;
      expect(resistencia).toContain('10 [Físico]');
      expect(resistencia).toContain('4 [Químico]');
    });

    it('mod custom INVENTARIO amplia o bônus de um armazenamento vestido nos totais', () => {
      const item = itemCustom({
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        bonus: '+6 inv.',
        guardada: false,
        modificacoes: [
          { nome: 'Bolsos', empilhamentos: 3, efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.INVENTARIO, valor: 1 }] },
        ],
      });
      // 6 base + 1 × 3 empilhamentos = 9.
      expect(calcularTotaisCarrinho({ itens: [item], amplificadores: [] }).bonusInventario).toBe(9);
      expect(calcularStatItem({ item })?.bonusArmazenamento).toBe(9);
    });

    it('uma mod custom pode combinar efeitos (dano + condição), como Incendiária', () => {
      const item = itemCustom({
        dano: '1D8 [Balístico]',
        categoria: ItemCategoriaEnum.ARMAS_DE_FOGO,
        modificacoes: [
          {
            nome: 'Incandescente',
            empilhamentos: 1,
            efeitos: [
              { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 1, faces: 6, tipoDano: 'Químico' },
              { tipo: ModificacaoEfeitoTipoEnum.CONDICAO, condicao: 'Em Chamas', duracaoTurnos: 2 },
            ],
          },
        ],
      });
      const dano = calcularStatItem({ item })?.dano;
      expect(dano).toContain('1D8 [Balístico]');
      expect(dano).toContain('1D6 [Químico]');
    });

    it('descreverEfeitoModificacao gera o texto de chip de cada arquétipo', () => {
      expect(descreverEfeitoModificacao({ tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 2 })).toBe('+2 de dano');
      expect(
        descreverEfeitoModificacao({ tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 1, faces: 6, tipoDano: 'Químico' }),
      ).toBe('+1D6 [Químico]');
      expect(descreverEfeitoModificacao({ tipo: ModificacaoEfeitoTipoEnum.PERFURACAO, valor: 5, tipoDano: 'Balístico' })).toBe(
        'ignora 5 de resist. [Balístico]',
      );
      expect(descreverEfeitoModificacao({ tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: 2, variante: 'FIXO' })).toBe(
        '+2 nos testes',
      );
      expect(descreverEfeitoModificacao({ tipo: ModificacaoEfeitoTipoEnum.ALCANCE, valor: 1 })).toBe('+1 nível de alcance');
      expect(descreverEfeitoModificacao({ tipo: ModificacaoEfeitoTipoEnum.EFEITO, valor: 3, variante: 'FIXO' })).toBe(
        '+3 no efeito',
      );
      expect(descreverEfeitoModificacao({ tipo: ModificacaoEfeitoTipoEnum.EFEITO, valor: 1, variante: 'DADO' })).toBe(
        '+1 dado de efeito',
      );
      expect(descreverEfeitoModificacao({ tipo: ModificacaoEfeitoTipoEnum.EFEITO, valor: 2, variante: 'DADO' })).toBe(
        '+2 dados de efeito',
      );
      expect(
        descreverEfeitoModificacao({ tipo: ModificacaoEfeitoTipoEnum.CONDICAO, condicao: 'Sangramento', duracaoTurnos: 2, atributoDt: 'Força' }),
      ).toBe('aplica Sangramento por 2t (DT Força)');
    });

    it('descreverEfeitosModificacao junta os efeitos de uma mod com " · "', () => {
      expect(
        descreverEfeitosModificacao([
          { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 1, faces: 6, tipoDano: 'Químico' },
          { tipo: ModificacaoEfeitoTipoEnum.CONDICAO, condicao: 'Em Chamas' },
        ]),
      ).toBe('+1D6 [Químico] · aplica Em Chamas');
      expect(descreverEfeitosModificacao(undefined)).toBe('');
    });

    it('descreverEfeitosModificacao escala o valor de cada efeito pelo nº de compras', () => {
      expect(
        descreverEfeitosModificacao(
          [
            { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 1, faces: 6, tipoDano: 'Químico' },
            { tipo: ModificacaoEfeitoTipoEnum.CONDICAO, condicao: 'Em Chamas' },
          ],
          3,
        ),
      ).toBe('+3D6 [Químico] · aplica Em Chamas');
      expect(
        descreverEfeitosModificacao([{ tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 2 }], 4),
      ).toBe('+8 de dano');
      // Sem escala explícita (ou escala 1), o comportamento é idêntico ao valor digitado.
      expect(descreverEfeitosModificacao([{ tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 2 }])).toBe(
        '+2 de dano',
      );
    });

    it('escalarDescricaoCatalogoPorCompras multiplica o único número por stack pelo nº de compras', () => {
      expect(escalarDescricaoCatalogoPorCompras('Empunhadura Sofisticada', '+2 nos testes de ataque por stack', 5)).toBe(
        '+10 nos testes de ataque',
      );
      expect(escalarDescricaoCatalogoPorCompras('Lacerante', 'Ignora 5 pts de resist. [Físico] por stack', 5)).toBe(
        'Ignora 25 pts de resist. [Físico]',
      );
      expect(escalarDescricaoCatalogoPorCompras('Flexível', '+1 ao Esquivar por compra', 3)).toBe('+3 ao Esquivar');
      expect(escalarDescricaoCatalogoPorCompras('Explosiva', '+1D6 [Explosão] por stack', 4)).toBe('+4D6 [Explosão]');
    });

    it('escalarDescricaoCatalogoPorCompras não altera com 1 compra ou sem marcador de stack', () => {
      expect(escalarDescricaoCatalogoPorCompras('Empunhadura Sofisticada', '+2 nos testes de ataque por stack', 1)).toBe(
        '+2 nos testes de ataque por stack',
      );
      expect(escalarDescricaoCatalogoPorCompras('Atordoamento', 'Alvos atingidos ficam Atordoados por 1 turno', 5)).toBe(
        'Alvos atingidos ficam Atordoados por 1 turno',
      );
    });

    it('escalarDescricaoCatalogoPorCompras não escala texto ambíguo fora da tabela de escalas manuais', () => {
      expect(escalarDescricaoCatalogoPorCompras('Mod Inventada', 'Causa Envenenado 2t (DT Força). +2 DT/+1t por stack', 5)).toBe(
        'Causa Envenenado 2t (DT Força). +2 DT/+1t por stack',
      );
    });

    it('escalarDescricaoCatalogoPorCompras calcula o total de descrições com dois valores por stack (tabela manual)', () => {
      expect(escalarDescricaoCatalogoPorCompras('Pesada', '+1 tipo de dado (máx D10), +0,5 peso/stack', 3)).toBe(
        '+3 tipos de dado (máx D10), +1,5 de peso',
      );
      expect(
        escalarDescricaoCatalogoPorCompras('Sangramento', 'Causa Sangramento 2t (DT Força). +2 DT/+1t por stack', 5),
      ).toBe('Causa Sangramento 2t (DT Força). +10 DT/+5t');
      expect(
        escalarDescricaoCatalogoPorCompras('Venenosa', 'Causa Envenenado 2t (DT Força). +2 DT/+1t por stack', 2),
      ).toBe('Causa Envenenado 2t (DT Força). +4 DT/+2t');
      expect(
        escalarDescricaoCatalogoPorCompras(
          'Posicionável',
          'Instalável e ativável remotamente (30m; DT +2/+5m/stack)',
          3,
        ),
      ).toBe('Instalável e ativável remotamente (30m; DT +6/+15m)');
      expect(escalarDescricaoCatalogoPorCompras('Camuflada', '−1 peso (mín. 1), −1 resist. por stack', 4)).toBe(
        '−4 peso (mín. 1), −4 resist.',
      );
    });

    it('escalarDescricaoCatalogoPorCompras ignora a escala manual se o texto do catálogo mudou', () => {
      expect(escalarDescricaoCatalogoPorCompras('Pesada', 'texto diferente do catálogo atual/stack', 3)).toBe(
        'texto diferente do catálogo atual/stack',
      );
    });
  });
});
