/**
 * Situação de uma peça na comparação entre duas versões de um livro (`compararLivros`): só existe no
 * atual (`NOVA`), só no anterior (`REMOVIDA`), mesmo `identificador` com conteúdo diferente
 * (`ALTERADA`) ou em outra posição na árvore (`MOVIDA`).
 */
export enum LivroMudancaSituacaoEnum {
  NOVA = "NOVA",
  REMOVIDA = "REMOVIDA",
  ALTERADA = "ALTERADA",
  MOVIDA = "MOVIDA",
}

/**
 * Operação de um trecho do diff por palavras de um texto rico: `IGUAL`, `ADICIONADO`, `REMOVIDO` ou
 * `FORMATACAO` (mesma palavra, outra marcação: negrito, itálico, link...).
 */
export enum LivroTextoOperacaoEnum {
  IGUAL = "IGUAL",
  ADICIONADO = "ADICIONADO",
  REMOVIDO = "REMOVIDO",
  FORMATACAO = "FORMATACAO",
}
