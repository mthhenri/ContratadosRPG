/**
 * Tipo de uma entrada do log do encontro — a trilha legível do que aconteceu em cada rodada/turno
 * (mockup `docs/design/examples/iniciativa-desktop.html`, painel "Log da rodada"). Conteúdo de
 * `encontro_evento.tipo`, gravado como texto do enum — sem tabela `tipo_*` (§10.3), no mesmo
 * espírito dos enums de conteúdo de jogo.
 */
export enum EncontroEventoTipoEnum {
  RODADA_INICIADA = 'RODADA_INICIADA',
  DANO = 'DANO',
  CURA = 'CURA',
  ENERGIA = 'ENERGIA',
  CONDICAO_APLICADA = 'CONDICAO_APLICADA',
  CONDICAO_EXPIRADA = 'CONDICAO_EXPIRADA',
  ESTADO_ALTERADO = 'ESTADO_ALTERADO',
  COMBATENTE_ADICIONADO = 'COMBATENTE_ADICIONADO',
  COMBATENTE_REMOVIDO = 'COMBATENTE_REMOVIDO',
}
