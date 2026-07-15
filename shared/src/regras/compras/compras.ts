import { ItemCategoriaEnum } from '../../enums';
import { elevarDado } from '../descanso';
import { obterPatente } from '../patente';
import { CATALOGO_ITENS, ItemCatalogo } from './catalogo.dados';
import {
  CUSTO_EMPILHAMENTO_AMPLIFICADOR,
  CUSTO_MODIFICACAO,
  CUSTO_MODIFICACAO_PADRAO,
  CUSTO_PRIMEIRO_AMPLIFICADOR,
  LIMITES_MODIFICACAO,
  ModificacaoDados,
  MODIFICACOES,
  MULTIPLICADOR_LIMITE_AMPLIFICADOR,
  PENALIDADE_VONTADE_POR_EMPILHAMENTO,
  PESO_MODIFICACAO_PADRAO,
} from './compras.dados';
import {
  BonusArmazenamentoInterpretarDto,
  CarrinhoItemDto,
  ComprasModificacaoContarDto,
  ConflitoModificacaoDto,
  ConflitoModificacaoVerificarDto,
  CustoAmplificadorCalcularDto,
  LimiteModificacoesDto,
  LimiteModificacoesObterDto,
  ModificacaoItemDto,
  ResumoComprasCalcularDto,
  ResumoComprasDto,
  StatItemCalcularDto,
  StatItemDto,
  TotaisCarrinhoCalcularDto,
  TotaisCarrinhoDto,
} from './compras.dtos';

/**
 * Motor de regras da aba compras (m1-05): funções puras de limite por patente,
 * custo e peso de modificação, conflitos, stat computado de item, custo de
 * amplificador e totais do carrinho. Migradas de
 * `contratados-calculadora/src/script.js` e conferidas contra
 * docs/core/sistema-v4.1.0.md — "Equipamentos", "Prestígio e Patentes" e
 * "Amplificadores". Em conflito, o documento vence (proibição #27). Reusa
 * `obterPatente` (m1-03) para Prestígio → patente e `elevarDado` (m1-04) para a
 * escada de dados de dano.
 */

/**
 * Limite de modificações da patente correspondente ao Prestígio: empilhamentos
 * por modificação e modificações por item. Reusa `obterPatente` (m1-03) para não
 * duplicar as faixas de Prestígio. Espelha `getPatenteMod` do site antigo.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Prestígio e Patentes" (tabela "Limite de
 * Modificações").
 */
export function obterLimiteModificacoes(dto: LimiteModificacoesObterDto): LimiteModificacoesDto {
  const patente = obterPatente({ prestigio: dto.prestigio }).patente;
  const limite = LIMITES_MODIFICACAO[patente];
  return {
    patente,
    maxEmpilhamentos: limite.maxEmpilhamentos,
    maxModificacoes: limite.maxModificacoes,
  };
}

/**
 * Extrai o número do texto de bônus de um armazenamento (ex.: `"+6 inv."` → 6,
 * `"+4,5 inv."` → 4.5). Texto ausente ou sem número devolve 0. Espelha
 * `parseStorageBonus` do site antigo (vírgula decimal do pt-BR vira ponto).
 */
export function interpretarBonusArmazenamento(dto: BonusArmazenamentoInterpretarDto): number {
  if (!dto.texto) {
    return 0;
  }
  const numero = dto.texto.match(/([\d,]+)/);
  return numero ? parseFloat(numero[1].replace(',', '.')) : 0;
}

/**
 * Dados de catálogo (nome/custo/peso + stats) de um item do carrinho. Item do **catálogo** resolve
 * pela tabela (`CATALOGO_ITENS`, por nome); item **custom** (fora do catálogo — inclusive fragmentos)
 * usa os **stats embutidos no próprio item** (`dano`/`informacao`/`resistencia`/`bonus`/
 * `categoriaEmprestada`), fazendo o item inventado calcular seu stat **de verdade** como um do
 * catálogo. `null` quando não há dados de catálogo nem stats no item.
 */
export function resolverDadosItem(item: CarrinhoItemDto): ItemCatalogo | null {
  const doCatalogo = CATALOGO_ITENS[item.categoria]?.find((catalogo) => catalogo.nome === item.nome);
  if (doCatalogo) {
    return doCatalogo;
  }
  if (item.dano || item.informacao || item.resistencia || item.bonus || item.categoriaEmprestada) {
    return {
      nome: item.nome,
      custo: item.custo,
      peso: item.peso,
      dano: item.dano,
      informacao: item.informacao,
      resistencia: item.resistencia,
      bonus: item.bonus,
      descricao: item.descricao,
      categoriaEmprestada: item.categoriaEmprestada,
    };
  }
  return null;
}

/**
 * Categoria de modificações "emprestada" a um item: exóticos com a modificação
 * "Faz Parte" passam a aceitar as modificações da categoria indicada no catálogo
 * (`categoriaEmprestada`); escudos (proteções) com "Combativo" aceitam as de
 * Corpo a Corpo. Item **custom** (exótico ou Fragmento Construtor) que declara a
 * `categoriaEmprestada` no próprio item **se encaixa direto** naquela categoria
 * (ex.: manopla exótica que recebe mods de Corpo a Corpo; fragmento construtor que
 * tomou a forma de uma arma). Sem empréstimo, devolve `null`.
 */
export function obterCategoriaEmprestada(item: CarrinhoItemDto): ItemCategoriaEnum | null {
  // Item custom fora do catálogo que declara em qual categoria se encaixa: vale direto.
  const doCatalogo = CATALOGO_ITENS[item.categoria]?.find((catalogo) => catalogo.nome === item.nome);
  if (!doCatalogo && item.categoriaEmprestada) {
    return item.categoriaEmprestada;
  }
  if (item.categoria === ItemCategoriaEnum.EXOTICOS) {
    const temFazParte = item.modificacoes.some((modificacao) => modificacao.nome === 'Faz Parte');
    if (!temFazParte) {
      return null;
    }
    const itemCatalogo = CATALOGO_ITENS[ItemCategoriaEnum.EXOTICOS].find((catalogo) => catalogo.nome === item.nome);
    return itemCatalogo?.categoriaEmprestada ?? null;
  }
  if (item.categoria === ItemCategoriaEnum.PROTECOES) {
    if (item.modificacoes.some((modificacao) => modificacao.nome === 'Combativo')) {
      return ItemCategoriaEnum.CORPO_A_CORPO;
    }
  }
  return null;
}

/**
 * Modificações disponíveis para um item: as da própria categoria mais as da
 * categoria emprestada (via "Faz Parte" / "Combativo"), quando houver. Espelha
 * `getAllModDefs` do site antigo.
 */
export function listarModificacoesDisponiveis(item: CarrinhoItemDto): readonly ModificacaoDados[] {
  const base = MODIFICACOES[item.categoria] ?? [];
  const categoriaEmprestada = obterCategoriaEmprestada(item);
  if (!categoriaEmprestada) {
    return base;
  }
  return [...base, ...(MODIFICACOES[categoriaEmprestada] ?? [])];
}

/**
 * Quantas compras uma modificação representa: a 1ª compra concede
 * `empilhamentosIniciais` por um único custo; cada empilhamento além disso conta
 * como mais uma compra. Espelha `getModPurchases` do site antigo.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Empilhamento" (a mod com N níveis
 * iniciais custa uma modificação, mas ocupa N espaços do limite).
 */
export function contarComprasModificacao(dto: ComprasModificacaoContarDto): number {
  const definicao = listarModificacoesDisponiveis(dto.item).find((modificacao) => modificacao.nome === dto.modificacao);
  const empilhamentosIniciais = definicao ? definicao.empilhamentosIniciais : 1;
  return Math.max(1, dto.empilhamentos - empilhamentosIniciais + 1);
}

/**
 * Peso somado por empilhamento de uma modificação num item: o `peso` próprio da
 * modificação quando definido, senão o `PESO_MODIFICACAO_PADRAO` (+0,2). Espelha
 * `getModPeso` do site antigo.
 */
export function obterPesoModificacao(dto: ModificacaoItemDto): number {
  const definicao = listarModificacoesDisponiveis(dto.item).find((modificacao) => modificacao.nome === dto.modificacao);
  return definicao && definicao.peso !== undefined ? definicao.peso : PESO_MODIFICACAO_PADRAO;
}

/**
 * Custo por empilhamento de uma modificação num item. Modificações emprestadas
 * (via "Faz Parte" / "Combativo") custam o preço da categoria de origem; as
 * demais, o preço da categoria do item (ou o `CUSTO_MODIFICACAO_PADRAO`).
 * Espelha `getModCusto` do site antigo.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "$ 750 por modificação" (exceções:
 * Explosivos/Munições $ 250, Armazenamento $ 300).
 */
export function obterCustoModificacao(dto: ModificacaoItemDto): number {
  const categoriaEmprestada = obterCategoriaEmprestada(dto.item);
  if (categoriaEmprestada) {
    const emprestada = (MODIFICACOES[categoriaEmprestada] ?? []).some((modificacao) => modificacao.nome === dto.modificacao);
    if (emprestada) {
      return CUSTO_MODIFICACAO[categoriaEmprestada] ?? CUSTO_MODIFICACAO_PADRAO;
    }
  }
  return CUSTO_MODIFICACAO[dto.item.categoria] ?? CUSTO_MODIFICACAO_PADRAO;
}

/**
 * Verifica se uma modificação candidata conflita com as já aplicadas a um item,
 * nas duas direções: modificações ativas que a bloqueiam (`bloqueadaPor`) e
 * modificações ativas que ela bloquearia (`bloqueia`). `bloqueada` é `true` se
 * houver conflito em qualquer direção. Espelha a checagem de `bloqueia` de
 * `addMod`/`renderModSection` do site antigo.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — coluna "Bloqueia" das tabelas de modificação.
 */
export function verificarConflitoModificacao(dto: ConflitoModificacaoVerificarDto): ConflitoModificacaoDto {
  const definicoes = listarModificacoesDisponiveis(dto.item);
  const nomesAtivos = dto.item.modificacoes.map((modificacao) => modificacao.nome);

  const bloqueadaPor = nomesAtivos.filter((nomeAtivo) => {
    const definicaoAtiva = definicoes.find((modificacao) => modificacao.nome === nomeAtivo);
    return definicaoAtiva ? definicaoAtiva.bloqueia.includes(dto.modificacao) : false;
  });

  const definicaoCandidata = definicoes.find((modificacao) => modificacao.nome === dto.modificacao);
  const bloqueia = definicaoCandidata
    ? definicaoCandidata.bloqueia.filter((nomeBloqueado) => nomesAtivos.includes(nomeBloqueado))
    : [];

  return {
    bloqueada: bloqueadaPor.length > 0 || bloqueia.length > 0,
    bloqueadaPor,
    bloqueia,
  };
}

/** Um grupo de dados de dano do mesmo tipo (ex.: todos os `[Físico]`), acumulados para exibição num único colchete. */
interface GrupoDano {
  readonly tipo: string;
  readonly dados: string[];
}

/** Um dado de dano extra concedido por modificação (quantidade × faces, de um tipo de dano). */
interface DadoExtra {
  readonly quantidade: number;
  readonly faces: number;
  readonly tipo: string;
}

/**
 * Stat computado de um item com as modificações aplicadas: dano (armas),
 * resistência (proteções) ou bônus de inventário (armazenamento). Reusa
 * `elevarDado` (m1-04) para o degrau de dado da modificação Pesada. Devolve
 * `null` quando não há stat computável. Espelha `computeItemStat` do site
 * antigo — as notações de jogo saem sem ícone/rótulo (isso é UI, m1-10).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — tabelas de item e efeitos de modificação.
 */
export function calcularStatItem(dto: StatItemCalcularDto): StatItemDto | null {
  const item = dto.item;
  const itemCatalogo = resolverDadosItem(item);
  if (!itemCatalogo) {
    return null;
  }

  const empilhamentos: Record<string, number> = {};
  item.modificacoes.forEach((modificacao) => {
    empilhamentos[modificacao.nome] = modificacao.empilhamentos;
  });
  const empilhamentosDe = (nome: string): number => empilhamentos[nome] ?? 0;

  // ── DANO ──────────────────────────────────────────────────────────────────
  if (itemCatalogo.dano) {
    const base = itemCatalogo.dano;
    const partes = base.match(/^(\d+)D(\d+)(.*?)\s*\[([^\]]+)\]$/);
    if (!partes) {
      // Notação fora do padrão `NdM ... [Tipo]` (ex.: "1D3~1D6+Corpo", "— (fumaça)"): devolve o dano base.
      return { dano: base, informacao: itemCatalogo.informacao };
    }
    let quantidade = parseInt(partes[1], 10);
    let faces = parseInt(partes[2], 10);
    const modificadorAtributo = partes[3].trim();
    const tipo = partes[4];
    const extras: DadoExtra[] = [];
    let fixo = 0;

    if (item.categoria === ItemCategoriaEnum.CORPO_A_CORPO) {
      const facesBase = faces;
      // Pesada: os 3 empilhamentos iniciais valem 1 degrau; cada extra sobe mais 1 (limite D10).
      if (empilhamentosDe('Pesada') > 0) {
        faces = elevarDado({ faces, passos: 1 + Math.max(0, empilhamentosDe('Pesada') - 3), limite: 10 });
      }
      // Reforçada soma dados do tipo BASE da arma (não do dado já elevado pela Pesada).
      if (empilhamentosDe('Reforçada') > 0) {
        if (faces === facesBase) {
          quantidade += empilhamentosDe('Reforçada');
        } else {
          extras.push({ quantidade: empilhamentosDe('Reforçada'), faces: facesBase, tipo });
        }
      }
      if (empilhamentosDe('Letal') > 0) fixo += empilhamentosDe('Letal') * 2;
      if (empilhamentosDe('Explosiva') > 0) extras.push({ quantidade: empilhamentosDe('Explosiva'), faces: 4, tipo: 'Explosão' });
      if (empilhamentosDe('Fervente') > 0) extras.push({ quantidade: empilhamentosDe('Fervente'), faces: 4, tipo: 'Químico' });
      if (empilhamentosDe('Plasma') > 0) extras.push({ quantidade: empilhamentosDe('Plasma'), faces: 6, tipo: 'Químico' });
    } else if (item.categoria === ItemCategoriaEnum.ARMAS_DE_FOGO) {
      if (empilhamentosDe('Potência') > 0) fixo += empilhamentosDe('Potência') * 2;
      if (empilhamentosDe('Explosiva') > 0) extras.push({ quantidade: empilhamentosDe('Explosiva'), faces: 6, tipo: 'Explosão' });
      if (empilhamentosDe('Plasma') > 0) extras.push({ quantidade: empilhamentosDe('Plasma'), faces: 8, tipo: 'Químico' });
    } else if (item.categoria === ItemCategoriaEnum.EXOTICOS) {
      if (empilhamentosDe('Vibrante') > 0) extras.push({ quantidade: empilhamentosDe('Vibrante'), faces: 8, tipo: 'Físico' });
      if (empilhamentosDe('Flamejante') > 0) extras.push({ quantidade: empilhamentosDe('Flamejante'), faces: 8, tipo: 'Químico' });
      if (empilhamentosDe('Antimatéria') > 0) extras.push({ quantidade: empilhamentosDe('Antimatéria'), faces, tipo: 'Explosão' });
    } else if (item.categoria === ItemCategoriaEnum.EXPLOSIVOS) {
      if (empilhamentosDe('Potente') > 0) quantidade += empilhamentosDe('Potente') * 2;
    }

    // Efeito mecânico das modificações CUSTOM (independe da categoria): dano fixo e dados extras,
    // escalando com os empilhamentos. Faz uma mod inventada "funcionar de verdade" no dano.
    item.modificacoes.forEach((modificacao) => {
      const efeito = modificacao.efeito;
      if (!efeito) {
        return;
      }
      if (efeito.danoFixo) {
        fixo += efeito.danoFixo * modificacao.empilhamentos;
      }
      if (efeito.danoDados && efeito.danoDados.quantidade > 0 && efeito.danoDados.faces > 0) {
        extras.push({
          quantidade: efeito.danoDados.quantidade * modificacao.empilhamentos,
          faces: efeito.danoDados.faces,
          tipo: efeito.danoDados.tipo || tipo,
        });
      }
    });

    // Agrupa os dados por tipo de dano: o grupo do tipo base carrega o modificador de atributo e o fixo.
    const grupos: GrupoDano[] = [];
    const obterGrupo = (tipoDano: string): GrupoDano => {
      let grupo = grupos.find((atual) => atual.tipo === tipoDano);
      if (!grupo) {
        grupo = { tipo: tipoDano, dados: [] };
        grupos.push(grupo);
      }
      return grupo;
    };
    obterGrupo(tipo).dados.push(`${quantidade}D${faces}`);
    extras.forEach((extra) => obterGrupo(extra.tipo).dados.push(`${extra.quantidade}D${extra.faces}`));

    const fixoTexto = fixo > 0 ? `+${fixo}` : '';
    const notacao = grupos
      .map((grupo) => `${grupo.dados.join('+')}${grupo.tipo === tipo ? modificadorAtributo + fixoTexto : ''} [${grupo.tipo}]`)
      .join(' + ');

    let informacao = itemCatalogo.informacao ?? '';
    if (item.categoria === ItemCategoriaEnum.ARMAS_DE_FOGO && empilhamentosDe('Plasma') > 0) {
      informacao = informacao.replace(/Mun:[^·\n]+/, 'Mun: Células de Plasma');
    }
    return { dano: notacao, informacao: informacao || undefined };
  }

  // ── RESISTÊNCIA ─────────────────────────────────────────────────────────────
  if (itemCatalogo.resistencia) {
    const entradas = itemCatalogo.resistencia
      .split(',')
      .map((parte) => {
        const casada = parte.trim().match(/^(\d+)\s*\[([^\]]+)\]$/);
        return casada ? { valor: parseInt(casada[1], 10), tipos: casada[2] } : null;
      })
      .filter((entrada): entrada is { valor: number; tipos: string } => entrada !== null);

    const obterOuAdicionar = (tipo: string): { valor: number; tipos: string } => {
      let entrada = entradas.find((atual) => atual.tipos === tipo || atual.tipos.includes(tipo));
      if (!entrada) {
        entrada = { valor: 0, tipos: tipo };
        entradas.push(entrada);
      }
      return entrada;
    };

    if (item.categoria === ItemCategoriaEnum.PROTECOES && entradas.length > 0) {
      if (empilhamentosDe('Blindada') > 0) entradas.forEach((entrada) => (entrada.valor += empilhamentosDe('Blindada') * 2));
      if (empilhamentosDe('Reforçada') > 0) entradas.forEach((entrada) => (entrada.valor += empilhamentosDe('Reforçada')));
      if (empilhamentosDe('Camuflada') > 0) entradas.forEach((entrada) => (entrada.valor = Math.max(0, entrada.valor - empilhamentosDe('Camuflada'))));
      if (empilhamentosDe('Hazmat') > 0) obterOuAdicionar('Químico').valor += empilhamentosDe('Hazmat') * 2;
      if (empilhamentosDe('Antibombas') > 0) obterOuAdicionar('Explosão').valor += empilhamentosDe('Antibombas') * 2;
    }
    if (item.categoria === ItemCategoriaEnum.ARMAZENAMENTO) {
      if (empilhamentosDe('Camadas Extras') > 0) {
        obterOuAdicionar('Físico').valor += empilhamentosDe('Camadas Extras');
        obterOuAdicionar('Balístico').valor += empilhamentosDe('Camadas Extras');
      }
    }

    // Efeito mecânico das modificações CUSTOM: soma a resistência informada a todos os tipos.
    const resistCustom = item.modificacoes.reduce(
      (soma, modificacao) => soma + (modificacao.efeito?.resistencia ?? 0) * modificacao.empilhamentos,
      0,
    );
    if (resistCustom !== 0 && entradas.length > 0) {
      entradas.forEach((entrada) => (entrada.valor = Math.max(0, entrada.valor + resistCustom)));
    }

    const notacao = entradas
      .filter((entrada) => entrada.valor > 0)
      .map((entrada) => `${entrada.valor} [${entrada.tipos}]`)
      .join(', ');
    return notacao ? { resistencia: notacao } : null;
  }

  // ── ARMAZENAMENTO ───────────────────────────────────────────────────────────
  if (itemCatalogo.bonus) {
    let slots = interpretarBonusArmazenamento({ texto: itemCatalogo.bonus });
    if (empilhamentosDe('Compartimentos Extras') > 0) {
      slots += empilhamentosDe('Compartimentos Extras');
    }
    return { bonusArmazenamento: slots };
  }

  return null;
}

/**
 * Custo total de um amplificador conforme seus empilhamentos: o 1º custa
 * `CUSTO_PRIMEIRO_AMPLIFICADOR` ($ 3000) e cada empilhamento além dele custa
 * `CUSTO_EMPILHAMENTO_AMPLIFICADOR` ($ 1000).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Amplificadores".
 */
export function calcularCustoAmplificador(dto: CustoAmplificadorCalcularDto): number {
  return CUSTO_PRIMEIRO_AMPLIFICADOR + Math.max(0, dto.empilhamentos - 1) * CUSTO_EMPILHAMENTO_AMPLIFICADOR;
}

/**
 * Totais brutos do carrinho: gasto (itens + modificações + amplificadores), peso
 * ocupado, empilhamentos de amplificador somados e bônus de inventário dos
 * armazenamentos vestidos. Um armazenamento vestido (`guardada = false`) amplia o
 * inventário e não pesa; guardado (`guardada = true`) pesa e não amplia. Espelha
 * `getCmpTotals` do site antigo.
 */
export function calcularTotaisCarrinho(dto: TotaisCarrinhoCalcularDto): TotaisCarrinhoDto {
  let gasto = 0;
  let pesoUsado = 0;
  let bonusInventario = 0;

  dto.itens.forEach((item) => {
    const quantidade = item.quantidade;
    gasto += item.custo * quantidade;
    const ehArmazenamento = item.categoria === ItemCategoriaEnum.ARMAZENAMENTO;
    const ocupaPeso = !ehArmazenamento || item.guardada;

    if (ocupaPeso) {
      pesoUsado += item.peso * quantidade;
    }
    if (ehArmazenamento && !item.guardada) {
      // Custom (fora do catálogo) usa o bônus embutido no próprio item — o armazenamento inventado
      // amplia o inventário de verdade, como um do catálogo.
      const itemCatalogo = resolverDadosItem(item);
      bonusInventario += interpretarBonusArmazenamento({ texto: itemCatalogo?.bonus }) * quantidade;
    }

    item.modificacoes.forEach((modificacao) => {
      gasto +=
        contarComprasModificacao({ item, modificacao: modificacao.nome, empilhamentos: modificacao.empilhamentos }) *
        obterCustoModificacao({ item, modificacao: modificacao.nome }) *
        quantidade;
      if (ocupaPeso) {
        pesoUsado += modificacao.empilhamentos * obterPesoModificacao({ item, modificacao: modificacao.nome }) * quantidade;
      }
      if (ehArmazenamento && !item.guardada) {
        if (modificacao.nome === 'Compartimentos Extras') {
          bonusInventario += modificacao.empilhamentos * quantidade;
        } else if (modificacao.nome === 'Camadas Extras') {
          bonusInventario += modificacao.empilhamentos * 0.5 * quantidade;
        }
      }
    });
  });

  let empilhamentosAmplificador = 0;
  dto.amplificadores.forEach((amplificador) => {
    gasto += calcularCustoAmplificador({ empilhamentos: amplificador.empilhamentos });
    empilhamentosAmplificador += amplificador.empilhamentos;
  });

  return { gasto, pesoUsado, empilhamentosAmplificador, bonusInventario };
}

/**
 * Recorte da aba compras a partir do carrinho e dos recursos do agente: patente
 * e seus limites de modificação, gasto e dinheiro restante, peso versus
 * inventário efetivo (base + armazenamentos vestidos), empilhamentos de
 * amplificador versus limite (Vontade × 3) e penalidade de Vontade acumulada
 * (−2 por empilhamento além do 1º de cada amplificador). Espelha
 * `renderCmpSummary` do site antigo.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Amplificadores" (limite Vontade × 3;
 * penalidade de −2 em Vontade por empilhamento além do primeiro).
 */
export function calcularResumoCompras(dto: ResumoComprasCalcularDto): ResumoComprasDto {
  const totais = calcularTotaisCarrinho({ itens: dto.itens, amplificadores: dto.amplificadores });
  const limiteModificacoes = obterLimiteModificacoes({ prestigio: dto.prestigio });
  const penalidadeVontade = dto.amplificadores.reduce(
    (acumulado, amplificador) => acumulado + Math.max(0, amplificador.empilhamentos - 1) * PENALIDADE_VONTADE_POR_EMPILHAMENTO,
    0,
  );

  return {
    patente: limiteModificacoes.patente,
    limiteModificacoes,
    gasto: totais.gasto,
    dinheiroRestante: dto.dinheiro - totais.gasto,
    pesoUsado: totais.pesoUsado,
    inventarioEfetivo: dto.inventario + totais.bonusInventario,
    bonusInventario: totais.bonusInventario,
    empilhamentosAmplificador: totais.empilhamentosAmplificador,
    limiteAmplificadores: dto.vontade * MULTIPLICADOR_LIMITE_AMPLIFICADOR,
    penalidadeVontade,
  };
}
