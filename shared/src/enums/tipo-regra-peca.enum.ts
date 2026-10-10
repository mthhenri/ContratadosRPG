/**
 * Tipo de uma peça de um livro de regras (`regra_peca`). Peça é a unidade com identidade dentro de
 * um livro: pode ser linkada, comparada entre versões e editada na Oficina das Regras. Enum de
 * COLUNA — espelha a tabela de referência `tipo_regra_peca`; a coluna de negócio é INTEGER FK
 * `regra_peca.tipo_regra_peca_id`. O `dados` de cada tipo é contrato tipado em
 * `shared/src/dtos/livro/`.
 */
export enum TipoRegraPecaEnum {
  SECAO = "SECAO",
  PARAGRAFO = "PARAGRAFO",
  EXEMPLO = "EXEMPLO",
  FORMULA = "FORMULA",
  NOTA = "NOTA",
  LISTA = "LISTA",
  TABELA = "TABELA",
  HABILIDADE = "HABILIDADE",
  CLASSE = "CLASSE",
  ARQUETIPO = "ARQUETIPO",
  SUBCLASSE = "SUBCLASSE",
  ORIGENS = "ORIGENS",
  ORIGEM = "ORIGEM",
  TERMOS = "TERMOS",
  TERMO = "TERMO",
  EQUIPAMENTOS = "EQUIPAMENTOS",
  EQUIPAMENTO = "EQUIPAMENTO",
  MODIFICACOES = "MODIFICACOES",
  MODIFICACAO = "MODIFICACAO",
  AMPLIFICADORES = "AMPLIFICADORES",
  AMPLIFICADOR = "AMPLIFICADOR",
  MODULOS = "MODULOS",
  NIVEIS_AMEACA = "NIVEIS_AMEACA",
  FICHA_CRIATURA = "FICHA_CRIATURA",
  HABILIDADE_CRIATURA = "HABILIDADE_CRIATURA",
  ROTEIRO = "ROTEIRO",
  FAIXAS = "FAIXAS",
  GRADE = "GRADE",
  ABERTURA = "ABERTURA",
  GENERICO = "GENERICO",
}
