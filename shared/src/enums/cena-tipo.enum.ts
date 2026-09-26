/**
 * Tipo de uma Cena — os cinco tipos do capítulo "⬡ Cenas" de `docs/core/sistema-v4.1.0.md:2234`.
 * Enum de COLUNA — espelha a tabela de referência `tipo_cena` (BaseEntity + `codigo` +
 * `descricao`); a coluna de negócio é INTEGER FK `cena.tipo_cena_id` e o repositório traduz
 * `codigo ↔ id` no SQL. Se o tipo tem iniciativa (e portanto um `encontro`) quem decide é
 * `cenaTemIniciativa` (`shared/regras/cena`), nunca um `if` por tipo espalhado.
 */
export enum CenaTipoEnum {
  COMBATE = 'COMBATE',
  INVESTIGACAO = 'INVESTIGACAO',
  FURTIVA = 'FURTIVA',
  PERSEGUICAO = 'PERSEGUICAO',
  RESISTENCIA = 'RESISTENCIA',
}
