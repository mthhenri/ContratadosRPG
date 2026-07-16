/**
 * Tipo do efeito **mecânico** de uma habilidade quando entra num preset de rolagem (m3-20).
 * Espelha `ModificacaoEfeitoTipoEnum` (modificações de item) para as habilidades: uma habilidade
 * como "Força Bruta" deixa de ser só texto e passa a **contribuir de verdade** na fórmula.
 *
 * Conteúdo de jogo dentro do `ficha.dados` JSONB — sem tabela `tipo_*` (§10.3).
 * Fonte: docs/core/sistema-v4.1.0.md — "Habilidades" (efeitos que somam dano/teste).
 */
export enum RolagemEfeitoTipoEnum {
  /** +N de dano fixo, no `tipoDano` (ex.: Letal). */
  DANO_FIXO = 'DANO_FIXO',
  /** +N D`faces` de dano, no `tipoDano` (ex.: dano elemental extra). */
  DANO_DADOS = 'DANO_DADOS',
  /** +`atributo` × `multiplicador` no dano, no `tipoDano` (ex.: **Força Bruta** = FOR × 3 físico). */
  DANO_ATRIBUTO = 'DANO_ATRIBUTO',
  /** Bônus em teste — `variante` `'DADO'` (soma D20 ao pool) ou `'FIXO'` (bônus plano). */
  BONUS_TESTE = 'BONUS_TESTE',
  /** Sobe N degrau(s) as faces dos dados de dano da fórmula (usa `elevarDado`). */
  ELEVAR_DADO = 'ELEVAR_DADO',
}
