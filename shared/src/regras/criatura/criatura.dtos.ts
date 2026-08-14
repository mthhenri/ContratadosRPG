import type {
  CustoAcaoEnum,
  ModificadorCriaturaEnum,
  RegeneracaoIntensidadeEnum,
  RegeneracaoModoEnum,
  TenacidadeEnum,
  TipoDanoEnum,
} from '../../enums';
import type { FichaAtributosDto } from '../../dtos/ficha';

/**
 * DTOs de entrada e saída das fórmulas de criatura (`regras/criatura`, m4-02). Mesma
 * convenção de `regras/agente/agente.dtos.ts`: funções puras recebem sempre um DTO tipado,
 * nunca uma cascata de primitivos soltos.
 *
 * Fonte das fórmulas: docs/core/guia_de_mestre-v4.0.0.md — "Guia de Criação de Ameaças". Em
 * conflito com o código, o documento vence (proibição #27) — mas quando o próprio documento
 * se contradiz entre a fórmula geral de uma seção e um número do exemplo "A Estátua", a
 * fórmula geral vence (ela é a regra reutilizável; o exemplo é uma aplicação pontual, mais
 * sujeita a erro de transcrição). Duas divergências identificadas estão documentadas em
 * `modificadores.ts` e `a-estatua.spec.ts`.
 */

// ── Atributos ────────────────────────────────────────────────────────────────

export interface BaseLimiteAtributosObterDto {
  readonly vd: number;
}

export interface BaseLimiteAtributosDto {
  readonly base: number;
  readonly limite: number;
  readonly pontosAjuste: number;
}

/** Entrada de `validarRealocacaoAtributos`: os dez atributos finais (Base + Pontos de Ajuste
 * + Realocação) contra o Limite da faixa de VD. */
export interface RealocacaoAtributosValidarDto {
  readonly atributosFinal: FichaAtributosDto;
  readonly limite: number;
}

// ── Modificadores ────────────────────────────────────────────────────────────

export interface ValorModificadorCalcularDto {
  readonly tipo: ModificadorCriaturaEnum;
  readonly vd: number;
}

export interface AtributoEfetivoCalcularDto {
  readonly atributoFinal: number;
  readonly modificador: ModificadorCriaturaEnum;
  readonly vd: number;
}

// ── Saúde ────────────────────────────────────────────────────────────────────

export interface VidaMaximaCalcularDto {
  readonly vd: number;
  readonly tenacidade: TenacidadeEnum;
}

// ── Defesa ───────────────────────────────────────────────────────────────────

export interface DefesaBaseCalcularDto {
  readonly vd: number;
}

// ── Resistências e Fraquezas ─────────────────────────────────────────────────

export interface LimiteResistenciasCalcularDto {
  readonly vd: number;
  /** Fraquezas declaradas além da 1ª — cada uma soma 25% ao Limite. */
  readonly quantidadeFraquezasExtras: number;
}

export interface CustoResistenciaCalcularDto {
  readonly valor: number;
  readonly tipo: TipoDanoEnum;
  /** `true` quando `valor` é de um subtipo específico (ex.: "Físico Cortante"), não do tipo amplo. */
  readonly ehSubtipo: boolean;
}

export interface FraquezaValidarDto {
  readonly valor: number;
  /** Soma dos `valor` de todas as resistências declaradas da criatura. */
  readonly somaResistencias: number;
}

// ── Regeneração ──────────────────────────────────────────────────────────────

export interface ValorRegeneracaoCalcularDto {
  readonly vidaMaxima: number;
  readonly intensidade: RegeneracaoIntensidadeEnum;
  readonly modo: RegeneracaoModoEnum;
}

// ── Deslocamento ─────────────────────────────────────────────────────────────

export interface DeslocamentoTerrestreSugerirDto {
  readonly destreza: number;
}

/** Faixa sugerida — nunca um valor único, porque o guia tabula uma faixa (ex.: "10–12m") e
 * escolher um ponto fixo dentro dela seria uma decisão arbitrária que não é do motor. */
export interface DeslocamentoSugeridoDto {
  readonly minimo: number;
  readonly maximo: number;
}

// ── Cadência / Iniciativa ────────────────────────────────────────────────────

export interface BonusIniciativaSugerirDto {
  readonly vd: number;
}

// ── Ataques ──────────────────────────────────────────────────────────────────

export interface DanoReferenciaObterDto {
  readonly vd: number;
  readonly custoAcao: CustoAcaoEnum;
}

export interface DanoReferenciaTurnoObterDto {
  readonly vd: number;
}

// ── Validação de coerência ───────────────────────────────────────────────────

export interface FichaCriaturaValidadaDto {
  readonly violacoes: readonly string[];
}
