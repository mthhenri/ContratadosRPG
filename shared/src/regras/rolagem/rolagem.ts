import {
  ABREVIACOES_ATRIBUTO,
  QUANTIDADE_DADOS_MAXIMA,
  abreviacaoAtributo,
  resolverTipoDanoSimples,
} from './rolagem.dados';
import {
  AtributoAplicadoDto,
  DadosRoladosDto,
  FormulaInterpretadaDto,
  GrupoDanoDto,
  InterpretacaoFormulaDto,
  ParTipoDano,
  ResultadoRolagemDto,
  ResultadoTesteDto,
  RolagemDto,
  RolagemEfeitoDto,
  TermoAtributoDto,
  TermoConstanteDto,
  TermoDadoDto,
} from './rolagem.dtos';
import { RolagemEfeitoAlvoEnum, RolagemEfeitoTipoEnum, RolagemModoEnum, TipoDanoEnum } from '../../enums';
import { elevarDado } from '../descanso';
import type { FichaAtributosDto } from '../../dtos/ficha';

/**
 * Motor de rolagem de dados (m3-15; gramática v2 m3-16; dano tipado m3-18; modo TESTE m3-19; efeitos
 * de habilidade m3-20): interpreta e rola uma fórmula — `NdM`, constantes, atributo (`+LUT`), atributo
 * como **fonte de dados** (`FORd6`), atributo **escalado** (`FOR*3`, `LUT/2`, piso), combinados por
 * `+`/`−`, com **tags de tipo de dano** `[Tipo]`/`[TipoA-TipoB]` (Composto = soma 50/50, resto pro
 * primeiro). No modo `TESTE`, rola o pool e **pega o maior** + Proficiência (atributo puro = pool
 * `(Atr)`D20). `aplicarEfeitos` funde efeitos de habilidade (ex.: Força Bruta = FOR×3) numa fórmula
 * interpretada; `rolarInterpretada` rola essa fórmula. Parênteses ainda não são suportados. Funções
 * puras; a **única brecha a `Math.random`** é a função de rolagem injetável `rolarDado` (SYSTEM.SPEC §6.6).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Atributos"/"Testes"/"Tipos de Dano".
 */

/** Função que rola um dado de `faces` faces e devolve 1..faces. Injetável para testes determinísticos. */
export type RolarDado = (faces: number) => number;

/** Rolagem real do navegador — a brecha sancionada a `Math.random` (§6.6). */
export const rolarDadoPadrao: RolarDado = (faces) => Math.floor(Math.random() * faces) + 1;

/** Resolve uma referência de atributo (abreviação `LUT` ou nome `luta`) na chave da ficha, ou `null`. */
function resolverAtributo(texto: string): keyof FichaAtributosDto | null {
  const abreviado = ABREVIACOES_ATRIBUTO[texto.toUpperCase()];
  if (abreviado) {
    return abreviado;
  }
  const nome = texto.toLowerCase();
  const chaves = Object.values(ABREVIACOES_ATRIBUTO);
  return chaves.find((chave) => chave === nome) ?? null;
}

/** Tipo de dano estampado nos termos de um segmento: single (`tipoDano`), Composto ou nenhum. */
type DestinoDano = { readonly tipoDano?: TipoDanoEnum; readonly composto?: ParTipoDano };

/**
 * Resolve uma tag `[Tipo]` (single) ou `[TipoA-TipoB]` (Composto). Composto exige **dois tipos
 * bloqueáveis distintos** (Geral, irredutível, fica de fora). `null` se desconhecida/inválida.
 */
function resolverTipoDano(tag: string): DestinoDano | null {
  const partes = tag.split('-');
  if (partes.length === 1) {
    const tipo = resolverTipoDanoSimples(partes[0]);
    return tipo ? { tipoDano: tipo } : null;
  }
  if (partes.length === 2) {
    const a = resolverTipoDanoSimples(partes[0]);
    const b = resolverTipoDanoSimples(partes[1]);
    if (!a || !b || a === b || a === TipoDanoEnum.GERAL || b === TipoDanoEnum.GERAL) {
      return null;
    }
    return { composto: [a, b] };
  }
  return null;
}

/** Acumuladores mutáveis preenchidos por `interpretarSegmento`. */
interface AcumuladoresFormula {
  readonly dados: TermoDadoDto[];
  readonly atributos: TermoAtributoDto[];
  readonly constantesTipadas: TermoConstanteDto[];
}

/**
 * Interpreta um segmento (expressão aritmética `+`/`−`) estampando cada termo com o `destino`
 * (tipo de dano). Devolve a soma das constantes **sem tag** e, em erro, a mensagem. Nunca lança.
 */
function interpretarSegmento(
  expr: string,
  destino: DestinoDano,
  acc: AcumuladoresFormula,
  modo: RolagemModoEnum | undefined,
): { readonly constante: number; readonly erro?: string } {
  const tipado = destino.tipoDano !== undefined || destino.composto !== undefined;
  const normalizada = /^[+-]/.test(expr) ? expr : `+${expr}`;
  const partes = normalizada.match(/[+-][^+-]*/g) ?? [];
  let constante = 0;

  for (const parte of partes) {
    const sinal: 1 | -1 = parte[0] === '-' ? -1 : 1;
    const corpo = parte.slice(1);
    if (!corpo) {
      return { constante, erro: `Termo vazio em "${parte}".` };
    }
    if (/[[\]]/.test(corpo)) {
      return { constante, erro: `Tag de dano malformada em "${corpo}".` };
    }

    // Dado literal `NdM` (N opcional).
    const dado = corpo.match(/^(\d*)[dD](\d+)$/);
    if (dado) {
      const quantidade = dado[1] === '' ? 1 : parseInt(dado[1], 10);
      const faces = parseInt(dado[2], 10);
      if (quantidade < 1 || faces < 1) {
        return { constante, erro: `Dado inválido "${corpo}".` };
      }
      if (quantidade > QUANTIDADE_DADOS_MAXIMA) {
        return { constante, erro: `Máximo de ${QUANTIDADE_DADOS_MAXIMA} dados por termo.` };
      }
      acc.dados.push({ sinal, quantidade, faces, ...destino });
      continue;
    }

    // Atributo como fonte de dados `ATRdM` (ex.: `FORd6`, `lutad20`).
    const dadoAtributo = corpo.match(/^([A-Za-z]+)[dD](\d+)$/);
    if (dadoAtributo) {
      const atributoDado = resolverAtributo(dadoAtributo[1]);
      const faces = parseInt(dadoAtributo[2], 10);
      if (atributoDado) {
        if (faces < 1) {
          return { constante, erro: `Dado inválido "${corpo}".` };
        }
        acc.dados.push({ sinal, quantidade: 1, quantidadeAtributo: atributoDado, faces, ...destino });
        continue;
      }
    }

    // Atributo escalado `ATR*N` / `ATR/N` (ex.: `FOR*3`, `LUT/2`).
    const escalado = corpo.match(/^([A-Za-z]+)([*/])(\d+)$/);
    if (escalado) {
      const atributoEscalado = resolverAtributo(escalado[1]);
      const fator = parseInt(escalado[3], 10);
      if (atributoEscalado) {
        const rotulo = corpo.toUpperCase();
        if (escalado[2] === '/') {
          if (fator < 1) {
            return { constante, erro: `Divisor inválido em "${corpo}".` };
          }
          acc.atributos.push({ sinal, atributo: atributoEscalado, rotulo, divisor: fator, ...destino });
        } else {
          acc.atributos.push({ sinal, atributo: atributoEscalado, rotulo, multiplicador: fator, ...destino });
        }
        continue;
      }
    }

    // Constante inteira (tipada vai para `constantesTipadas`; sem tag soma em `constante`).
    if (/^\d+$/.test(corpo)) {
      const valor = parseInt(corpo, 10);
      if (tipado) {
        acc.constantesTipadas.push({ sinal, valor, ...destino });
      } else {
        constante += sinal * valor;
      }
      continue;
    }

    // Atributo modificador (`+LUT`, `-forca`) — no modo TESTE vira o pool `(Atributo)`D20 (açúcar).
    const atributo = resolverAtributo(corpo);
    if (atributo) {
      if (modo === RolagemModoEnum.TESTE) {
        acc.dados.push({ sinal, quantidade: 1, quantidadeAtributo: atributo, faces: 20, ...destino });
      } else {
        acc.atributos.push({ sinal, atributo, rotulo: corpo.toUpperCase(), ...destino });
      }
      continue;
    }
    return { constante, erro: `Termo desconhecido "${corpo}".` };
  }
  return { constante };
}

/**
 * Interpreta a fórmula em termos de dado, atributo e constante, com tags de tipo de dano opcionais.
 * Aceita espaços; o 1º termo de cada segmento pode vir sem sinal (assume `+`). Sem tags, comporta-se
 * como antes (um único total). Com tags, cada segmento (`termos [Tipo]`) estampa seus termos; um
 * trecho sem tag numa fórmula tipada assume **Físico**. Devolve `{ valida: false, erro }` para fórmula
 * vazia, parênteses, tag/termo inválido ou dado acima do teto — nunca lança (a UI trata como aviso).
 * No modo `TESTE`, um atributo puro é o pool `(Atributo)`D20 (açúcar `luta` = `lutad20`).
 */
export function interpretarFormula(formulaTexto: string, modo?: RolagemModoEnum): InterpretacaoFormulaDto {
  const texto = (formulaTexto ?? '').replace(/\s+/g, '');
  if (!texto) {
    return { valida: false, erro: 'Fórmula vazia.' };
  }
  if (/[()]/.test(texto)) {
    return { valida: false, erro: 'Parênteses ainda não são suportados.' };
  }

  const acc: AcumuladoresFormula = { dados: [], atributos: [], constantesTipadas: [] };
  let constante = 0;

  if (!texto.includes('[')) {
    const { constante: parcial, erro } = interpretarSegmento(texto, {}, acc, modo);
    if (erro) {
      return { valida: false, erro };
    }
    constante = parcial;
  } else {
    // Divide por tag: `split` com grupo de captura intercala [expr, tag, expr, tag, …, exprFinal].
    const partes = texto.split(/\[([^\]]+)\]/);
    for (let i = 0; i < partes.length; i += 2) {
      const expr = partes[i];
      const tag = partes[i + 1];
      if (!expr) {
        if (tag !== undefined) {
          return { valida: false, erro: `Tag "[${tag}]" sem termos antes.` };
        }
        continue;
      }
      let destino: DestinoDano;
      if (tag === undefined) {
        destino = { tipoDano: TipoDanoEnum.FISICO };
      } else {
        const resolvido = resolverTipoDano(tag);
        if (!resolvido) {
          return { valida: false, erro: `Tipo de dano desconhecido: "${tag}".` };
        }
        destino = resolvido;
      }
      const { erro } = interpretarSegmento(expr, destino, acc, modo);
      if (erro) {
        return { valida: false, erro };
      }
    }
  }

  const vazio =
    acc.dados.length === 0 &&
    acc.atributos.length === 0 &&
    acc.constantesTipadas.length === 0 &&
    constante === 0;
  if (vazio) {
    return { valida: false, erro: 'A fórmula não soma nada.' };
  }

  const formula: FormulaInterpretadaDto =
    acc.constantesTipadas.length > 0
      ? { dados: acc.dados, atributos: acc.atributos, constante, constantesTipadas: acc.constantesTipadas }
      : { dados: acc.dados, atributos: acc.atributos, constante };
  return { valida: true, formula };
}

/** `true` se a fórmula é interpretável. Espelha `interpretarFormula(...).valida`. */
export function validarFormula(formulaTexto: string, modo?: RolagemModoEnum): boolean {
  return interpretarFormula(formulaTexto, modo).valida;
}

/** Uma contribuição de valor já rolado/aplicado, com seu destino de tipo de dano (ou nenhum). */
type Contribuicao = { readonly valor: number; readonly tipoDano?: TipoDanoEnum; readonly composto?: ParTipoDano };

/**
 * Agrega as contribuições **tipadas** por tipo de dano. Cada Composto tem a **soma do segmento**
 * dividida 50/50 (resto pro primeiro) só depois de somada. Devolve `[]` quando não há nada tipado.
 */
function agruparDano(contribuicoes: readonly Contribuicao[]): GrupoDanoDto[] {
  const tipadas = contribuicoes.filter((c) => c.tipoDano !== undefined || c.composto !== undefined);
  if (tipadas.length === 0) {
    return [];
  }
  const mapa = new Map<TipoDanoEnum, { total: number; composto: boolean }>();
  const somar = (tipo: TipoDanoEnum, valor: number, composto: boolean): void => {
    const atual = mapa.get(tipo) ?? { total: 0, composto: false };
    mapa.set(tipo, { total: atual.total + valor, composto: atual.composto || composto });
  };

  const buckets = new Map<string, { par: ParTipoDano; total: number }>();
  for (const contribuicao of tipadas) {
    if (contribuicao.composto) {
      const chave = contribuicao.composto.join('|');
      const atual = buckets.get(chave) ?? { par: contribuicao.composto, total: 0 };
      buckets.set(chave, { par: atual.par, total: atual.total + contribuicao.valor });
    } else if (contribuicao.tipoDano) {
      somar(contribuicao.tipoDano, contribuicao.valor, false);
    }
  }
  for (const { par, total } of buckets.values()) {
    const secundario = Math.floor(total / 2);
    somar(par[0], total - secundario, true); // resto pro primeiro
    somar(par[1], secundario, true);
  }

  return [...mapa.entries()].map(([tipoDano, valor]) =>
    valor.composto ? { tipoDano, total: valor.total, composto: true } : { tipoDano, total: valor.total },
  );
}

/**
 * Monta o resultado de um roll no modo `TESTE`: junta todos os dados num pool, **pega o maior**, e
 * soma **Proficiência** + os bônus planos (atributos-modificador e constantes). O tipo de dano é
 * ignorado num teste. Pool vazio (atributo ≤ 0) → maior 0.
 */
function montarResultadoTeste(
  dados: readonly DadosRoladosDto[],
  atributos: readonly AtributoAplicadoDto[],
  formula: FormulaInterpretadaDto,
  proficienciaEntrada: number | null | undefined,
): ResultadoRolagemDto {
  const pool = dados.flatMap((termo) => [...termo.valores]);
  const maiorDado = pool.length > 0 ? Math.max(...pool) : 0;
  const indiceMaior = pool.indexOf(maiorDado);
  const descartados = pool.filter((_, indice) => indice !== indiceMaior);

  const proficiencia = proficienciaEntrada ?? 0;
  const bonusAtributos = atributos.reduce((acumulado, atributo) => acumulado + atributo.valor, 0);
  const bonusConstantes =
    formula.constante +
    (formula.constantesTipadas ?? []).reduce((acumulado, termo) => acumulado + termo.sinal * termo.valor, 0);
  const bonusPlano = bonusAtributos + bonusConstantes;
  const total = maiorDado + proficiencia + bonusPlano;

  const teste: ResultadoTesteDto = { pool, maiorDado, descartados, proficiencia, bonusPlano, total };
  return { dados, atributos, constante: formula.constante, teste, total };
}

/**
 * Rola a fórmula com os atributos da ficha: rola cada termo de dado (via `rolarDado`), aplica os
 * atributos (com escalonamento) e a constante. No modo `TESTE` pega o maior dado + Proficiência; no
 * modo `SOMA` soma e agrupa por tipo de dano quando há tags. Devolve o detalhamento + `grupos`/`teste`
 * + o total. Fórmula inválida devolve `null` (a UI valida antes). Determinístico quando `rolarDado` é injetado.
 */
export function rolarFormula(dto: RolagemDto, rolarDado: RolarDado = rolarDadoPadrao): ResultadoRolagemDto | null {
  const interpretacao = interpretarFormula(dto.formula, dto.modo);
  if (!interpretacao.valida || !interpretacao.formula) {
    return null;
  }
  return rolarInterpretada(interpretacao.formula, dto.atributos, dto.modo, dto.proficiencia, rolarDado);
}

/**
 * Rola uma fórmula **já interpretada** (com efeitos de habilidade opcionalmente já fundidos via
 * `aplicarEfeitos`) — mesma semântica de `rolarFormula`, sem reinterpretar o texto. Usado pelo runner
 * de presets encadeados (m3-21). Determinístico quando `rolarDado` é injetado.
 */
export function rolarInterpretada(
  formula: FormulaInterpretadaDto,
  atributos: FichaAtributosDto,
  modo?: RolagemModoEnum,
  proficiencia?: number | null,
  rolarDado: RolarDado = rolarDadoPadrao,
): ResultadoRolagemDto {
  const dados: DadosRoladosDto[] = formula.dados.map((termo) => {
    const quantidade = termo.quantidadeAtributo
      ? Math.max(0, Math.min(QUANTIDADE_DADOS_MAXIMA, atributos[termo.quantidadeAtributo] ?? 0))
      : termo.quantidade;
    const valores = Array.from({ length: quantidade }, () => rolarDado(termo.faces));
    const soma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
    return {
      sinal: termo.sinal,
      faces: termo.faces,
      valores,
      subtotal: termo.sinal * soma,
      ...(termo.composto ? { composto: termo.composto } : termo.tipoDano ? { tipoDano: termo.tipoDano } : {}),
    };
  });

  const atributosAplicados: AtributoAplicadoDto[] = formula.atributos.map((termo) => {
    const base = atributos[termo.atributo] ?? 0;
    const escalado = Math.floor((base * (termo.multiplicador ?? 1)) / (termo.divisor ?? 1));
    return {
      rotulo: termo.rotulo,
      valor: termo.sinal * escalado,
      ...(termo.composto ? { composto: termo.composto } : termo.tipoDano ? { tipoDano: termo.tipoDano } : {}),
    };
  });

  if (modo === RolagemModoEnum.TESTE) {
    return montarResultadoTeste(dados, atributosAplicados, formula, proficiencia);
  }

  const contribuicoes: Contribuicao[] = [
    ...dados.map((termo) => ({ valor: termo.subtotal, tipoDano: termo.tipoDano, composto: termo.composto })),
    ...atributosAplicados.map((termo) => ({ valor: termo.valor, tipoDano: termo.tipoDano, composto: termo.composto })),
    ...(formula.constantesTipadas ?? []).map((termo) => ({
      valor: termo.sinal * termo.valor,
      tipoDano: termo.tipoDano,
      composto: termo.composto,
    })),
  ];

  const grupos = agruparDano(contribuicoes);
  const totalSemTipo = contribuicoes
    .filter((contribuicao) => contribuicao.tipoDano === undefined && contribuicao.composto === undefined)
    .reduce((acumulado, contribuicao) => acumulado + contribuicao.valor, 0);
  const total = grupos.reduce((acumulado, grupo) => acumulado + grupo.total, 0) + totalSemTipo + formula.constante;

  return grupos.length > 0
    ? { dados, atributos: atributosAplicados, constante: formula.constante, grupos, total }
    : { dados, atributos: atributosAplicados, constante: formula.constante, total };
}

/** Alvo padrão de um efeito quando não declarado: bônus de teste vai no teste, o resto no dano. */
function alvoPadrao(tipo: RolagemEfeitoTipoEnum): RolagemEfeitoAlvoEnum {
  return tipo === RolagemEfeitoTipoEnum.BONUS_TESTE ? RolagemEfeitoAlvoEnum.TESTE : RolagemEfeitoAlvoEnum.DANO;
}

/**
 * Funde os `efeitos` de habilidade (m3-20) numa fórmula já interpretada, respeitando o `modo` do
 * passo: só aplica os efeitos cujo `alvo` (declarado ou inferido) casa com o modo — bônus de teste
 * no `TESTE`, efeitos de dano no `SOMA`. Puro; devolve uma **nova** fórmula (não muta a original).
 */
export function aplicarEfeitos(
  formula: FormulaInterpretadaDto,
  efeitos: readonly RolagemEfeitoDto[],
  modo?: RolagemModoEnum,
): FormulaInterpretadaDto {
  const noTeste = modo === RolagemModoEnum.TESTE;
  let dados: TermoDadoDto[] = [...formula.dados];
  const atributos: TermoAtributoDto[] = [...formula.atributos];
  const constantesTipadas: TermoConstanteDto[] = [...(formula.constantesTipadas ?? [])];
  let constante = formula.constante;

  for (const efeito of efeitos) {
    const alvo = efeito.alvo ?? alvoPadrao(efeito.tipo);
    if ((alvo === RolagemEfeitoAlvoEnum.TESTE) !== noTeste) {
      continue; // efeito não pertence a este passo
    }
    const tipoDano = efeito.tipoDano ?? TipoDanoEnum.FISICO;

    switch (efeito.tipo) {
      case RolagemEfeitoTipoEnum.DANO_FIXO:
        if (noTeste) {
          constante += efeito.valor ?? 0;
        } else {
          constantesTipadas.push({ sinal: 1, valor: efeito.valor ?? 0, tipoDano });
        }
        break;
      case RolagemEfeitoTipoEnum.DANO_DADOS:
        dados = [
          ...dados,
          { sinal: 1, quantidade: efeito.valor ?? 1, faces: efeito.faces ?? 6, ...(noTeste ? {} : { tipoDano }) },
        ];
        break;
      case RolagemEfeitoTipoEnum.DANO_ATRIBUTO:
        if (efeito.atributo) {
          const multiplicador = efeito.multiplicador ?? 1;
          const abreviacao = abreviacaoAtributo(efeito.atributo);
          const rotulo = multiplicador === 1 ? abreviacao : `${abreviacao}*${multiplicador}`;
          atributos.push({
            sinal: 1,
            atributo: efeito.atributo,
            rotulo,
            ...(multiplicador !== 1 ? { multiplicador } : {}),
            ...(noTeste ? {} : { tipoDano }),
          });
        }
        break;
      case RolagemEfeitoTipoEnum.BONUS_TESTE:
        if (efeito.variante === 'FIXO') {
          constante += efeito.valor ?? 0;
        } else {
          dados = [...dados, { sinal: 1, quantidade: efeito.valor ?? 1, faces: 20 }];
        }
        break;
      case RolagemEfeitoTipoEnum.ELEVAR_DADO:
        dados = dados.map((termo) => ({ ...termo, faces: elevarDado({ faces: termo.faces, passos: efeito.valor ?? 1 }) }));
        break;
    }
  }

  return constantesTipadas.length > 0
    ? { dados, atributos, constante, constantesTipadas }
    : { dados, atributos, constante };
}
