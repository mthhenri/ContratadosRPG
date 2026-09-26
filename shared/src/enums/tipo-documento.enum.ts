/**
 * Formato de um documento de campanha (M9, "Biblioteca"). Enum de COLUNA — espelha a tabela de
 * referência `tipo_documento` (BaseEntity + `codigo` + `descricao`); a coluna de negócio é INTEGER
 * FK `documento.tipo_documento_id` e o repositório traduz `codigo ↔ id` no SQL. `TEXTO` carrega
 * `conteudo_markdown`; `IMAGEM` carrega `imagem_url`. PDF fica fora do MVP
 * (`m9-documentos-campanha.spec.md`, decisão #1).
 */
export enum TipoDocumentoEnum {
  TEXTO = 'TEXTO',
  IMAGEM = 'IMAGEM',
}
