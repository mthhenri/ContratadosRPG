/**
 * DTOs de entrada das fórmulas de DT (Dificuldade de Teste) de atributo
 * (`regras/dt`, m1-03). "Dados tipados" do motor de regras (SYSTEM.SPEC §6.6):
 * a função pura recebe um DTO tipado, nunca primitivos soltos. Entrada segue
 * `<Conceito>CalcularDto` (verbo no infinitivo).
 *
 * Fonte da fórmula: docs/core/sistema-v4.1.0.md — "DTs de Atributos". Em
 * conflito com o código, o documento vence (proibição #27).
 */

/**
 * Entrada de `calcularDtAtributo`: DT de um atributo aplicada por você =
 * 10 + Nível + (Atributo × 2).
 */
export interface DtAtributoCalcularDto {
  readonly nivel: number;
  readonly atributo: number;
}
