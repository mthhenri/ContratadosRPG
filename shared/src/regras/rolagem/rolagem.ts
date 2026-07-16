import {
  ABREVIACOES_ATRIBUTO,
  ABREVIACOES_FONTE_EXTRA,
  QUANTIDADE_DADOS_MAXIMA,
  resolverTipoDanoSimples,
} from './rolagem.dados';
import {
  AtributoAplicadoDto,
  DadosRoladosDto,
  FonteEscalar,
  FormulaInterpretadaDto,
  GrupoDanoDto,
  InterpretacaoFormulaDto,
  ParTipoDano,
  PassoInterpretadoDto,
  PlanoPresetDto,
  PresetResolverDto,
  ResultadoRolagemDto,
  RolagemDto,
  TermoAtributoDto,
  TermoConstanteDto,
  TermoDadoDto,
} from './rolagem.dtos';
import { TipoDanoEnum } from '../../enums';
import type { FichaAtributosDto, FichaHabilidadeDto, FichaRolagemDto, FichaRolagemPassoDto } from '../../dtos/ficha';

/**
 * Motor de rolagem de dados (m3-15; gramática v2 m3-16; dano tipado m3-18; **gramática v3 m3-29**;
 * crítico mecânico m3-30): interpreta e rola uma fórmula — `NdM`, constantes, atributo (`+LUT`), atributo
 * como **fonte de dados** (`FORd6`), atributo **escalado** (`FOR*3`, `LUT/2`, piso), combinados por
 * `+`/`−`, com **tags de tipo de dano** `[Tipo]`/`[TipoA-TipoB]` (Composto = soma 50/50, resto pro
 * primeiro), e **operadores por pool**: manter maior/menor (`kh`/`kl`), margem de crítico (`cm`,
 * informativo), explosão (`!`) e implosão (`?`).
 *
 * **Não há mais "modo".** Um teste é a expressão explícita `LUTd20kh1 + PROF` — a Proficiência é um termo
 * escrito, nunca somada por baixo dos panos. A **desvantagem** de atributo zerado (regra 270) sobrevive
 * como propriedade **intrínseca** de um pool de atributo (`ATRd20kh…` com atributo ≤ 0 → rola 2+|attr|
 * dados e mantém o menor). As habilidades vinculadas a um passo **só contam Energia** — não alteram mais a
 * fórmula (fusão de efeitos aposentada em m3-31). `normalizarPresetLegado` migra presets antigos
 * (`modo:'TESTE'`) para a notação nova. Parênteses ainda não são suportados. Funções puras; a **única
 * brecha a `Math.random`** é a função de rolagem injetável `rolarDado` (SYSTEM.SPEC §6.6).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Atributos"/"Testes"/"Tipos de Dano". Explosão/implosão não são
 * regra do documento — entram como operadores de ferramenta (m3-29).
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

/**
 * Resolve uma **fonte escalar** (m3-22): um atributo (`LUT`), a Proficiência (`PROF`) ou o Nível
 * (`NIV`), ou `null`. O valor é lido do ambiente da rolagem em `rolarInterpretada`.
 */
function resolverFonte(texto: string): FonteEscalar | null {
  const atributo = resolverAtributo(texto);
  if (atributo) {
    return atributo;
  }
  return ABREVIACOES_FONTE_EXTRA[texto.toUpperCase()] ?? null;
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

/** Operadores por pool extraídos do sufixo de um termo de dado (m3-29). */
interface OperadoresDado {
  manterMaior?: number;
  manterMenor?: number;
  margemCritico?: number;
  explosao?: number;
  implosao?: number;
}

/**
 * Tokeniza o sufixo de operadores de um termo de dado (`kh`/`kl`/`cm`/`!`/`?`), consumindo um operador
 * por vez da frente. `faces` resolve o limiar padrão de explosão (bare `!` = máximo). Nunca lança —
 * devolve os operadores e, em erro (conflito, repetição, valor inválido, sufixo desconhecido), a mensagem.
 */
function interpretarOperadores(sufixo: string, faces: number): { ops: OperadoresDado; erro?: string } {
  const ops: OperadoresDado = {};
  let resto = sufixo;
  while (resto.length > 0) {
    const keep = resto.match(/^k([hl])(\d*)/i);
    if (keep) {
      const maior = keep[1].toLowerCase() === 'h';
      const chave = maior ? 'manterMaior' : 'manterMenor';
      const oposto = maior ? 'manterMenor' : 'manterMaior';
      if (ops[chave] !== undefined) {
        return { ops, erro: `Operador repetido "k${keep[1]}".` };
      }
      if (ops[oposto] !== undefined) {
        return { ops, erro: 'Não combine kh e kl no mesmo termo.' };
      }
      const n = keep[2] === '' ? 1 : parseInt(keep[2], 10);
      if (n < 1) {
        return { ops, erro: 'Manter zero dados não faz sentido.' };
      }
      ops[chave] = n;
      resto = resto.slice(keep[0].length);
      continue;
    }
    const cm = resto.match(/^cm(\d*)/i);
    if (cm) {
      if (ops.margemCritico !== undefined) {
        return { ops, erro: 'Operador repetido "cm".' };
      }
      const n = cm[1] === '' ? 1 : parseInt(cm[1], 10);
      if (n < 1) {
        return { ops, erro: 'Margem de crítico inválida.' };
      }
      ops.margemCritico = n;
      resto = resto.slice(cm[0].length);
      continue;
    }
    const explode = resto.match(/^!(?:>=)?(\d*)/);
    if (explode) {
      if (ops.explosao !== undefined) {
        return { ops, erro: 'Operador repetido "!".' };
      }
      if (ops.implosao !== undefined) {
        return { ops, erro: 'Não combine explosão e implosão no mesmo termo.' };
      }
      ops.explosao = explode[1] === '' ? faces : parseInt(explode[1], 10);
      resto = resto.slice(explode[0].length);
      continue;
    }
    const implode = resto.match(/^\?(?:<=)?(\d*)/);
    if (implode) {
      if (ops.implosao !== undefined) {
        return { ops, erro: 'Operador repetido "?".' };
      }
      if (ops.explosao !== undefined) {
        return { ops, erro: 'Não combine explosão e implosão no mesmo termo.' };
      }
      ops.implosao = implode[1] === '' ? 1 : parseInt(implode[1], 10);
      resto = resto.slice(implode[0].length);
      continue;
    }
    return { ops, erro: `Operador desconhecido em "${resto}".` };
  }
  return { ops };
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

    // Dado literal `NdM` (N opcional) + operadores por pool.
    const dado = corpo.match(/^(\d*)[dD](\d+)(.*)$/);
    if (dado) {
      const quantidade = dado[1] === '' ? 1 : parseInt(dado[1], 10);
      const faces = parseInt(dado[2], 10);
      if (quantidade < 1 || faces < 1) {
        return { constante, erro: `Dado inválido "${corpo}".` };
      }
      if (quantidade > QUANTIDADE_DADOS_MAXIMA) {
        return { constante, erro: `Máximo de ${QUANTIDADE_DADOS_MAXIMA} dados por termo.` };
      }
      const { ops, erro } = interpretarOperadores(dado[3], faces);
      if (erro) {
        return { constante, erro };
      }
      acc.dados.push({ sinal, quantidade, faces, ...ops, ...destino });
      continue;
    }

    // Atributo como fonte de dados `ATRdM` (ex.: `FORd6`, `lutad20`) + operadores por pool.
    const dadoAtributo = corpo.match(/^([A-Za-z]+)[dD](\d+)(.*)$/);
    if (dadoAtributo) {
      const atributoDado = resolverFonte(dadoAtributo[1]);
      const faces = parseInt(dadoAtributo[2], 10);
      if (atributoDado) {
        if (faces < 1) {
          return { constante, erro: `Dado inválido "${corpo}".` };
        }
        const { ops, erro } = interpretarOperadores(dadoAtributo[3], faces);
        if (erro) {
          return { constante, erro };
        }
        acc.dados.push({ sinal, quantidade: 1, quantidadeAtributo: atributoDado, faces, ...ops, ...destino });
        continue;
      }
    }

    // Atributo escalado `ATR*N` / `ATR/N` (ex.: `FOR*3`, `LUT/2`).
    const escalado = corpo.match(/^([A-Za-z]+)([*/])(\d+)$/);
    if (escalado) {
      const atributoEscalado = resolverFonte(escalado[1]);
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

    // Fonte modificador (`+LUT`, `-forca`, `+PROF`, `+NIV`) — sempre modificador plano (m3-29, sem "modo").
    const atributo = resolverFonte(corpo);
    if (atributo) {
      acc.atributos.push({ sinal, atributo, rotulo: corpo.toUpperCase(), ...destino });
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
 * vazia, parênteses, tag/termo/operador inválido ou dado acima do teto — nunca lança (a UI trata como aviso).
 */
export function interpretarFormula(formulaTexto: string): InterpretacaoFormulaDto {
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
    const { constante: parcial, erro } = interpretarSegmento(texto, {}, acc);
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
      const { erro } = interpretarSegmento(expr, destino, acc);
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
export function validarFormula(formulaTexto: string): boolean {
  return interpretarFormula(formulaTexto).valida;
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

/** Separa `valores` em mantidos/descartados conforme o multiset `alvo` (top/bottom N), preservando a ordem. */
function separarMantidos(
  valores: readonly number[],
  alvo: readonly number[],
): { mantidos: number[]; descartados: number[] } {
  const restante = new Map<number, number>();
  for (const valor of alvo) {
    restante.set(valor, (restante.get(valor) ?? 0) + 1);
  }
  const mantidos: number[] = [];
  const descartados: number[] = [];
  for (const valor of valores) {
    const disponivel = restante.get(valor) ?? 0;
    if (disponivel > 0) {
      restante.set(valor, disponivel - 1);
      mantidos.push(valor);
    } else {
      descartados.push(valor);
    }
  }
  return { mantidos, descartados };
}

/**
 * Rola um termo de dado com os operadores por pool (m3-29): resolve a contagem (com a desvantagem
 * intrínseca de atributo zerado), rola o pool, aplica explosão/implosão (com teto), seleciona `kh`/`kl`,
 * conta a margem de crítico e devolve o subtotal dos **mantidos**. Determinístico via `rolarDado`.
 */
function rolarTermo(
  termo: TermoDadoDto,
  ambiente: Record<FonteEscalar, number>,
  rolarDado: RolarDado,
  critico = false,
): DadosRoladosDto {
  // 1. Contagem base + desvantagem intrínseca (atributo ≤ 0 num pool de teste — regra 270).
  let manterMaior = termo.manterMaior;
  let manterMenor = termo.manterMenor;
  let desvantagem = false;
  let quantidade: number;
  if (termo.quantidadeAtributo) {
    const valorAtributo = ambiente[termo.quantidadeAtributo] ?? 0;
    if (manterMaior !== undefined && valorAtributo <= 0) {
      // Teste de atributo zerado/negativo: rola 2+|attr| dados e mantém o(s) MENOR(es).
      desvantagem = true;
      quantidade = Math.min(QUANTIDADE_DADOS_MAXIMA, 2 - valorAtributo);
      manterMenor = manterMaior;
      manterMaior = undefined;
    } else {
      quantidade = Math.max(0, Math.min(QUANTIDADE_DADOS_MAXIMA, valorAtributo));
    }
  } else {
    quantidade = termo.quantidade;
  }
  // Crítico (m3-30): dobra o **número de dados** rolados (regra 1217 — `3D10` vira `6D10`).
  const quantidadeBruta = quantidade * (critico ? 2 : 1);
  quantidade = Math.max(0, Math.min(QUANTIDADE_DADOS_MAXIMA, quantidadeBruta));

  // 2. Rola o pool base.
  const valores: number[] = Array.from({ length: quantidade }, () => rolarDado(termo.faces));

  // 3. Explosão/implosão — cada dado no limiar anexa +1 dado (recursivo), com teto no total.
  if (termo.explosao !== undefined || termo.implosao !== undefined) {
    for (let indice = 0; indice < valores.length && valores.length < QUANTIDADE_DADOS_MAXIMA; indice += 1) {
      const valor = valores[indice];
      const explode = termo.explosao !== undefined && valor >= termo.explosao;
      const implode = termo.implosao !== undefined && valor <= termo.implosao;
      if (explode || implode) {
        valores.push(rolarDado(termo.faces));
      }
    }
  }

  // 4. Keep (kh/kl). Sem keep, mantém tudo.
  const temKeep = manterMaior !== undefined || manterMenor !== undefined;
  let mantidos: number[];
  let descartados: number[];
  if (temKeep) {
    const n = Math.min(valores.length, (manterMaior ?? manterMenor) as number);
    const ordenados = [...valores].sort((a, b) => (manterMaior !== undefined ? b - a : a - b));
    ({ mantidos, descartados } = separarMantidos(valores, ordenados.slice(0, n)));
  } else {
    mantidos = valores;
    descartados = [];
  }

  // 5. Crítico (informativo) — quantos mantidos atingiram a margem.
  let criticos: number | undefined;
  if (termo.margemCritico !== undefined) {
    const limiar = termo.faces - termo.margemCritico + 1;
    criticos = mantidos.filter((valor) => valor >= limiar).length;
  }

  // 6. Subtotal dos mantidos.
  const soma = mantidos.reduce((acumulado, valor) => acumulado + valor, 0);

  return {
    sinal: termo.sinal,
    faces: termo.faces,
    valores,
    subtotal: termo.sinal * soma,
    ...(temKeep ? { mantidos, descartados } : {}),
    ...(criticos !== undefined ? { criticos } : {}),
    ...(desvantagem ? { desvantagem: true } : {}),
    ...(termo.composto ? { composto: termo.composto } : termo.tipoDano ? { tipoDano: termo.tipoDano } : {}),
  };
}

/**
 * Rola a fórmula com os atributos da ficha: rola cada termo de dado (via `rolarDado`), aplica os
 * atributos (com escalonamento) e a constante, e agrupa por tipo de dano quando há tags. Devolve o
 * detalhamento + `grupos` + o total. Fórmula inválida devolve `null` (a UI valida antes). Determinístico
 * quando `rolarDado` é injetado.
 */
export function rolarFormula(dto: RolagemDto, rolarDado: RolarDado = rolarDadoPadrao): ResultadoRolagemDto | null {
  const interpretacao = interpretarFormula(dto.formula);
  if (!interpretacao.valida || !interpretacao.formula) {
    return null;
  }
  return rolarInterpretada(interpretacao.formula, dto.atributos, dto.proficiencia, dto.nivel, rolarDado);
}

/**
 * Rola uma fórmula **já interpretada** (com efeitos de habilidade opcionalmente já fundidos via
 * `aplicarEfeitos`) — mesma semântica de `rolarFormula`, sem reinterpretar o texto. Usado pelo runner
 * de presets encadeados (m3-21). Determinístico quando `rolarDado` é injetado.
 */
export function rolarInterpretada(
  formula: FormulaInterpretadaDto,
  atributos: FichaAtributosDto,
  proficiencia?: number | null,
  nivel?: number,
  rolarDado: RolarDado = rolarDadoPadrao,
  critico = false,
): ResultadoRolagemDto {
  // Ambiente escalar da rolagem (m3-22): os 10 atributos + Proficiência (`PROF`) + Nível (`NIV`).
  const ambiente: Record<FonteEscalar, number> = {
    ...atributos,
    proficiencia: proficiencia ?? 0,
    nivel: nivel ?? 0,
  };

  const dados: DadosRoladosDto[] = formula.dados.map((termo) => rolarTermo(termo, ambiente, rolarDado, critico));

  const atributosAplicados: AtributoAplicadoDto[] = formula.atributos.map((termo) => {
    const base = ambiente[termo.atributo] ?? 0;
    const escalado = Math.floor((base * (termo.multiplicador ?? 1)) / (termo.divisor ?? 1));
    // Crítico (m3-30): dobra o atributo, **exceto** valores de Patente/Nível (PROF/NIV) — regra 1303.
    const dobra = critico && termo.atributo !== 'proficiencia' && termo.atributo !== 'nivel' ? 2 : 1;
    return {
      rotulo: termo.rotulo,
      valor: termo.sinal * escalado * dobra,
      ...(termo.composto ? { composto: termo.composto } : termo.tipoDano ? { tipoDano: termo.tipoDano } : {}),
    };
  });

  // Crítico dobra também as constantes (fixos), tipadas e sem tag (dados já vêm dobrados de `rolarTermo`).
  const fatorFixo = critico ? 2 : 1;
  const contribuicoes: Contribuicao[] = [
    ...dados.map((termo) => ({ valor: termo.subtotal, tipoDano: termo.tipoDano, composto: termo.composto })),
    ...atributosAplicados.map((termo) => ({ valor: termo.valor, tipoDano: termo.tipoDano, composto: termo.composto })),
    ...(formula.constantesTipadas ?? []).map((termo) => ({
      valor: termo.sinal * termo.valor * fatorFixo,
      tipoDano: termo.tipoDano,
      composto: termo.composto,
    })),
  ];

  const constante = formula.constante * fatorFixo;
  const grupos = agruparDano(contribuicoes);
  const totalSemTipo = contribuicoes
    .filter((contribuicao) => contribuicao.tipoDano === undefined && contribuicao.composto === undefined)
    .reduce((acumulado, contribuicao) => acumulado + contribuicao.valor, 0);
  const total = grupos.reduce((acumulado, grupo) => acumulado + grupo.total, 0) + totalSemTipo + constante;

  return {
    dados,
    atributos: atributosAplicados,
    constante,
    ...(grupos.length > 0 ? { grupos } : {}),
    total,
    ...(critico ? { critico: true } : {}),
  };
}

/**
 * Resolve um preset (m3-21; habilidade **por passo** em m3-22) **sem rolar**: interpreta cada passo
 * (primária + `seguintes`) e resolve as habilidades vinculadas **daquele passo** só para a **Energia**
 * (efeitos aposentados em m3-31 — a fórmula não é alterada), reportando a Energia por passo. Puro — o front rola cada passo com
 * `rolarPasso` e debita a energia do passo pelo canal existente. Habilidades cujo nome não está na ficha
 * são ignoradas. Os campos de energia do `PlanoPresetDto` são os **agregados** (soma de todos os passos).
 */
export function resolverPreset(dto: PresetResolverDto): PlanoPresetDto {
  const { preset } = dto;
  const habilidadesFicha = dto.habilidades ?? [];

  // Resolve os nomes de habilidade de um passo nas habilidades da ficha (ignora nomes ausentes).
  const resolverVinculo = (nomes: readonly string[] | undefined): FichaHabilidadeDto[] =>
    (nomes ?? [])
      .map((nome) => habilidadesFicha.find((habilidade) => habilidade.nome === nome))
      .filter((habilidade): habilidade is FichaHabilidadeDto => habilidade !== undefined);

  const passosBrutos = [
    {
      nome: preset.nome,
      formula: preset.formula,
      descricao: preset.descricao,
      habilidades: preset.habilidades,
      critico: preset.critico,
    },
    ...(preset.seguintes ?? []),
  ];
  const passos: PassoInterpretadoDto[] = passosBrutos.map((passo) => {
    // Multiconjunto: o mesmo nome pode repetir (aplicar a habilidade N vezes) → soma Energia por ocorrência.
    const vinculadas = resolverVinculo(passo.habilidades);
    // A fórmula é usada **crua** — as habilidades só contam Energia (efeitos aposentados em m3-31).
    const interpretacao = interpretarFormula(passo.formula);
    return {
      nome: passo.nome,
      formula: passo.formula,
      interpretacao,
      ...(passo.descricao ? { descricao: passo.descricao } : {}),
      energiaGasta: vinculadas.reduce((soma, habilidade) => soma + (habilidade.custoEnergia ?? 0), 0),
      energiaVariavel: vinculadas.some((habilidade) => habilidade.custoEnergia === null),
      habilidadesVinculadas: vinculadas.map((habilidade) => habilidade.nome),
      critico: passo.critico ?? false,
    };
  });

  return {
    passos,
    energiaGasta: passos.reduce((soma, passo) => soma + passo.energiaGasta, 0),
    energiaVariavel: passos.some((passo) => passo.energiaVariavel),
    habilidadesVinculadas: passos.flatMap((passo) => passo.habilidadesVinculadas),
  };
}

/** Rola um passo já resolvido de um preset (m3-21). Passo com fórmula inválida devolve `null`. */
export function rolarPasso(
  passo: PassoInterpretadoDto,
  atributos: FichaAtributosDto,
  proficiencia?: number | null,
  nivel?: number,
  rolarDado: RolarDado = rolarDadoPadrao,
  critico = false,
): ResultadoRolagemDto | null {
  if (!passo.interpretacao.valida || !passo.interpretacao.formula) {
    return null;
  }
  return rolarInterpretada(passo.interpretacao.formula, atributos, proficiencia, nivel, rolarDado, critico);
}

// ── Migração de presets legados (m3-19 → m3-29) ──────────────────────────────

/** Passo legado (m3-19): pode carregar `modo: 'TESTE'` que a v3 traduz para notação explícita. */
interface FichaRolagemPassoLegadoDto {
  readonly nome: string;
  readonly formula: string;
  readonly modo?: string;
  readonly descricao?: string;
  readonly habilidades?: readonly string[];
  /** `critico` (m3-30) — preservado na migração (não é campo legado, mas passa pela normalização na carga). */
  readonly critico?: boolean;
}

/** Preset legado (m3-19): idem, com `seguintes` legados. */
interface FichaRolagemLegadoDto {
  readonly nome: string;
  readonly formula: string;
  readonly modo?: string;
  readonly descricao?: string;
  readonly tipo?: FichaRolagemDto['tipo'];
  readonly seguintes?: readonly FichaRolagemPassoLegadoDto[];
  readonly habilidades?: readonly string[];
  readonly critico?: boolean;
}

/**
 * Reescreve a fórmula de um passo que era **modo TESTE** (m3-19) na notação v3 explícita (m3-29): cada
 * atributo puro vira o pool `…d20kh1` (pegar o maior), um pool d20 explícito ganha `kh1`, e se faltar a
 * Proficiência soma `+ PROF`. **Idempotente** — fórmula que já tem `kh`/`kl` ou já cita PROF passa intacta.
 */
export function reescreverFormulaTeste(formula: string): string {
  const compacto = (formula ?? '').replace(/\s+/g, '');
  if (!compacto) {
    return (formula ?? '').trim();
  }
  const temSinalInicial = /^[+-]/.test(compacto);
  const normalizada = temSinalInicial ? compacto : `+${compacto}`;
  const partes = normalizada.match(/[+-][^+-]*/g) ?? [];
  let temProf = false;

  const termos = partes.map((parte) => {
    const sinal = parte[0] as '+' | '-';
    const corpo = parte.slice(1);
    if (resolverFonte(corpo) === 'proficiencia') {
      temProf = true;
    }
    // Já tem keep → intacto (idempotência).
    if (/k[hl]\d*/i.test(corpo)) {
      return { sinal, corpo };
    }
    // Atributo puro (não PROF/NIV) → pool d20 pegando o maior.
    if (resolverAtributo(corpo) !== null) {
      return { sinal, corpo: `${corpo}d20kh1` };
    }
    // Pool d20 explícito (`lutad20`, `1d20`, `d20`) → append kh1.
    if (/^(\d*|[A-Za-z]+)[dD]20$/.test(corpo)) {
      return { sinal, corpo: `${corpo}kh1` };
    }
    return { sinal, corpo };
  });

  const pecas = termos.map((termo, indice) => {
    if (indice === 0 && !temSinalInicial) {
      return termo.corpo;
    }
    return `${termo.sinal === '-' ? '- ' : '+ '}${termo.corpo}`;
  });
  const base = pecas.join(' ');
  return temProf ? base : `${base} + PROF`;
}

/**
 * Migra um preset legado (m3-19) para a forma v3 (m3-29): reescreve as fórmulas dos passos que eram
 * `modo:'TESTE'` para a notação explícita e **dropa `modo`** em todos os níveis. Pura e idempotente —
 * presets `SOMA`/sem `modo` só perdem a chave `modo`; presets já-v3 voltam iguais. Chamada no boundary
 * de carga da ficha (frontend); o backend guarda o JSONB opaco.
 */
export function normalizarPresetLegado(preset: FichaRolagemLegadoDto): FichaRolagemDto {
  const normalizarPasso = (passo: FichaRolagemPassoLegadoDto): FichaRolagemPassoDto => ({
    nome: passo.nome,
    formula: passo.modo === 'TESTE' ? reescreverFormulaTeste(passo.formula) : passo.formula,
    ...(passo.descricao ? { descricao: passo.descricao } : {}),
    ...(passo.habilidades ? { habilidades: passo.habilidades } : {}),
    ...(passo.critico ? { critico: true } : {}),
  });

  return {
    nome: preset.nome,
    formula: preset.modo === 'TESTE' ? reescreverFormulaTeste(preset.formula) : preset.formula,
    ...(preset.descricao ? { descricao: preset.descricao } : {}),
    ...(preset.tipo ? { tipo: preset.tipo } : {}),
    ...(preset.seguintes ? { seguintes: preset.seguintes.map(normalizarPasso) } : {}),
    ...(preset.habilidades ? { habilidades: preset.habilidades } : {}),
    ...(preset.critico ? { critico: true } : {}),
  };
}
