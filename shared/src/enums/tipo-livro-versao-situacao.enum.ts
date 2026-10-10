/**
 * Situação de uma fotografia (`livro_versao`) de um livro de regras: `RASCUNHO` (visível aos
 * testers) ou `PUBLICADA` (versão visível a todos). Enum de COLUNA — espelha a tabela de
 * referência `tipo_livro_versao_situacao`; a coluna de negócio é INTEGER FK
 * `livro_versao.tipo_livro_versao_situacao_id`.
 */
export enum TipoLivroVersaoSituacaoEnum {
  RASCUNHO = "RASCUNHO",
  PUBLICADA = "PUBLICADA",
}
