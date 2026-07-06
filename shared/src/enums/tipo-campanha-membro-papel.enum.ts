/**
 * Papel de um membro numa campanha. Enum de COLUNA — espelha a tabela de referência
 * `tipo_campanha_membro_papel` (BaseEntity + `codigo` + `descricao`); a coluna de negócio é
 * INTEGER FK `tipo_campanha_membro_papel_id` e o repositório traduz `codigo ↔ id` no SQL
 * (§10.2.12 / SCHEMA.md). Difere dos enums de conteúdo de jogo (dentro do JSONB `ficha.dados`),
 * que não têm tabela `tipo_*` (§10.3).
 */
export enum TipoCampanhaMembroPapelEnum {
  MESTRE = 'MESTRE',
  JOGADOR = 'JOGADOR',
}
