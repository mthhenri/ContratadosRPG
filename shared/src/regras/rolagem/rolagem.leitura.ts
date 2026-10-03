import { ABREVIACOES_ATRIBUTO, ABREVIACOES_FONTE_EXTRA, resolverTipoDanoSimples } from './rolagem.dados';
import type { FonteEscalar, ParTipoDano } from './rolagem.dtos';
import { TipoDanoEnum } from '../../enums';
import type { FichaAtributosDto } from '../../dtos/ficha';

/**
 * Leitura de baixo nível das fórmulas de rolagem — resolução de fontes e tags, operadores por pool e
 * divisão de termos/parênteses. Módulo **interno** do motor: usado por `rolagem.ts` (interpretação) e por
 * `rolagem.pecas.ts` (tokenização em peças, `montador-exp-01`), para que as duas leituras nunca divirjam.
 * Não é reexportado pelo `index.ts`. Funções puras, extraídas de `rolagem.ts` sem mudança de comportamento.
 */

/** Resolve uma referência de atributo (abreviação `LUT` ou nome `luta`) na chave da ficha, ou `null`. */
export function resolverAtributo(texto: string): keyof FichaAtributosDto | null {
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
export function resolverFonte(texto: string): FonteEscalar | null {
  const atributo = resolverAtributo(texto);
  if (atributo) {
    return atributo;
  }
  return ABREVIACOES_FONTE_EXTRA[texto.toUpperCase()] ?? null;
}

/** Tipo de dano estampado nos termos de um segmento: single (`tipoDano`), Composto ou nenhum. */
export type DestinoDano = { readonly tipoDano?: TipoDanoEnum; readonly composto?: ParTipoDano };

/**
 * Resolve uma tag `[Tipo]` (single) ou `[TipoA-TipoB]` (Composto). Composto exige **dois tipos
 * bloqueáveis distintos** (Geral, irredutível, fica de fora). `null` se desconhecida/inválida.
 */
export function resolverTipoDano(tag: string): DestinoDano | null {
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
export interface OperadoresDado {
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
export function interpretarOperadores(sufixo: string, faces: number): { ops: OperadoresDado; erro?: string } {
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

/**
 * Divide uma expressão já normalizada (prefixada com sinal) em termos de nível superior por `+`/`−`,
 * sem quebrar dentro de parênteses (m3-46) — necessário para `(ATR±n)dM` carregar seu próprio sinal
 * interno sem ser cortado ao meio pelo split.
 */
export function dividirTermosNivelSuperior(expressaoComSinal: string): string[] {
  const partes: string[] = [];
  let atual = '';
  let profundidade = 0;
  for (const caractere of expressaoComSinal) {
    if (caractere === '(') {
      profundidade += 1;
    } else if (caractere === ')') {
      profundidade -= 1;
    }
    if (profundidade === 0 && (caractere === '+' || caractere === '-') && atual.length > 0) {
      partes.push(atual);
      atual = caractere;
    } else {
      atual += caractere;
    }
  }
  if (atual) {
    partes.push(atual);
  }
  return partes;
}

/** Posição do `)` que fecha o `(` inicial de `texto`, ou -1 (não começa com `(` ou não fecha). */
export function encontrarFechamento(texto: string): number {
  if (texto[0] !== '(') {
    return -1;
  }
  let profundidade = 0;
  for (let indice = 0; indice < texto.length; indice += 1) {
    if (texto[indice] === '(') {
      profundidade += 1;
    } else if (texto[indice] === ')') {
      profundidade -= 1;
      if (profundidade === 0) {
        return indice;
      }
    }
  }
  return -1;
}

/**
 * Detecta o envelope de repetição `(<fórmula>)#N` (m3-46): só reconhece quando os parênteses envolvem
 * o texto **inteiro** — i.e., o `(` inicial fecha exatamente no `)` que precede o `#N` final, sem sobrar
 * nada fora. `null` quando não é esse envelope (formula normal, ou `(ATR±n)dM` solto). `n` pode vir
 * `NaN` (ex.: `(...)#` sem dígitos) — quem chama valida.
 */
export function extrairRepeticao(texto: string): { readonly interna: string; readonly n: number } | null {
  const encontrado = texto.match(/^\((.*)\)#(\d*)$/);
  if (!encontrado) {
    return null;
  }
  const interna = encontrado[1];
  let profundidade = 1;
  for (const caractere of interna) {
    if (caractere === '(') {
      profundidade += 1;
    } else if (caractere === ')') {
      profundidade -= 1;
    }
    if (profundidade === 0) {
      return null; // o '(' inicial fechou antes do fim — não é o envelope inteiro.
    }
  }
  if (profundidade !== 1) {
    return null; // parênteses internos desbalanceados.
  }
  const n = encontrado[2] === '' ? NaN : parseInt(encontrado[2], 10);
  return { interna, n };
}
