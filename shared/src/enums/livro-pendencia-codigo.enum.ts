/**
 * Motivo de uma pendência devolvida pelo validador da árvore de um livro. Enum de CONTEÚDO (não é
 * coluna): existe só em memória, na Oficina e na publicação.
 */
export enum LivroPendenciaCodigoEnum {
  IDENTIFICADOR_DUPLICADO = "IDENTIFICADOR_DUPLICADO",
  ANCORA_DUPLICADA = "ANCORA_DUPLICADA",
  FILHO_NAO_PERMITIDO = "FILHO_NAO_PERMITIDO",
  DADOS_INVALIDOS = "DADOS_INVALIDOS",
  LINK_INEXISTENTE = "LINK_INEXISTENTE",
  LINK_SEM_IDENTIFICADOR = "LINK_SEM_IDENTIFICADOR",
  CONTEUDO_INCOMPLETO = "CONTEUDO_INCOMPLETO",
}

/**
 * Gravidade de uma pendência: `ESTRUTURAL` quebra o contrato da árvore e impede qualquer
 * publicação; `CONTEUDO` é trabalho por terminar (campo vazio, link para peça removida) — o
 * rascunho pode sair com ela, a versão não.
 */
export enum LivroPendenciaGravidadeEnum {
  ESTRUTURAL = "ESTRUTURAL",
  CONTEUDO = "CONTEUDO",
}
