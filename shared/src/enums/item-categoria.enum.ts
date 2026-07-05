/**
 * Categorias do catálogo de equipamentos. Conteúdo de JSONB `ficha.dados` — sem
 * tabela `tipo_*` (§10.3). Fonte: docs/core/sistema-v4.1.0.md — capítulo
 * "Equipamentos" (Corpo a Corpo, Explosivos, Armas de Fogo, Munições, Proteções
 * e Escudos, Exóticos, Armazenamento, Itens Operacionais, Itens Medicinais) e a
 * seção "Amplificadores".
 */
export enum ItemCategoriaEnum {
  CORPO_A_CORPO = 'CORPO_A_CORPO',
  EXPLOSIVOS = 'EXPLOSIVOS',
  ARMAS_DE_FOGO = 'ARMAS_DE_FOGO',
  MUNICOES = 'MUNICOES',
  PROTECOES = 'PROTECOES',
  EXOTICOS = 'EXOTICOS',
  ARMAZENAMENTO = 'ARMAZENAMENTO',
  OPERACIONAL = 'OPERACIONAL',
  MEDICINAL = 'MEDICINAL',
  AMPLIFICADOR = 'AMPLIFICADOR',
}
