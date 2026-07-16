import type { FichaAtributosDto, FichaHabilidadeDto, FichaRolagemDto } from '../../dtos/ficha';
import type { RolagemEfeitoAlvoEnum, RolagemEfeitoTipoEnum, RolagemModoEnum, TipoDanoEnum } from '../../enums';

/**
 * DTOs do motor de rolagem (m3-15; dano tipado m3-18): interpretação de uma fórmula de dados
 * (`NdM`, constantes, atributo `+LUT`, atributo-como-dado `FORd6`, escalonamento `FOR*3`) com
 * **tags de tipo de dano** `[Tipo]`/`[TipoA-TipoB]`, e o resultado de rolá-la agrupado por tipo.
 * Funções puras em `rolagem.ts` — a única brecha a `Math.random` é a função de rolagem injetável
 * (SYSTEM.SPEC §6.6). Fonte: docs/core/sistema-v4.1.0.md — "Atributos"/"Testes"/"Tipos de Dano".
 */

/** Par de tipos de um dano **Composto** (`[A-B]`): a soma do segmento é dividida 50/50 (resto → A). */
export type ParTipoDano = readonly [TipoDanoEnum, TipoDanoEnum];

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
  /** Tipo de dano do termo (m3-18), quando a fórmula usa tags `[Tipo]`. */
  readonly tipoDano?: TipoDanoEnum;
  /** Composto (m3-18): quando presente, `tipoDano` fica ausente e o termo entra no par 50/50. */
  readonly composto?: ParTipoDano;
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
  /** Tipo de dano do termo (m3-18). */
  readonly tipoDano?: TipoDanoEnum;
  /** Composto (m3-18). */
  readonly composto?: ParTipoDano;
}

/** Uma constante **tipada** (m3-18, ex.: `+4 [Físico]`). Constantes sem tag ficam em `constante`. */
export interface TermoConstanteDto {
  readonly sinal: 1 | -1;
  readonly valor: number;
  readonly tipoDano?: TipoDanoEnum;
  readonly composto?: ParTipoDano;
}

/** Fórmula já interpretada: termos de dado, termos de atributo e a constante somada. */
export interface FormulaInterpretadaDto {
  readonly dados: readonly TermoDadoDto[];
  readonly atributos: readonly TermoAtributoDto[];
  /** Soma das constantes **sem tag** (legado). Constantes tipadas ficam em `constantesTipadas`. */
  readonly constante: number;
  /** Constantes com tag de dano (m3-18); presente só quando a fórmula usa tags. */
  readonly constantesTipadas?: readonly TermoConstanteDto[];
}

/** Saída de `interpretarFormula`: válida (com a fórmula) ou inválida (com o erro). */
export interface InterpretacaoFormulaDto {
  readonly valida: boolean;
  readonly formula?: FormulaInterpretadaDto;
  readonly erro?: string;
}

// ── Entrada e resultado da rolagem ───────────────────────────────────────────

/** Entrada de `rolarFormula`/`validarFormula`: a fórmula (texto), os atributos e (opcional) o modo. */
export interface RolagemDto {
  readonly formula: string;
  readonly atributos: FichaAtributosDto;
  /** Modo do roll (m3-19). Ausente = `SOMA` (legado). */
  readonly modo?: RolagemModoEnum;
  /** Proficiência somada no modo `TESTE` (m3-19). `null`/ausente (Civil) = 0. */
  readonly proficiencia?: number | null;
}

/** Dados rolados de um termo (ex.: `2D6` → `[4, 1]`), já com o sinal aplicado no subtotal. */
export interface DadosRoladosDto {
  readonly sinal: 1 | -1;
  readonly faces: number;
  readonly valores: readonly number[];
  /** Soma dos valores com o sinal do termo. */
  readonly subtotal: number;
  /** Tipo de dano do termo (m3-18), para o detalhamento por tipo. */
  readonly tipoDano?: TipoDanoEnum;
  /** Composto (m3-18): o subtotal entra no par 50/50. */
  readonly composto?: ParTipoDano;
}

/** Contribuição de um atributo na rolagem (valor já com sinal). */
export interface AtributoAplicadoDto {
  readonly rotulo: string;
  readonly valor: number;
  /** Tipo de dano do termo (m3-18). */
  readonly tipoDano?: TipoDanoEnum;
  /** Composto (m3-18). */
  readonly composto?: ParTipoDano;
}

/** Total de dano de um tipo (m3-18). `composto` sinaliza que recebeu a divisão 50/50 de um Composto. */
export interface GrupoDanoDto {
  readonly tipoDano: TipoDanoEnum;
  readonly total: number;
  readonly composto?: boolean;
}

/** Detalhe de um roll no modo `TESTE` (m3-19): o pool de dados, o maior escolhido e o que somou. */
export interface ResultadoTesteDto {
  /** Todos os valores rolados (o pool de D20). */
  readonly pool: readonly number[];
  /** O maior dado do pool (0 se o pool for vazio — atributo ≤ 0). */
  readonly maiorDado: number;
  /** Os demais dados do pool (descartados). */
  readonly descartados: readonly number[];
  /** Proficiência somada (nível; 0 para Civil). */
  readonly proficiencia: number;
  /** Soma dos bônus planos (atributos-modificador + constantes). */
  readonly bonusPlano: number;
  /** `maiorDado + proficiencia + bonusPlano`. */
  readonly total: number;
}

/** Resultado de uma rolagem: dados rolados, atributos aplicados, constante, grupos por tipo e o total. */
export interface ResultadoRolagemDto {
  readonly dados: readonly DadosRoladosDto[];
  readonly atributos: readonly AtributoAplicadoDto[];
  readonly constante: number;
  /** Totais por tipo de dano (m3-18); presente só quando a fórmula usa tags `[Tipo]` (modo `SOMA`). */
  readonly grupos?: readonly GrupoDanoDto[];
  /** Detalhe do teste (m3-19); presente só no modo `TESTE`. Quando presente, `total` = `teste.total`. */
  readonly teste?: ResultadoTesteDto;
  readonly total: number;
}

// ── Efeitos de habilidade (m3-20) ────────────────────────────────────────────

/**
 * Efeito **mecânico** de uma habilidade num preset de rolagem (m3-20). Espelha `ModificacaoEfeitoDto`
 * (compras): `aplicarEfeitos` funde estes efeitos na fórmula interpretada de um passo. Ex.: Força
 * Bruta = `{ tipo: DANO_ATRIBUTO, atributo: 'forca', multiplicador: 3, tipoDano: Físico, alvo: DANO }`.
 */
export interface RolagemEfeitoDto {
  readonly tipo: RolagemEfeitoTipoEnum;
  /** Magnitude: dano fixo, quantidade de dados, passos de elevação, ou bônus de teste. */
  readonly valor?: number;
  /** Faces do dado em `DANO_DADOS`. */
  readonly faces?: number;
  /** Atributo em `DANO_ATRIBUTO`. */
  readonly atributo?: keyof FichaAtributosDto;
  /** Multiplicador do atributo em `DANO_ATRIBUTO` (default 1). */
  readonly multiplicador?: number;
  /** Tipo de dano dos efeitos de dano (default Físico). */
  readonly tipoDano?: TipoDanoEnum;
  /** `BONUS_TESTE`: `'DADO'` (soma D20 ao pool) ou `'FIXO'` (bônus plano). */
  readonly variante?: 'DADO' | 'FIXO';
  /** Onde o efeito se aplica; ausente = inferido do tipo (dano → `DANO`, bônus de teste → `TESTE`). */
  readonly alvo?: RolagemEfeitoAlvoEnum;
}

// ── Runner de preset encadeado (m3-21) ───────────────────────────────────────

/** Entrada de `resolverPreset`: o preset, os atributos da ficha e as habilidades para resolver os vínculos. */
export interface PresetResolverDto {
  readonly preset: FichaRolagemDto;
  readonly atributos: FichaAtributosDto;
  /** Proficiência para os passos de teste (m3-19). */
  readonly proficiencia?: number | null;
  /** Habilidades da ficha — usadas para resolver `preset.habilidades` (nomes) em efeitos + energia. */
  readonly habilidades?: readonly FichaHabilidadeDto[];
}

/** Um passo do preset já interpretado, com os efeitos das habilidades fundidos (m3-21). */
export interface PassoInterpretadoDto {
  readonly nome: string;
  readonly modo: RolagemModoEnum;
  /** Texto original da fórmula (para exibição). */
  readonly formula: string;
  readonly descricao?: string;
  /** Interpretação já com efeitos aplicados (inválida se a fórmula do passo não parseia). */
  readonly interpretacao: InterpretacaoFormulaDto;
}

/** Saída de `resolverPreset`: os passos prontos p/ rolar + a energia a gastar. Puro (não rola/debita). */
export interface PlanoPresetDto {
  /** Passos na ordem: primária primeiro, depois os `seguintes`. */
  readonly passos: readonly PassoInterpretadoDto[];
  /** Soma da Energia das habilidades vinculadas com custo fixo (o front debita via `ajusteVitalidade`). */
  readonly energiaGasta: number;
  /** `true` se alguma habilidade vinculada tem custo variável (`[X E]`) — o front pergunta quanto. */
  readonly energiaVariavel: boolean;
  /** Nomes das habilidades efetivamente resolvidas na ficha. */
  readonly habilidadesVinculadas: readonly string[];
}
