import { MotivoEntradaAgenteEnum } from '../../enums';
import { PatenteDados } from '../dados';

/**
 * DTOs de entrada e value-objects de saída das fórmulas de novo agente
 * (`regras/novo-agente`, m1-03). "Dados tipados" do motor de regras (SYSTEM.SPEC
 * §6.6): funções puras recebem sempre um DTO tipado. Entradas seguem
 * `<Conceito>CalcularDto` (verbo no infinitivo); saídas são recortes computados
 * (value-objects sem verbo).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Iniciando um Novo Agente". Em conflito
 * com o código, o documento vence (proibição #27).
 */

// ── Entradas ────────────────────────────────────────────────────────────────

/** Entrada de `calcularNivelInicial`: média de Nível do esquadrão (excluindo quem sai). */
export interface NivelInicialCalcularDto {
  readonly mediaNivel: number;
}

/** Entrada de `calcularPrestigioInicial`: motivo de entrada + média de Prestígio do esquadrão. */
export interface PrestigioInicialCalcularDto {
  readonly motivo: MotivoEntradaAgenteEnum;
  readonly mediaPrestigio: number;
}

/** Entrada de `calcularBonusMonetario`: Prestígio inicial já calculado. */
export interface BonusMonetarioCalcularDto {
  readonly prestigioInicial: number;
}

/** Entrada de `calcularDinheiroInicial`: a soma já rolada de 4D4. */
export interface DinheiroInicialCalcularDto {
  /** Soma dos 4 dados de 4 faces já rolados (mín. 4, máx. 16). */
  readonly somaDados: number;
}

/** Entrada de `calcularNovoAgente`: motivo + médias de Nível e Prestígio do esquadrão. */
export interface NovoAgenteCalcularDto {
  readonly motivo: MotivoEntradaAgenteEnum;
  readonly mediaNivel: number;
  readonly mediaPrestigio: number;
}

// ── Saídas (recortes computados / value-objects) ────────────────────────────

/**
 * Prestígio inicial e o detalhamento do cálculo. `prestigioInicial` é
 * `⌊média − ⌊média ÷ divisor⌋⌋`, limitado ao mínimo de `patenteCapMinimo`.
 * `patenteGrupo` é a patente da média do grupo; `patenteCapMinimo` é o piso
 * aplicado — igual à patente do grupo, ou a imediatamente inferior quando o
 * motivo permite iniciar uma patente abaixo (Experimento / Contido ou
 * Exterminado). Quando `patenteGrupo` e `patenteCapMinimo` diferem, o piso foi
 * rebaixado uma patente.
 */
export interface PrestigioInicialDto {
  readonly prestigioInicial: number;
  readonly divisor: number;
  readonly deducao: number;
  readonly patenteGrupo: PatenteDados;
  readonly patenteCapMinimo: PatenteDados;
}

/**
 * Bônus monetário do novo agente: `Prestígio Inicial × (500 × Multiplicador da
 * Patente)`. `patente` é a patente do Prestígio inicial (fonte do multiplicador).
 * Não inclui o dinheiro inicial padrão (1000 + 4D4 × 250), que é aleatório e
 * calculado à parte.
 */
export interface BonusMonetarioDto {
  readonly bonus: number;
  readonly patente: PatenteDados;
}

/**
 * Dinheiro inicial de um novo agente: `1000 + (soma de 4D4) × 250`. `somaDados` é devolvida
 * junto para exibição do detalhamento (ex.: "4D4 = 11 → $3.750").
 */
export interface DinheiroInicialDto {
  readonly dinheiro: number;
  readonly somaDados: number;
}

/**
 * Resultado completo da aba novo agente. `patenteResultante` é a patente do
 * Prestígio inicial. `recebeAmaldicoadoPeloPassado` é verdadeiro apenas para os
 * motivos de Contenção ou Extermínio (doc — "Contido ou Exterminado").
 */
export interface NovoAgenteDto {
  readonly nivelInicial: number;
  readonly prestigio: PrestigioInicialDto;
  readonly patenteResultante: PatenteDados;
  readonly bonus: BonusMonetarioDto;
  readonly recebeAmaldicoadoPeloPassado: boolean;
}
