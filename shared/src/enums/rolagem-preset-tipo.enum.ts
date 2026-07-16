/**
 * Tipo de um preset de rolagem (m3-21):
 *
 * - `SIMPLES`: uma rolagem só.
 * - `ENCADEADO`: uma rolagem primária + passos **seguintes** (`FichaRolagemPassoDto`) disparados um
 *   após o outro (ex.: teste da arma → dano → dano crítico).
 *
 * Ausente = `SIMPLES` (presets legados). Fonte: docs/core/sistema-v4.1.0.md — "Testes"/"Dano".
 */
export enum RolagemPresetTipoEnum {
  SIMPLES = 'SIMPLES',
  ENCADEADO = 'ENCADEADO',
}
