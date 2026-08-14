/**
 * Cadência de uma criatura — o número de turnos que ela possui por rodada, de Singular (1,
 * padrão) a Frenética (4+, reservada a VD muito alto). Não escala com VD nem é recompensa de
 * poder: é decisão de conceito (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de
 * Ameaças" > "Cadência"). Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 */
export enum CadenciaEnum {
  SINGULAR = 'SINGULAR',
  DUPLA = 'DUPLA',
  TRIPLICE = 'TRIPLICE',
  FRENETICA = 'FRENETICA',
}
