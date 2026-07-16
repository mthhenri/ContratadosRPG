import type { FichaAtributosDto } from '../../dtos/ficha';

/**
 * DTOs do motor de rolagem (m3-15): interpretação de uma fórmula de dados
 * (`NdM`, constantes e referências a atributo tipo `+LUT`) e o resultado de rolá-la.
 * Funções puras em `rolagem.ts` — a única brecha a `Math.random` é a função de rolagem
 * injetável (SYSTEM.SPEC §6.6). Fonte: docs/core/sistema-v4.1.0.md — "Atributos"/"Testes".
 */

// ── Fórmula interpretada ─────────────────────────────────────────────────────

/** Um termo de dado: `quantidade`D`faces`, com o sinal (+1 soma, −1 subtrai). */
export interface TermoDadoDto {
  readonly sinal: 1 | -1;
  readonly quantidade: number;
  /**
   * Atributo como **fonte de dados** (m3-16, ex.: `FORd6`): a contagem de dados é o valor deste
   * atributo no momento da rolagem — `quantidade` fica no default 1 e é ignorada.
   */
  readonly quantidadeAtributo?: keyof FichaAtributosDto;
  readonly faces: number;
}

/** Um termo de atributo: a chave resolvida na ficha + a abreviação original, com sinal. */
export interface TermoAtributoDto {
  readonly sinal: 1 | -1;
  readonly atributo: keyof FichaAtributosDto;
  /** Texto original da referência (ex.: `LUT`, `FOR*3`), para exibir no detalhamento. */
  readonly rotulo: string;
  /** `ATR*N` (m3-16): multiplica o valor do atributo. Default 1. */
  readonly multiplicador?: number;
  /** `ATR/N` (m3-16): divide o valor do atributo com piso (`Math.floor`). Default 1. */
  readonly divisor?: number;
}

/** Fórmula já interpretada: termos de dado, termos de atributo e a constante somada. */
export interface FormulaInterpretadaDto {
  readonly dados: readonly TermoDadoDto[];
  readonly atributos: readonly TermoAtributoDto[];
  readonly constante: number;
}

/** Saída de `interpretarFormula`: válida (com a fórmula) ou inválida (com o erro). */
export interface InterpretacaoFormulaDto {
  readonly valida: boolean;
  readonly formula?: FormulaInterpretadaDto;
  readonly erro?: string;
}

// ── Entrada e resultado da rolagem ───────────────────────────────────────────

/** Entrada de `rolarFormula`/`validarFormula`: a fórmula (texto) e os atributos da ficha. */
export interface RolagemDto {
  readonly formula: string;
  readonly atributos: FichaAtributosDto;
}

/** Dados rolados de um termo (ex.: `2D6` → `[4, 1]`), já com o sinal aplicado no subtotal. */
export interface DadosRoladosDto {
  readonly sinal: 1 | -1;
  readonly faces: number;
  readonly valores: readonly number[];
  /** Soma dos valores com o sinal do termo. */
  readonly subtotal: number;
}

/** Contribuição de um atributo na rolagem (valor já com sinal). */
export interface AtributoAplicadoDto {
  readonly rotulo: string;
  readonly valor: number;
}

/** Resultado de uma rolagem: grupos de dados, atributos aplicados, constante e o total. */
export interface ResultadoRolagemDto {
  readonly dados: readonly DadosRoladosDto[];
  readonly atributos: readonly AtributoAplicadoDto[];
  readonly constante: number;
  readonly total: number;
}
