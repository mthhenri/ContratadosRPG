import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import {
  ABREVIACOES_ATRIBUTO,
  type FonteEscalar,
  type FormulaTokenizadaDto,
  type ParTipoDano,
  type PecaDadoDto,
  type PecaFonteDto,
  type PecaFormulaDto,
  QUANTIDADE_DADOS_MAXIMA,
  REPETICOES_MAXIMA,
} from '@contratados-rpg/shared/regras/rolagem';

import type { MontadorModo } from './montador-modelo';

/**
 * Peças que os controles das versões novas montam (`montador-exp-03`/`04`) e o **teste de atributo** lido das peças.
 * Só forma de texto — o motor (`shared/regras/rolagem`) continua o único juiz do que a fórmula vale. O que fica de
 * fora dos controles por decisão do I-041 (kh/kl com N > 1, explosão/implosão com limiar, dado por atributo fora do
 * teste, `1d100`) volta como fórmula "avançada" (`podeMontarPecas`), nunca é reescrito.
 */

/** Dados dos controles — os do sistema, sem `d100` (`docs/core/sistema-v4.1.0.md` — "Dados"). */
export const FACES_MONTADOR: readonly number[] = [3, 4, 6, 8, 10, 12, 20];

/** Margem de crítico que os controles oferecem (`cm1`…`cm3`; 0 = sem margem). */
export const MARGEM_CRITICO_MAXIMA = 3;

/** Teto da quantidade de dados digitável num termo — o do motor. */
export const QUANTIDADE_DADOS_MONTADOR = QUANTIDADE_DADOS_MAXIMA;

/** Teto da repetição `#N` — o do motor. */
export const REPETICOES_MONTADOR = REPETICOES_MAXIMA;

/** Um tipo de dano dos controles: nome por extenso no botão, sigla na fórmula, classe de cor do token `--dano-*`. */
export interface TipoDanoMontador {
  readonly tipo: TipoDanoEnum;
  readonly nome: string;
  readonly classe: 'fisico' | 'balistico' | 'explosao' | 'quimico' | 'geral';
}

export const TIPOS_DANO_MONTADOR: readonly TipoDanoMontador[] = [
  { tipo: TipoDanoEnum.FISICO, nome: 'Físico', classe: 'fisico' },
  { tipo: TipoDanoEnum.BALISTICO, nome: 'Balístico', classe: 'balistico' },
  { tipo: TipoDanoEnum.EXPLOSAO, nome: 'Explosão', classe: 'explosao' },
  { tipo: TipoDanoEnum.QUIMICO, nome: 'Químico', classe: 'quimico' },
  { tipo: TipoDanoEnum.GERAL, nome: 'Geral', classe: 'geral' },
];

/** Atributos na ordem da ficha, com o nome por extenso (`FOR` → `Força`). */
export const ATRIBUTOS_MONTADOR: readonly { readonly sigla: string; readonly nome: string }[] = [
  { sigla: 'DES', nome: 'Destreza' },
  { sigla: 'FOR', nome: 'Força' },
  { sigla: 'LUT', nome: 'Luta' },
  { sigla: 'PON', nome: 'Pontaria' },
  { sigla: 'VIG', nome: 'Vigor' },
  { sigla: 'INT', nome: 'Intelecto' },
  { sigla: 'MED', nome: 'Medicina' },
  { sigla: 'SEN', nome: 'Sentidos' },
  { sigla: 'SOC', nome: 'Social' },
  { sigla: 'VON', nome: 'Vontade' },
];

/** Fontes extras: Proficiência e Nível. */
export const FONTES_EXTRA_MONTADOR: readonly { readonly sigla: string; readonly nome: string }[] = [
  { sigla: 'PROF', nome: 'Proficiência' },
  { sigla: 'NIV', nome: 'Nível' },
];

/** Chave da fonte (`forca`, `proficiencia`) a partir da sigla do controle. */
export function fonteDaSigla(sigla: string): FonteEscalar {
  if (sigla === 'PROF') return 'proficiencia';
  if (sigla === 'NIV') return 'nivel';
  return ABREVIACOES_ATRIBUTO[sigla];
}

/** Sigla curta de uma fonte (`forca` → `FOR`, `proficiencia` → `PROF`). */
export function siglaDaFonte(fonte: FonteEscalar): string {
  if (fonte === 'proficiencia') return 'PROF';
  if (fonte === 'nivel') return 'NIV';
  return Object.entries(ABREVIACOES_ATRIBUTO).find(([, chave]) => chave === fonte)?.[0] ?? fonte;
}

/** Nome por extenso de uma fonte (`forca` → `Força`). */
export function nomeDaFonte(fonte: FonteEscalar): string {
  const sigla = siglaDaFonte(fonte);
  return [...ATRIBUTOS_MONTADOR, ...FONTES_EXTRA_MONTADOR].find((item) => item.sigla === sigla)?.nome ?? sigla;
}

/** Tipo de dano que o modo dá a uma peça nova: dano de arma nasce Físico; teste e dados livres, sem tipo. */
export function tipoPadraoDoModo(modo: MontadorModo): TipoDanoEnum | null {
  return modo === 'DANO' ? TipoDanoEnum.FISICO : null;
}

// ── O que os controles sabem montar ──────────────────────────────────────────

function dadoMontavel(peca: PecaDadoDto, noTeste: boolean): boolean {
  if (!FACES_MONTADOR.includes(peca.faces)) return false;
  if (peca.quantidade.tipo === 'FONTE' && !noTeste) return false;
  if (peca.manterMaior !== undefined && peca.manterMaior !== 1) return false;
  if (peca.manterMenor !== undefined && peca.manterMenor !== 1) return false;
  if (peca.explosao !== undefined && peca.explosao !== peca.faces) return false;
  if (peca.implosao !== undefined && peca.implosao !== 1) return false;
  if (peca.margemCritico !== undefined && peca.margemCritico > MARGEM_CRITICO_MAXIMA) return false;
  return true;
}

/**
 * Se os controles de termos (Completo/Essencial/Blocos) montam todas as peças. Fora deles fica a fórmula
 * "avançada": `kh`/`kl` com N > 1, explosão/implosão com limiar, dado por atributo fora do teste (`FORd6`), dado
 * que não é do sistema (`1d100`) e margem de crítico acima de 3.
 */
export function podeMontarPecas(tokenizada: FormulaTokenizadaDto): boolean {
  return tokenizada.pecas.every((peca) => peca.tipo !== 'DADO' || dadoMontavel(peca, false));
}

/**
 * Se Completo/Essencial montam a fórmula: como teste de atributo (onde o pool por atributo vale) ou como termos.
 * O resto aparece como fórmula avançada.
 */
export function podeMontarPecasOuTeste(tokenizada: FormulaTokenizadaDto): boolean {
  return podeMontarPecas(tokenizada) || lerTeste(tokenizada) !== null;
}

// ── Teste de atributo ────────────────────────────────────────────────────────

/** Como dois atributos viram a quantidade de d20 do teste (sempre arredondando para baixo). */
export type CombinacaoTeste = 'SOMA' | 'MEDIA';

/**
 * Teste de atributo lido das peças: `ATRd20kh1`, `(ATR±n)d20kh1`, `(A+B)d20kh1`, `((A+B)/2)d20kh1` (com `±n`),
 * manter maior/menor, margem de crítico, `+PROF`, `+NIV`, bônus fixo e repetição.
 */
export interface TesteMontador {
  readonly atributos: readonly string[];
  readonly combinacao: CombinacaoTeste;
  /** Dados a mais (+) ou a menos (−). */
  readonly extra: number;
  readonly manter: 'MAIOR' | 'MENOR';
  /** 0 = sem margem; 1…3 = `cm1`…`cm3`. */
  readonly margem: number;
  readonly proficiencia: boolean;
  readonly nivel: boolean;
  /** Soma dos números fixos (com sinal). */
  readonly bonus: number;
  readonly repeticoes: number;
}

const SIGLAS_ATRIBUTO = new Set(ATRIBUTOS_MONTADOR.map((item) => item.sigla));

/** Sigla de 3 letras de um nome de atributo escrito (`LUT`, `LUTA`, `luta`) ou `null` (não é atributo). */
function siglaDoAtributo(nome: string): string | null {
  const maiusculo = nome.toUpperCase();
  if (SIGLAS_ATRIBUTO.has(maiusculo)) return maiusculo;
  const chave = nome.toLowerCase();
  const par = Object.entries(ABREVIACOES_ATRIBUTO).find(([, valor]) => valor === chave);
  return par ? par[0] : null;
}

/** Lê a quantidade de d20 do teste (`LUT`, `LUT+1`, `INT+SOC`, `(INT+SOC)/2-1`) ou `null`. */
function lerQuantidadeTeste(
  quantidade: PecaDadoDto['quantidade'],
): Pick<TesteMontador, 'atributos' | 'combinacao' | 'extra'> | null {
  if (quantidade.tipo === 'FONTE') {
    const sigla = siglaDoAtributo(quantidade.nome);
    return sigla ? { atributos: [sigla], combinacao: 'SOMA', extra: 0 } : null;
  }
  if (quantidade.tipo !== 'CONTA') return null;
  const texto = quantidade.texto;
  const extraDe = (bruto: string | undefined): number => (bruto ? parseInt(bruto, 10) : 0);
  const um = texto.match(/^([A-Z]+)([+-]\d+)$/);
  if (um && siglaDoAtributo(um[1])) {
    return { atributos: [siglaDoAtributo(um[1]) as string], combinacao: 'SOMA', extra: extraDe(um[2]) };
  }
  const media = texto.match(/^\(([A-Z]+)\+([A-Z]+)\)\/2([+-]\d+)?$/);
  if (media && siglaDoAtributo(media[1]) && siglaDoAtributo(media[2])) {
    return {
      atributos: [siglaDoAtributo(media[1]) as string, siglaDoAtributo(media[2]) as string],
      combinacao: 'MEDIA',
      extra: extraDe(media[3]),
    };
  }
  const soma = texto.match(/^([A-Z]+)\+([A-Z]+)([+-]\d+)?$/);
  if (soma && siglaDoAtributo(soma[1]) && siglaDoAtributo(soma[2])) {
    return {
      atributos: [siglaDoAtributo(soma[1]) as string, siglaDoAtributo(soma[2]) as string],
      combinacao: 'SOMA',
      extra: extraDe(soma[3]),
    };
  }
  return null;
}

/**
 * Lê as peças como teste de atributo, ou `null` quando não têm essa forma (o editor usa então os termos). A
 * primeira peça é o pool de d20 com manter maior/menor de 1 dado, sem tipo nem explosão; as outras só podem ser
 * `+PROF`, `+NIV` e números.
 */
export function lerTeste(tokenizada: FormulaTokenizadaDto): TesteMontador | null {
  const [primeira, ...resto] = tokenizada.pecas;
  if (!primeira || primeira.tipo !== 'DADO' || primeira.sinal !== 1 || primeira.faces !== 20) return null;
  if (!dadoMontavel(primeira, true)) return null;
  if (primeira.tipoDano || primeira.composto || primeira.explosao !== undefined || primeira.implosao !== undefined) {
    return null;
  }
  const manter = primeira.manterMaior === 1 ? 'MAIOR' : primeira.manterMenor === 1 ? 'MENOR' : null;
  const quantidade = lerQuantidadeTeste(primeira.quantidade);
  if (!manter || !quantidade) return null;

  let proficiencia = false;
  let nivel = false;
  let bonus = 0;
  for (const peca of resto) {
    if (peca.tipo === 'NUMERO' && !peca.tipoDano && !peca.composto) {
      bonus += peca.sinal * peca.valor;
    } else if (
      peca.tipo === 'FONTE' &&
      peca.sinal === 1 &&
      !peca.multiplicador &&
      !peca.divisor &&
      !peca.tipoDano &&
      !peca.composto &&
      (peca.fonte === 'proficiencia' ? !proficiencia : peca.fonte === 'nivel' ? !nivel : false)
    ) {
      if (peca.fonte === 'proficiencia') proficiencia = true;
      else nivel = true;
    } else {
      return null;
    }
  }
  return {
    ...quantidade,
    manter,
    margem: primeira.margemCritico ?? 0,
    proficiencia,
    nivel,
    bonus,
    repeticoes: tokenizada.repeticoes ?? 1,
  };
}

/** Peças do teste, na ordem: pool de d20, `+PROF`, `+NIV`, bônus. */
export function escreverTeste(teste: TesteMontador): FormulaTokenizadaDto {
  const extra = teste.extra === 0 ? '' : teste.extra > 0 ? `+${teste.extra}` : `${teste.extra}`;
  const [primeiro, segundo] = teste.atributos;
  let quantidade: PecaDadoDto['quantidade'];
  if (segundo) {
    quantidade = {
      tipo: 'CONTA',
      texto: teste.combinacao === 'MEDIA' ? `(${primeiro}+${segundo})/2${extra}` : `${primeiro}+${segundo}${extra}`,
    };
  } else if (extra) {
    quantidade = { tipo: 'CONTA', texto: `${primeiro}${extra}` };
  } else {
    quantidade = { tipo: 'FONTE', fonte: fonteDaSigla(primeiro), nome: primeiro };
  }
  const pecas: PecaFormulaDto[] = [
    {
      tipo: 'DADO',
      sinal: 1,
      quantidade,
      faces: 20,
      ...(teste.manter === 'MAIOR' ? { manterMaior: 1 } : { manterMenor: 1 }),
      ...(teste.margem > 0 ? { margemCritico: teste.margem } : {}),
    },
    ...(teste.proficiencia ? [fonteSimples('PROF')] : []),
    ...(teste.nivel ? [fonteSimples('NIV')] : []),
    ...(teste.bonus !== 0
      ? [{ tipo: 'NUMERO' as const, sinal: (teste.bonus > 0 ? 1 : -1) as 1 | -1, valor: Math.abs(teste.bonus) }]
      : []),
  ];
  return teste.repeticoes >= 2 ? { pecas, repeticoes: teste.repeticoes } : { pecas };
}

function fonteSimples(sigla: string): PecaFonteDto {
  return { tipo: 'FONTE', sinal: 1, fonte: fonteDaSigla(sigla), nome: sigla };
}

// ── Peças novas e ajustes de termo ───────────────────────────────────────────

/** Cópia sem as chaves dadas (para trocar opções/tipo de uma peça sem deixar campo velho para trás). */
function semChaves<T extends object>(objeto: T, chaves: readonly string[]): T {
  return Object.fromEntries(Object.entries(objeto).filter(([chave]) => !chaves.includes(chave))) as T;
}

/** Tag de um tipo simples (`null` = sem tipo), sem composto. */
function destinoSimples(tipo: TipoDanoEnum | null): { tipoDano?: TipoDanoEnum } {
  return tipo ? { tipoDano: tipo } : {};
}

/**
 * Clique num dado: soma 1 ao último termo de dado **igual** (mesma face, quantidade numérica, somando, sem
 * opções e com o mesmo tipo) — "toque de novo para somar" — ou acrescenta `1dN` com o tipo padrão do modo.
 */
export function adicionarDadoMontador(
  tokenizada: FormulaTokenizadaDto,
  faces: number,
  tipo: TipoDanoEnum | null,
): FormulaTokenizadaDto {
  const somavel = (peca: PecaFormulaDto): boolean =>
    peca.tipo === 'DADO' &&
    peca.faces === faces &&
    peca.sinal === 1 &&
    peca.quantidade.tipo === 'NUMERO' &&
    peca.quantidade.valor < QUANTIDADE_DADOS_MAXIMA &&
    peca.manterMaior === undefined &&
    peca.manterMenor === undefined &&
    peca.explosao === undefined &&
    peca.implosao === undefined &&
    peca.margemCritico === undefined &&
    !peca.composto &&
    (peca.tipoDano ?? null) === tipo;
  let indice = -1;
  for (let posicao = tokenizada.pecas.length - 1; posicao >= 0 && indice < 0; posicao -= 1) {
    if (somavel(tokenizada.pecas[posicao])) indice = posicao;
  }
  if (indice >= 0) {
    const peca = tokenizada.pecas[indice] as PecaDadoDto;
    const valor = (peca.quantidade as { valor: number }).valor + 1;
    return {
      ...tokenizada,
      pecas: tokenizada.pecas.map((atual, posicao) =>
        posicao === indice ? { ...peca, quantidade: { tipo: 'NUMERO', valor } } : atual,
      ),
    };
  }
  const nova: PecaDadoDto = {
    tipo: 'DADO',
    sinal: 1,
    quantidade: { tipo: 'NUMERO', valor: 1 },
    faces,
    ...destinoSimples(tipo),
  };
  return { ...tokenizada, pecas: [...tokenizada.pecas, nova] };
}

/** Peça de atributo/Proficiência/Nível somando, com o tipo padrão do modo. */
export function novaPecaFonte(sigla: string, tipo: TipoDanoEnum | null): PecaFonteDto {
  return { tipo: 'FONTE', sinal: 1, fonte: fonteDaSigla(sigla), nome: sigla, ...destinoSimples(tipo) };
}

/** Peça de número fixo (o valor com sinal vira sinal + módulo). */
export function novaPecaNumero(valor: number, tipo: TipoDanoEnum | null): PecaFormulaDto {
  return { tipo: 'NUMERO', sinal: valor < 0 ? -1 : 1, valor: Math.abs(valor), ...destinoSimples(tipo) };
}

/** Tipo de uma peça para os controles: simples, composto ou nenhum. */
export interface TipoPecaMontador {
  readonly primeiro: TipoDanoEnum | null;
  /** Segundo tipo do composto (`[F-Q]`), ou `null`. */
  readonly segundo: TipoDanoEnum | null;
}

export function lerTipoPeca(peca: PecaFormulaDto): TipoPecaMontador {
  if (peca.tipo === 'ATALHO') return { primeiro: null, segundo: null };
  if (peca.composto) return { primeiro: peca.composto[0], segundo: peca.composto[1] };
  return { primeiro: peca.tipoDano ?? null, segundo: null };
}

/**
 * Aplica um tipo (simples ou composto) a uma peça. O composto exige dois tipos bloqueáveis distintos (regra do
 * motor): um segundo tipo igual ao primeiro, Geral, ou sem primeiro tipo, cai para o tipo simples.
 */
export function aplicarTipoPeca(peca: PecaFormulaDto, tipo: TipoPecaMontador): PecaFormulaDto {
  if (peca.tipo === 'ATALHO') return peca;
  const semTipo = semChaves(peca, ['tipoDano', 'composto']);
  const { primeiro, segundo } = tipo;
  const compostoValido =
    primeiro !== null &&
    segundo !== null &&
    primeiro !== segundo &&
    primeiro !== TipoDanoEnum.GERAL &&
    segundo !== TipoDanoEnum.GERAL;
  if (compostoValido) {
    return { ...semTipo, composto: [primeiro, segundo] as ParTipoDano };
  }
  return primeiro ? { ...semTipo, tipoDano: primeiro } : semTipo;
}

/** Opção "Manter" de um dado: todos, o maior ou o menor (sempre 1 dado). */
export type ManterDado = 'TODOS' | 'MAIOR' | 'MENOR';

/** Opção "Dado extra": nenhum, explode no máximo, implode no mínimo. */
export type DadoExtra = 'NENHUM' | 'EXPLODE' | 'IMPLODE';

export function lerManterDado(peca: PecaDadoDto): ManterDado {
  return peca.manterMaior !== undefined ? 'MAIOR' : peca.manterMenor !== undefined ? 'MENOR' : 'TODOS';
}

export function lerDadoExtra(peca: PecaDadoDto): DadoExtra {
  return peca.explosao !== undefined ? 'EXPLODE' : peca.implosao !== undefined ? 'IMPLODE' : 'NENHUM';
}

/** Ajusta as opções de um dado; campos ausentes ficam como estão. */
export function alterarOpcoesDado(
  peca: PecaDadoDto,
  opcoes: { readonly manter?: ManterDado; readonly extra?: DadoExtra; readonly margem?: number },
): PecaDadoDto {
  const manter = opcoes.manter ?? lerManterDado(peca);
  const extra = opcoes.extra ?? lerDadoExtra(peca);
  const margem = opcoes.margem ?? peca.margemCritico ?? 0;
  const base = semChaves(peca, ['manterMaior', 'manterMenor', 'explosao', 'implosao', 'margemCritico']);
  return {
    ...base,
    ...(manter === 'MAIOR' ? { manterMaior: 1 } : manter === 'MENOR' ? { manterMenor: 1 } : {}),
    ...(margem > 0 ? { margemCritico: margem } : {}),
    ...(extra === 'EXPLODE' ? { explosao: peca.faces } : extra === 'IMPLODE' ? { implosao: 1 } : {}),
  };
}

/** Quantidade numérica de um dado (1…100). */
export function alterarQuantidadeDado(peca: PecaDadoDto, valor: number): PecaDadoDto {
  const limitado = Math.max(1, Math.min(QUANTIDADE_DADOS_MAXIMA, Math.trunc(valor)));
  return { ...peca, quantidade: { tipo: 'NUMERO', valor: limitado } };
}
