/**
 * De onde vem um combatente do encontro: `FICHA` (agente, criatura ou NPC — vida e condições são
 * as da própria ficha, fonte única) ou `AVULSO` (inimigo improvisado digitado pelo mestre na
 * sessão, sem ficha — só ele guarda vida própria no encontro). Enum derivado da presença de
 * `ficha_id` em `encontro_combatente`, não uma coluna própria — sem tabela `tipo_*` (§10.3).
 */
export enum CombatenteOrigemEnum {
  FICHA = 'FICHA',
  AVULSO = 'AVULSO',
}
