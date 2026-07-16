/**
 * Modo de uma rolagem (m3-19). Não vai no texto da fórmula — é propriedade do roll/preset:
 *
 * - `SOMA`: soma os termos (com dano tipado quando há tags `[Tipo]`). É o comportamento legado —
 *   presets sem modo assumem `SOMA`.
 * - `TESTE`: rola o pool de dados e **pega o maior**, somando **Proficiência** (nível) e
 *   amplificadores planos; um atributo puro vira o pool `(Atributo)`D20 (açúcar `luta` = `lutad20`).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Testes" (rolar N D20 pelo atributo, pegar o maior, + Proficiência).
 */
export enum RolagemModoEnum {
  TESTE = 'TESTE',
  SOMA = 'SOMA',
}
