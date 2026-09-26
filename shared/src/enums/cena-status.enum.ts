/**
 * Situação de uma Cena no seu ciclo de vida: `PLANEJADA` (preparada pelo mestre, invisível aos
 * jogadores; várias podem coexistir), `ATIVA` (em jogo, visível à mesa; no máximo uma por
 * campanha) e `ENCERRADA` (histórico, somente leitura). Enum de COLUNA — espelha a tabela de
 * referência `tipo_cena_status`; a coluna de negócio é INTEGER FK `cena.tipo_cena_status_id`.
 */
export enum CenaStatusEnum {
  PLANEJADA = 'PLANEJADA',
  ATIVA = 'ATIVA',
  ENCERRADA = 'ENCERRADA',
}
