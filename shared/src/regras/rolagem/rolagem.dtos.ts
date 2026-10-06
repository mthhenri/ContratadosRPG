import type { FichaAtributosDto, FichaHabilidadeDto, FichaRolagemDto } from '../../dtos/ficha';
import type { TipoDanoEnum } from '../../enums';
import type { AmplificadorAplicadoDto } from '../compras';

/**
 * DTOs do motor de rolagem (m3-15; dano tipado m3-18; gramática v3 m3-29; **gramática v4 m3-46**):
 * interpretação de uma fórmula de dados (`NdM`, constantes, atributo `+LUT`, atributo-como-dado `FORd6`,
 * escalonamento `FOR*3`) com operadores **por pool** — manter maior/menor (`kh`/`kl`), margem de crítico
 * (`cm`), explosão (`!`) e implosão (`?`) — **tags de tipo de dano** `[Tipo]`/`[TipoA-TipoB]`, e desde a
 * v4: **atributo+valor como quantidade de dados** `(ATR±n)dM` e **repetição** `(<fórmula>)#N`. Não há
 * mais "modo": um teste é a expressão explícita `LUTd20kh1 + PROF` (m3-29). Funções puras em
 * `rolagem.ts` — a única brecha a `Math.random` é a função de rolagem injetável (SYSTEM.SPEC §6.6).
 * Fonte: docs/core/sistema-v4.1.3.md — "Atributos"/"Testes"/"Tipos de Dano".
 */

/** Par de tipos de um dano **Composto** (`[A-B]`): a soma do segmento é dividida 50/50 (resto → A). */
export type ParTipoDano = readonly [TipoDanoEnum, TipoDanoEnum];

/**
 * Fonte de um valor escalar numa fórmula (m3-22): um dos 10 atributos **ou** a **Proficiência**
 * (`PROF`) **ou** o **Nível** (`NIV`) do agente. Todas se usam igual — modificador (`+PROF`), fonte de
 * dados (`PROFd6`) ou escalada (`NIV*2`). Proficiência/Nível vêm como escalares no `rolarFormula`
 * (`proficiencia`/`nivel`), fora do `FichaAtributosDto`. Fonte: docs/core/sistema-v4.1.3.md — "Testes".
 */
export type FonteEscalar = keyof FichaAtributosDto | 'proficiencia' | 'nivel';

// ── Conta (I-041) ────────────────────────────────────────────────────────────

/** Operadores binários de uma conta (`+ − × ÷`; só ASCII `* /` na notação). */
export type OperadorConta = '+' | '-' | '*' | '/';

/**
 * Nó da árvore de uma conta: um número inteiro, uma fonte escalar (atributo/`PROF`/`NIV`, resolvida na
 * rolagem), um **dado** `NdM` (só na quantidade de dados, `(1d6)d20`; rolado antes da conta, vale a soma), a
 * negação de um nó (`-FOR` no início de um grupo) ou uma operação binária.
 */
export type NoContaDto =
  | { readonly numero: number }
  | { readonly fonte: FonteEscalar }
  | { readonly quantidade: number; readonly faces: number }
  | { readonly negar: NoContaDto }
  | { readonly operador: OperadorConta; readonly esquerda: NoContaDto; readonly direita: NoContaDto };

/**
 * Conta aritmética já lida (value object): `+ − × ÷` e parênteses sobre números e fontes escalares, ex.:
 * `(FOR+VIG)*2`. Avaliada na rolagem com frações exatas e **arredondada para baixo uma única vez, no fim**
 * (docs/core/sistema-v4.1.3.md, “Arredondamentos”). Serve à quantidade de dados (`quantidadeConta`) e ao bônus
 * fixo (`TermoContaDto`).
 */
export interface ContaDto {
  readonly raiz: NoContaDto;
}

/** Saída de `analisarConta`: a conta lida **ou** o erro (nunca os dois). */
export type AnaliseContaDto =
  | { readonly conta: ContaDto; readonly erro?: undefined }
  | { readonly conta?: undefined; readonly erro: string };

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
  /**
   * `(ATR±n)dM` (m3-46): deslocamento somado ao valor da fonte antes de virar contagem de dados, ex.:
   * `(LUT+3)d20` = (Luta + 3) dados de 20. Presente só nessa forma — distinto de `ATRdM` (sem offset),
   * que mantém a desvantagem intrínseca (regra 270); `(ATR±n)dM` não tem essa desvantagem.
   */
  readonly quantidadeAtributoOffset?: number;
  /**
   * `(<conta>)dM` (I-041): a quantidade de dados é o **piso** da conta no momento da rolagem, ex.:
   * `((INT+SOC)/2)d20kh1`, `((FOR+VIG)*2)d4` — `quantidade` fica em 1 e é ignorada. Em pool de teste
   * (`kh`) com resultado ≤ 0 vale a regra de atributo zerado (2+|n| dados, mantém o menor); sem `kh` a
   * quantidade trava em 0. As formas `(ATR±n)dM`/`(ATR*Y)dM` seguem nos campos acima, sem mudança. A conta
   * pode ter dados (`(1d6)d20`, `(1d4+FOR)d6`): eles são rolados primeiro e entram na conta pela soma.
   */
  readonly quantidadeConta?: ContaDto;
  readonly faces: number;
  /** `khN` (m3-29): mantém os N **maiores** do pool; subtotal = soma dos mantidos. */
  readonly manterMaior?: number;
  /** `klN` (m3-29): mantém os N **menores** do pool. */
  readonly manterMenor?: number;
  /** `cmN`: limiar = `faces − N + 1`; conta mantidos ≥ limiar. Em teste, concede +2 uma vez; em pools genéricos, informativo. */
  readonly margemCritico?: number;
  /** `!`/`!>=N` (m3-29, não-canônico): explode ao rolar um valor ≥ este limiar (bare `!` = `faces`). */
  readonly explosao?: number;
  /** `?`/`?<=N` (m3-29, não-canônico): implode ao rolar um valor ≤ este limiar (bare `?` = 1). */
  readonly implosao?: number;
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

/**
 * Um termo de **bônus fixo por conta** (I-041), ex.: `(FOR+VIG)*2`, `FOR*VIG`, `2*(LUT+PROF)`: o valor é o piso
 * da conta, somado com o `sinal` e listado em `atributos` do resultado (`rotulo` + `valor`). No crítico, vale o
 * valor da conta mais o valor dela com `PROF`/`NIV` zerados (só o que vem de atributos e de números dobra).
 */
export interface TermoContaDto {
  readonly sinal: 1 | -1;
  readonly conta: ContaDto;
  /** Texto original da conta, para o detalhamento (ex.: `(FOR+VIG)*2`). */
  readonly rotulo: string;
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
  /** Bônus fixos por conta (I-041, `(FOR+VIG)*2`); presente só quando a fórmula usa uma conta de bônus. */
  readonly contas?: readonly TermoContaDto[];
  /**
   * `(<fórmula>)#N` (m3-46): repete a fórmula inteira N vezes independentes. Ausente/1 = sem repetição.
   * Definido só quando os parênteses envolvem a fórmula **inteira** — sem aninhamento.
   */
  readonly repeticoes?: number;
}

/** Saída de `interpretarFormula`: válida (com a fórmula) ou inválida (com o erro). */
export interface InterpretacaoFormulaDto {
  readonly valida: boolean;
  readonly formula?: FormulaInterpretadaDto;
  readonly erro?: string;
}

// ── Fórmula em peças (montador-exp-01) ────────────────────────────────────────

/**
 * Quantidade de dados de uma peça de dado: um número (`2d6`), uma fonte escalar como fonte de dados (`LUTd20`)
 * ou uma **conta** entre parênteses (`(PON+1)d20`, `((INT+SOC)/2)d20`, `(FOR*2)d6`) — `texto` é o miolo da
 * conta, sem os parênteses externos, em maiúsculas e sem espaços.
 */
export type PecaDadoQuantidadeDto =
  | { readonly tipo: 'NUMERO'; readonly valor: number }
  | { readonly tipo: 'FONTE'; readonly fonte: FonteEscalar; readonly nome: string }
  | { readonly tipo: 'CONTA'; readonly texto: string };

/** Peça de dado: quantidade, faces, operadores por pool (m3-29) e a tag de tipo de dano do segmento. */
export interface PecaDadoDto {
  readonly tipo: 'DADO';
  readonly sinal: 1 | -1;
  readonly quantidade: PecaDadoQuantidadeDto;
  readonly faces: number;
  readonly manterMaior?: number;
  readonly manterMenor?: number;
  readonly margemCritico?: number;
  /** Limiar de explosão (`!` = `faces`). */
  readonly explosao?: number;
  /** Limiar de implosão (`?` = 1). */
  readonly implosao?: number;
  readonly tipoDano?: TipoDanoEnum;
  readonly composto?: ParTipoDano;
}

/**
 * Peça de fonte escalar somada como modificador (`+LUT`, `+PROF`) ou escalada (`FOR*3`, `LUT/2`). `nome` é
 * como a fonte foi escrita, em maiúsculas (`LUT`, `LUTA`, `PROF`) — é o rótulo que o motor mostra.
 */
export interface PecaFonteDto {
  readonly tipo: 'FONTE';
  readonly sinal: 1 | -1;
  readonly fonte: FonteEscalar;
  readonly nome: string;
  readonly multiplicador?: number;
  readonly divisor?: number;
  readonly tipoDano?: TipoDanoEnum;
  readonly composto?: ParTipoDano;
}

/** Peça de número fixo (`+3`, `+36 [B]`). `valor` é sempre ≥ 0; o sentido vem do `sinal`. */
export interface PecaNumeroDto {
  readonly tipo: 'NUMERO';
  readonly sinal: 1 | -1;
  readonly valor: number;
  readonly tipoDano?: TipoDanoEnum;
  readonly composto?: ParTipoDano;
}

/**
 * Peça de **bônus fixo por conta** (I-041): `(FOR+VIG)*2`, `FOR*VIG`, `(FOR/2+VIG/2)`. `texto` é a conta como
 * escrita, em maiúsculas e sem espaços, com os parênteses que tiver.
 */
export interface PecaContaDto {
  readonly tipo: 'CONTA';
  readonly sinal: 1 | -1;
  readonly texto: string;
  readonly tipoDano?: TipoDanoEnum;
  readonly composto?: ParTipoDano;
}

/**
 * Peça de **atalho** do agente (`CORPO`/`FURTIVO`, m3-27-visual), expandido por `expandirAtalhosDano` antes do
 * motor. Não carrega tag: a expressão expandida traz a sua (`2D6 [Físico]`) ou nenhuma (`2D6+2`).
 */
export interface PecaAtalhoDto {
  readonly tipo: 'ATALHO';
  readonly sinal: 1 | -1;
  readonly atalho: 'CORPO' | 'FURTIVO';
}

/** Uma peça da fórmula, na ordem em que aparece no texto. */
export type PecaFormulaDto = PecaDadoDto | PecaFonteDto | PecaNumeroDto | PecaContaDto | PecaAtalhoDto;

/**
 * Fórmula lida como **lista ordenada de peças** (montador-exp-01) — o que o montador de rolagem edita. A tag de
 * tipo de cada peça é a do segmento em que ela foi escrita; peça sem tag numa fórmula tipada vale Físico (regra do
 * motor). `repeticoes` é o envelope `(<fórmula>)#N` (ausente = sem repetição).
 */
export interface FormulaTokenizadaDto {
  readonly pecas: readonly PecaFormulaDto[];
  readonly repeticoes?: number;
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
  /** Crítico: em teste, +2 uma vez; em resultado de dados, dobra dados/fixos/atributos (exceto PROF/NIV). Ausente = `false`. */
  readonly critico?: boolean;
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
  /** Quantos mantidos atingiram a margem. Testes têm margem natural 1; pools genéricos só contam com `cm`. */
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
  /**
   * Sub-resultados de uma repetição `(<fórmula>)#N` (m3-46): N rolagens **independentes** da mesma
   * fórmula, presente só quando N ≥ 2. Inclui a própria rolagem como o 1º elemento — os campos de
   * nível superior (`dados`/`total`/…) espelham essa 1ª rolagem por compatibilidade, mas quem exibe o
   * resultado deve iterar `subResultados` para mostrar as N rolagens separadamente.
   */
  readonly subResultados?: readonly ResultadoRolagemDto[];
}

// ── Runner de preset encadeado (m3-21) ───────────────────────────────────────

/** Entrada de `resolverPreset`: o preset, os atributos da ficha e as habilidades para resolver os vínculos. */
export interface PresetResolverDto {
  readonly preset: FichaRolagemDto;
  readonly atributos: FichaAtributosDto;
  /** Proficiência resolvida pela fonte `PROF` nas fórmulas dos passos (m3-29). */
  readonly proficiencia?: number | null;
  /** Habilidades da ficha — usadas para resolver `preset.habilidades` (nomes) em Energia (m3-31). */
  readonly habilidades?: readonly FichaHabilidadeDto[];
  /** Amplificadores do inventário — o desconto de `Conservador` reduz o custo de Energia de cada habilidade. */
  readonly amplificadores?: readonly AmplificadorAplicadoDto[];
}

/** Um passo do preset já interpretado (m3-21; m3-22). As habilidades **só** contam Energia (efeitos aposentados em m3-31). */
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
