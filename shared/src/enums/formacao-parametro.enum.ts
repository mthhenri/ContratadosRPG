/**
 * Tipo de parâmetro que uma linha de `FormacaoBonusEnum` exige para ser aplicável a um personagem
 * (`docs/core/sistema-v4.1.0.md` — "⬦ Formação"). Nem todo bônus precisa de parâmetro — só as linhas
 * cujo efeito depende de uma escolha do jogador (qual categoria de arma, qual atributo…). O valor
 * escolhido é texto livre em `FichaFormacaoDto.parametro`; este enum só documenta **o tipo** esperado.
 */
export enum FormacaoParametroEnum {
  /** Um dos dez atributos (ex.: "Vigor"). */
  ATRIBUTO = 'ATRIBUTO',
  /** Uma categoria de arma (Corpo a Corpo, Armas de Fogo, Exótica, Explosivo). */
  CATEGORIA_ARMA = 'CATEGORIA_ARMA',
  /** Um tipo de dano (Físico, Balístico, Químico, Explosão). */
  TIPO_DANO = 'TIPO_DANO',
  /** Escolha entre Esquiva ou Bloqueio. */
  ESQUIVA_OU_BLOQUEIO = 'ESQUIVA_OU_BLOQUEIO',
  /** Uma condição textual específica (ex.: "Destreza para Furtividade"). */
  CONDICAO = 'CONDICAO',
}
