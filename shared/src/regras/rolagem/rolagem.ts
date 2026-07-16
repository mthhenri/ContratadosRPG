import { ABREVIACOES_ATRIBUTO, QUANTIDADE_DADOS_MAXIMA } from './rolagem.dados';
import {
  DadosRoladosDto,
  FormulaInterpretadaDto,
  InterpretacaoFormulaDto,
  ResultadoRolagemDto,
  RolagemDto,
  TermoAtributoDto,
  TermoDadoDto,
} from './rolagem.dtos';
import type { FichaAtributosDto } from '../../dtos/ficha';

/**
 * Motor de rolagem de dados (m3-15; gramática v2 m3-16): interpreta e rola uma fórmula de preset —
 * `NdM`, constantes inteiras, referências a atributo (`+LUT` / nome completo `+luta`), atributo como
 * **fonte de dados** (`FORd6` = FOR dados) e atributo **escalado** (`FOR*3`, `LUT/2`, piso),
 * combinados por `+`/`−`. Parênteses ainda não são suportados. Funções puras; a **única brecha a
 * `Math.random`** é a função de rolagem injetável `rolarDado` (SYSTEM.SPEC §6.6), com padrão de produção.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Atributos"/"Testes" (notação `1d20 + Atributo`).
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
 * Interpreta a fórmula em termos de dado, atributo e constante. Aceita espaços; o 1º termo pode vir
 * sem sinal (assume `+`). Um termo é `NdM` (N opcional, default 1), um inteiro, ou um atributo.
 * Devolve `{ valida: false, erro }` para fórmula vazia, termo desconhecido, dado inválido ou
 * quantidade acima do teto — nunca lança (a UI trata como aviso).
 */
export function interpretarFormula(formulaTexto: string): InterpretacaoFormulaDto {
  const texto = (formulaTexto ?? '').replace(/\s+/g, '');
  if (!texto) {
    return { valida: false, erro: 'Fórmula vazia.' };
  }
  if (/[()]/.test(texto)) {
    return { valida: false, erro: 'Parênteses ainda não são suportados.' };
  }
  const normalizada = /^[+-]/.test(texto) ? texto : `+${texto}`;
  const partes = normalizada.match(/[+-][^+-]*/g) ?? [];

  const dados: TermoDadoDto[] = [];
  const atributos: TermoAtributoDto[] = [];
  let constante = 0;

  for (const parte of partes) {
    const sinal: 1 | -1 = parte[0] === '-' ? -1 : 1;
    const corpo = parte.slice(1);
    if (!corpo) {
      return { valida: false, erro: `Termo vazio em "${parte}".` };
    }
    // Dado literal `NdM` (N opcional).
    const dado = corpo.match(/^(\d*)[dD](\d+)$/);
    if (dado) {
      const quantidade = dado[1] === '' ? 1 : parseInt(dado[1], 10);
      const faces = parseInt(dado[2], 10);
      if (quantidade < 1 || faces < 1) {
        return { valida: false, erro: `Dado inválido "${corpo}".` };
      }
      if (quantidade > QUANTIDADE_DADOS_MAXIMA) {
        return { valida: false, erro: `Máximo de ${QUANTIDADE_DADOS_MAXIMA} dados por termo.` };
      }
      dados.push({ sinal, quantidade, faces });
      continue;
    }

    // Atributo como fonte de dados `ATRdM` (ex.: `FORd6`, `lutad20`).
    const dadoAtributo = corpo.match(/^([A-Za-z]+)[dD](\d+)$/);
    if (dadoAtributo) {
      const atributoDado = resolverAtributo(dadoAtributo[1]);
      const faces = parseInt(dadoAtributo[2], 10);
      if (atributoDado) {
        if (faces < 1) {
          return { valida: false, erro: `Dado inválido "${corpo}".` };
        }
        dados.push({ sinal, quantidade: 1, quantidadeAtributo: atributoDado, faces });
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
            return { valida: false, erro: `Divisor inválido em "${corpo}".` };
          }
          atributos.push({ sinal, atributo: atributoEscalado, rotulo, divisor: fator });
        } else {
          atributos.push({ sinal, atributo: atributoEscalado, rotulo, multiplicador: fator });
        }
        continue;
      }
    }

    // Constante inteira.
    if (/^\d+$/.test(corpo)) {
      constante += sinal * parseInt(corpo, 10);
      continue;
    }

    // Atributo modificador (`+LUT`, `-forca`).
    const atributo = resolverAtributo(corpo);
    if (atributo) {
      atributos.push({ sinal, atributo, rotulo: corpo.toUpperCase() });
      continue;
    }
    return { valida: false, erro: `Termo desconhecido "${corpo}".` };
  }

  if (dados.length === 0 && atributos.length === 0 && constante === 0) {
    return { valida: false, erro: 'A fórmula não soma nada.' };
  }
  return { valida: true, formula: { dados, atributos, constante } };
}

/** `true` se a fórmula é interpretável. Espelha `interpretarFormula(...).valida`. */
export function validarFormula(formulaTexto: string): boolean {
  return interpretarFormula(formulaTexto).valida;
}

/**
 * Rola a fórmula com os atributos da ficha: rola cada termo de dado (via `rolarDado`), soma os
 * atributos e a constante e devolve o detalhamento + o total. Fórmula inválida devolve `null`
 * (a UI valida antes). Determinístico quando `rolarDado` é injetado (testes).
 */
export function rolarFormula(dto: RolagemDto, rolarDado: RolarDado = rolarDadoPadrao): ResultadoRolagemDto | null {
  const interpretacao = interpretarFormula(dto.formula);
  if (!interpretacao.valida || !interpretacao.formula) {
    return null;
  }
  const formula: FormulaInterpretadaDto = interpretacao.formula;

  const dados: DadosRoladosDto[] = formula.dados.map((termo) => {
    const quantidade = termo.quantidadeAtributo
      ? Math.max(0, Math.min(QUANTIDADE_DADOS_MAXIMA, dto.atributos[termo.quantidadeAtributo] ?? 0))
      : termo.quantidade;
    const valores = Array.from({ length: quantidade }, () => rolarDado(termo.faces));
    const soma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
    return { sinal: termo.sinal, faces: termo.faces, valores, subtotal: termo.sinal * soma };
  });

  const atributos = formula.atributos.map((termo) => {
    const base = dto.atributos[termo.atributo] ?? 0;
    const escalado = Math.floor((base * (termo.multiplicador ?? 1)) / (termo.divisor ?? 1));
    return { rotulo: termo.rotulo, valor: termo.sinal * escalado };
  });

  const totalDados = dados.reduce((acumulado, grupo) => acumulado + grupo.subtotal, 0);
  const totalAtributos = atributos.reduce((acumulado, atributo) => acumulado + atributo.valor, 0);
  const total = totalDados + totalAtributos + formula.constante;

  return { dados, atributos, constante: formula.constante, total };
}
