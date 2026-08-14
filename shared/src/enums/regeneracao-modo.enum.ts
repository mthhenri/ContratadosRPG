/**
 * Modo de Regeneração Natural de uma criatura — Passiva (recupera todo início de turno, sem
 * condição) ou Condicional (recupera mais, mas só quando uma condição declarada é satisfeita
 * no turno) (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" >
 * "Regeneração Natural"). Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 */
export enum RegeneracaoModoEnum {
  PASSIVA = 'PASSIVA',
  CONDICIONAL = 'CONDICIONAL',
}
