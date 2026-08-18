/**
 * Situação de um Encontro de Combate no seu ciclo de vida: `MONTAGEM` (mestre reúne os
 * combatentes e coleta as iniciativas), `ATIVO` (combate em curso, com rodada e turno correntes)
 * e `ENCERRADO` (histórico, imutável). Enum de COLUNA — espelha a tabela de referência
 * `tipo_encontro_status` (BaseEntity + `codigo` + `descricao`); a coluna de negócio é INTEGER FK
 * `tipo_encontro_status_id` e o repositório traduz `codigo ↔ id` no SQL (§10.2.12 / SCHEMA.md).
 */
export enum EncontroStatusEnum {
  MONTAGEM = 'MONTAGEM',
  ATIVO = 'ATIVO',
  ENCERRADO = 'ENCERRADO',
}
