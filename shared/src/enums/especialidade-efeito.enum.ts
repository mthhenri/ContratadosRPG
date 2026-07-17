/**
 * Os três bônus possíveis de uma **Especialidade** (`docs/core/sistema-v4.1.0.md` — "⬦ Especialidade"):
 * "+1 dado em um teste, OU +3 no resultado de um teste, OU +2 no dano. Não acumula mais de uma dessas
 * opções." Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 */
export enum EspecialidadeEfeitoEnum {
  /** +1 dado em um teste. */
  DADO_EXTRA = 'DADO_EXTRA',
  /** +3 no resultado de um teste. */
  BONUS_TESTE = 'BONUS_TESTE',
  /** +2 no dano. */
  DANO = 'DANO',
}
