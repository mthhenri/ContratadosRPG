import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";

/** Blocos de conteúdo que uma seção (ou a raiz do livro) aceita. */
const BLOCOS_DE_CONTEUDO: readonly Tipo[] = [
  Tipo.PARAGRAFO,
  Tipo.EXEMPLO,
  Tipo.FORMULA,
  Tipo.NOTA,
  Tipo.LISTA,
  Tipo.TABELA,
  Tipo.HABILIDADE,
  Tipo.CLASSE,
  Tipo.SUBCLASSE,
  Tipo.ORIGENS,
  Tipo.TERMOS,
  Tipo.EQUIPAMENTOS,
  Tipo.MODIFICACOES,
  Tipo.AMPLIFICADORES,
  Tipo.MODULOS,
  Tipo.NIVEIS_AMEACA,
  Tipo.FICHA_CRIATURA,
  Tipo.ROTEIRO,
  Tipo.FAIXAS,
  Tipo.GRADE,
  Tipo.GENERICO,
];

/** Texto corrido que cabe dentro de roteiro e ficha de criatura. */
const TEXTOS_SIMPLES: readonly Tipo[] = [Tipo.PARAGRAFO, Tipo.NOTA, Tipo.EXEMPLO, Tipo.LISTA];

/** Tipos aceitos na raiz de um livro. */
export const LIVRO_RAIZ_PERMITIDA: readonly Tipo[] = [
  Tipo.ABERTURA,
  Tipo.SECAO,
  ...BLOCOS_DE_CONTEUDO,
];

/**
 * Quais tipos de peça cada tipo aceita como filho. É a base do validador e do menu de inserção da
 * Oficina ("dentro de classe só Arquétipo"). Tipo ausente do mapa de valores não aceita filhos.
 */
export const LIVRO_FILHOS_PERMITIDOS: Readonly<Record<Tipo, readonly Tipo[]>> = {
  [Tipo.SECAO]: [Tipo.SECAO, ...BLOCOS_DE_CONTEUDO],
  [Tipo.CLASSE]: [Tipo.HABILIDADE, Tipo.ARQUETIPO],
  [Tipo.ARQUETIPO]: [Tipo.HABILIDADE],
  [Tipo.SUBCLASSE]: [Tipo.HABILIDADE],
  [Tipo.ORIGENS]: [Tipo.ORIGEM],
  [Tipo.TERMOS]: [Tipo.TERMO],
  [Tipo.EQUIPAMENTOS]: [Tipo.EQUIPAMENTO],
  [Tipo.MODIFICACOES]: [Tipo.MODIFICACAO],
  [Tipo.AMPLIFICADORES]: [Tipo.AMPLIFICADOR],
  [Tipo.FICHA_CRIATURA]: [Tipo.HABILIDADE_CRIATURA, Tipo.SECAO, ...TEXTOS_SIMPLES],
  [Tipo.ROTEIRO]: [Tipo.SECAO, ...TEXTOS_SIMPLES],
  [Tipo.PARAGRAFO]: [],
  [Tipo.EXEMPLO]: [],
  [Tipo.FORMULA]: [],
  [Tipo.NOTA]: [],
  [Tipo.LISTA]: [],
  [Tipo.TABELA]: [],
  [Tipo.HABILIDADE]: [],
  [Tipo.ORIGEM]: [],
  [Tipo.TERMO]: [],
  [Tipo.EQUIPAMENTO]: [],
  [Tipo.MODIFICACAO]: [],
  [Tipo.AMPLIFICADOR]: [],
  [Tipo.MODULOS]: [],
  [Tipo.NIVEIS_AMEACA]: [],
  [Tipo.HABILIDADE_CRIATURA]: [],
  [Tipo.FAIXAS]: [],
  [Tipo.GRADE]: [],
  [Tipo.ABERTURA]: [],
  [Tipo.GENERICO]: [],
};
