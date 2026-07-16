import type { FichaAtributosDto, FichaHabilidadeDto, FichaRolagemDto } from '../../dtos/ficha';
import type { RolagemEfeitoAlvoEnum, RolagemEfeitoTipoEnum, TipoDanoEnum } from '../../enums';

/**
 * DTOs do motor de rolagem (m3-15; dano tipado m3-18; gramática v3 m3-29): interpretação de uma fórmula
 * de dados (`NdM`, constantes, atributo `+LUT`, atributo-como-dado `FORd6`, escalonamento `FOR*3`) com
 * operadores **por pool** — manter maior/menor (`kh`/`kl`), margem de crítico (`cm`), explosão (`!`) e
 * implosão (`?`) — e **tags de tipo de dano** `[Tipo]`/`[TipoA-TipoB]`, e o resultado de rolá-la
 * agrupado por tipo. Não há mais "modo": um teste é a expressão explícita `LUTd20kh1 + PROF` (m3-29).
 * Funções puras em `rolagem.ts` — a única brecha a `Math.random` é a função de rolagem injetável
 * (SYSTEM.SPEC §6.6). Fonte: docs/core/sistema-v4.1.0.md — "Atributos"/"Testes"/"Tipos de Dano".
 */

/** Par de tipos de um dano **Composto** (`[A-B]`): a soma do segmento é dividida 50/50 (resto → A). */
export type ParTipoDano = readonly [TipoDanoEnum, TipoDanoEnum];

/**
 * Fonte de um valor escalar numa fórmula (m3-22): um dos 10 atributos **ou** a **Proficiência**
 * (`PROF`) **ou** o **Nível** (`NIV`) do agente. Todas se usam igual — modificador (`+PROF`), fonte de
 * dados (`PROFd6`) ou escalada (`NIV*2`). Proficiência/Nível vêm como escalares no `rolarFormula`
 * (`proficiencia`/`nivel`), fora do `FichaAtributosDto`. Fonte: docs/core/sistema-v4.1.0.md — "Testes".
 */
export type FonteEscalar = keyof FichaAtributosDto | 'proficiencia' | 'nivel';

// ── Fórmula interpretada ─────────────────────────────────────────────────────

/** Um termo de dado: `quantidade`D`faces`, com o sinal (+1 soma, −1 subtrai), e operadores por pool (m3-29). */
export interface TermoDadoDto {
  readonly sinal: 1 | -1;
  readonly quantidade: number;
  /**
   * Fonte escalar como **fonte de dados** (m3-16; m3-22 aceita Proficiência/Nível, ex.: `FORd6`,
   * `PROFd6`): a contagem de dados é o valor desta fonte no momento da rolagem — `quantidade` fica no
   * default 1 e é ignorada.
   */
  readonly quantidadeAtributo?: FonteEscalar;
  readonly faces: number;
  /** `khN` (m3-29): mantém os N **maiores** do pool; subtotal = soma dos mantidos. */
  readonly manterMaior?: number;
  /** `klN` (m3-29): mantém os N **menores** do pool. */
  readonly manterMenor?: number;
  /** `cmN` (m3-29): margem de crítico — limiar = `faces − N + 1`; conta os mantidos ≥ limiar (informativo). */
  readonly margemCritico?: number;
  /** `!`/`!>=N` (m3-29, não-canônico): explode ao rolar um valor ≥ este limiar (bare `!` = `faces`). */
  readonly explosao?: number;
  /** `?`/`?<=N` (m3-29, não-canônico): implode ao rolar um valor ≤ este limiar (bare `?` = 1). */
  readonly implosao?: number;
  /** Dados extras somados ao pool **antes** do keep (efeito `BONUS_TESTE` variante `DADO`; m3-29). */
  readonly bonusDados?: number;
  /** Tipo de dano do termo (m3-18), quando a fórmula usa tags `[Tipo]`. */
  readonly tipoDano?: TipoDanoEnum;
  /** Composto (m3-18): quando presente, `tipoDano` fica ausente e o termo entra no par 50/50. */
  readonly composto?: ParTipoDano;
}

/** Um termo de fonte escalar (atributo/Proficiência/Nível): a fonte resolvida + o rótulo original, com sinal. */
export interface TermoAtributoDto {
  readonly sinal: 1 | -1;
  /** Atributo, Proficiência (`proficiencia`) ou Nível (`nivel`) — resolvido no `rolarFormula` (m3-22). */
  readonly atributo: FonteEscalar;
  /** Texto original da referência (ex.: `LUT`, `FOR*3`, `PROF`), para exibir no detalhamento. */
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

/** Entrada de `rolarFormula`/`validarFormula`: a fórmula (texto), os atributos e as fontes escalares. */
export interface RolagemDto {
  readonly formula: string;
  readonly atributos: FichaAtributosDto;
  /** Proficiência resolvida pela fonte `PROF` nas fórmulas (m3-22; explícita como `+PROF` desde m3-29). `null`/ausente = 0. */
  readonly proficiencia?: number | null;
  /** Nível do agente — resolvido pela fonte `NIV` nas fórmulas (m3-22). Ausente = 0. */
  readonly nivel?: number;
}

/** Dados rolados de um termo (ex.: `2D6` → `[4, 1]`), já com o sinal aplicado no subtotal. */
export interface DadosRoladosDto {
  readonly sinal: 1 | -1;
  readonly faces: number;
  /** Todos os valores rolados, **incluindo** os explodidos/imploididos (m3-29). */
  readonly valores: readonly number[];
  /** Soma dos **mantidos** com o sinal do termo (sem keep, soma o pool todo). */
  readonly subtotal: number;
  /** Dados mantidos após `kh`/`kl` (m3-29); ausente quando não há keep (subtotal = pool todo). */
  readonly mantidos?: readonly number[];
  /** Dados descartados pelo `kh`/`kl` (m3-29); ausente quando não há keep. */
  readonly descartados?: readonly number[];
  /** Quantos dados **mantidos** atingiram a margem de crítico `cm` (m3-29); ausente sem `cm`. */
  readonly criticos?: number;
  /** `true` quando a desvantagem intrínseca disparou (atributo ≤ 0 num pool de teste; m3-29, regra 270). */
  readonly desvantagem?: boolean;
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

/** Resultado de uma rolagem: dados rolados, atributos aplicados, constante, grupos por tipo e o total. */
export interface ResultadoRolagemDto {
  readonly dados: readonly DadosRoladosDto[];
  readonly atributos: readonly AtributoAplicadoDto[];
  readonly constante: number;
  /** Totais por tipo de dano (m3-18); presente só quando a fórmula usa tags `[Tipo]`. */
  readonly grupos?: readonly GrupoDanoDto[];
  readonly total: number;
  /** `true` quando foi uma **rolagem de crítico** (m3-30): dados/fixos/atributos dobrados (exceto PROF/NIV). */
  readonly critico?: boolean;
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
  /** Atributo em `DANO_ATRIBUTO` **ou** em `BONUS_TESTE` variante `'ATRIBUTO'` (soma o atributo ao teste). */
  readonly atributo?: keyof FichaAtributosDto;
  /** Multiplicador do atributo em `DANO_ATRIBUTO` / `BONUS_TESTE` `'ATRIBUTO'` (default 1). */
  readonly multiplicador?: number;
  /** Tipo de dano dos efeitos de dano (default Físico). Ignorado por `DANO_DADOS_ARMA` (herda o do dado espelhado). */
  readonly tipoDano?: TipoDanoEnum;
  /**
   * `BONUS_TESTE`: `'DADO'` (soma D20 ao pool = vantagem), `'FIXO'` (bônus plano) ou `'ATRIBUTO'` (soma
   * `atributo × multiplicador` ao resultado do teste — ex.: Atirador Calculista soma a Pontaria).
   */
  readonly variante?: 'DADO' | 'FIXO' | 'ATRIBUTO';
  /** Onde o efeito se aplica; ausente = inferido do tipo (dano → `DANO`, bônus de teste → `TESTE`). */
  readonly alvo?: RolagemEfeitoAlvoEnum;
}

// ── Runner de preset encadeado (m3-21) ───────────────────────────────────────

/** Entrada de `resolverPreset`: o preset, os atributos da ficha e as habilidades para resolver os vínculos. */
export interface PresetResolverDto {
  readonly preset: FichaRolagemDto;
  readonly atributos: FichaAtributosDto;
  /** Proficiência resolvida pela fonte `PROF` nas fórmulas dos passos (m3-29). */
  readonly proficiencia?: number | null;
  /** Habilidades da ficha — usadas para resolver `preset.habilidades` (nomes) em efeitos + energia. */
  readonly habilidades?: readonly FichaHabilidadeDto[];
}

/** Um passo do preset já interpretado, com os efeitos das habilidades **deste passo** fundidos (m3-21; m3-22). */
export interface PassoInterpretadoDto {
  readonly nome: string;
  /** Texto original da fórmula (para exibição). */
  readonly formula: string;
  readonly descricao?: string;
  /** Interpretação já com efeitos aplicados (inválida se a fórmula do passo não parseia). */
  readonly interpretacao: InterpretacaoFormulaDto;
  /** Energia a gastar ao rolar **este passo** (soma dos custos fixos das habilidades dele; m3-22). */
  readonly energiaGasta: number;
  /** `true` se alguma habilidade **deste passo** tem custo variável (`[X E]`) — o front pergunta quanto. */
  readonly energiaVariavel: boolean;
  /** Nomes das habilidades da ficha vinculadas **a este passo** (m3-22). */
  readonly habilidadesVinculadas: readonly string[];
  /** `true` se o passo é **critável** (m3-30): a UI oferece "Rolar crítico" (dobra o dano). */
  readonly critico: boolean;
}

/** Saída de `resolverPreset`: os passos prontos p/ rolar + os **agregados** de energia (m3-22 debita por passo). Puro. */
export interface PlanoPresetDto {
  /** Passos na ordem: primária primeiro, depois os `seguintes`. Cada um carrega a sua energia/habilidades. */
  readonly passos: readonly PassoInterpretadoDto[];
  /** **Total** da Energia fixa de todas as habilidades vinculadas (soma dos passos) — resumo do preset. */
  readonly energiaGasta: number;
  /** `true` se **algum** passo tem habilidade de custo variável (`[X E]`). */
  readonly energiaVariavel: boolean;
  /** Nomes de **todas** as habilidades vinculadas (de todos os passos), para o resumo do preset. */
  readonly habilidadesVinculadas: readonly string[];
}
