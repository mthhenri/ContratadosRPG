import { LivroMudancaSituacaoEnum, LivroTextoOperacaoEnum } from "../../enums/livro-comparacao.enum";
import { TipoRegraPecaEnum } from "../../enums/tipo-regra-peca.enum";

/**
 * Valor JSON de um campo de `dados` (antes/depois de uma alteração). `unknown` de propósito: o gerador
 * de contratos OpenAPI não resolve tipos recursivos, e o consumidor só exibe o valor.
 */
export type LivroValorJsonDto = unknown;

/**
 * Trecho do diff por palavras de um texto rico. As marcações (`negrito`, `italico`, `link-interno`,
 * `link-externo`, `nivel-ameaca`) vêm em `marcasAntes`/`marcasDepois` só quando a operação é
 * `FORMATACAO` (mesma palavra, marcação diferente).
 */
export interface LivroTextoDiffDto {
  readonly operacao: LivroTextoOperacaoEnum;
  readonly texto: string;
  readonly marcasAntes?: readonly string[];
  readonly marcasDepois?: readonly string[];
}

/** Um campo de `dados` que mudou; `campo` é o caminho dentro de `dados` (ex.: `linhas.2.0`). */
export interface LivroCampoAlteradoDto {
  readonly campo: string;
  /** `null` quando o campo não existia antes (ou deixou de existir depois). */
  readonly antes: LivroValorJsonDto;
  readonly depois: LivroValorJsonDto;
  /** Presente quando o campo é um texto rico: o diff por palavras. */
  readonly texto?: readonly LivroTextoDiffDto[];
}

/** Onde a peça estava e onde está (para `MOVIDA`). `paiAntes`/`paiDepois` são identificadores. */
export interface LivroPosicaoMudancaDto {
  readonly paiAntes: string | null;
  readonly paiDepois: string | null;
  readonly ordemAntes: number;
  readonly ordemDepois: number;
}

/**
 * Uma mudança de uma peça. Uma peça alterada e movida ao mesmo tempo gera duas mudanças com o mesmo
 * `identificador` (`ALTERADA` e `MOVIDA`). `campos` só existe em `ALTERADA` e `posicao` só em `MOVIDA`.
 */
export interface LivroMudancaDto {
  readonly identificador: string;
  readonly tipo: TipoRegraPecaEnum;
  /** Títulos das peças ancestrais até a peça (a própria incluída); da versão atual, exceto `REMOVIDA`. */
  readonly caminho: readonly string[];
  readonly situacao: LivroMudancaSituacaoEnum;
  readonly campos?: readonly LivroCampoAlteradoDto[];
  readonly posicao?: LivroPosicaoMudancaDto;
}

/** Contagens agregadas, para o diálogo de publicação e o contador da Oficina. */
export interface LivroComparacaoResumoDto {
  readonly total: number;
  readonly porSituacao: Readonly<Record<LivroMudancaSituacaoEnum, number>>;
  readonly porTipo: Readonly<Partial<Record<TipoRegraPecaEnum, number>>>;
}

/** Resultado de `compararLivros`: as mudanças em ordem estável e o resumo. */
export interface LivroComparacaoDto {
  readonly mudancas: readonly LivroMudancaDto[];
  readonly resumo: LivroComparacaoResumoDto;
}
