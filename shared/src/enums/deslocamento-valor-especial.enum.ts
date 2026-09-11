/**
 * Valor especial que um modo de Deslocamento de criatura pode assumir no lugar de um número de
 * metros (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" > "Deslocamento":
 * o valor "é declarado livremente pelo Mestre", inclusive a ausência de um limite prático —
 * ex.: um Deslocamento Sobrenatural de teletransporte sem alcance definido). Conteúdo de JSONB
 * `ficha.dados` — sem tabela `tipo_*` (§10.3).
 */
export enum DeslocamentoValorEspecialEnum {
  INDETERMINADO = 'INDETERMINADO',
}
