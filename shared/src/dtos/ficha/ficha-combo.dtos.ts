/**
 * Contrato do "Combo" (m3-34): sequência ordenada de rolagens que o jogador monta e executa passo a
 * passo na aba Combate (mesclada com Rolagens). Cada passo **referencia** um preset de rolagem já
 * existente da ficha (`FichaRolagemDto.nome`) — zero motor novo: o runner reusa
 * `resolverPreset`/`rolarPasso` (`shared/regras/rolagem`) exatamente como o editor de Rolagens.
 *
 * Uma referência pendurada (preset renomeado/apagado depois) não é validada aqui — é tratada em
 * tempo de execução como "preset não encontrado" (mesma liberdade de edição de m3-10: não trava
 * o salvamento por uma referência que só ficou inválida depois).
 */

/** Um passo do combo — referencia um preset de rolagem pelo nome. */
export interface FichaComboPassoDto {
  readonly nome: string;
  /** Nome do `FichaRolagemDto` referenciado (`dados.rolagens`). */
  readonly rolagemNome: string;
  readonly descricao?: string;
}

/** Um combo nomeado — sequência ordenada de passos. */
export interface FichaComboDto {
  readonly nome: string;
  readonly passos: readonly FichaComboPassoDto[];
}
