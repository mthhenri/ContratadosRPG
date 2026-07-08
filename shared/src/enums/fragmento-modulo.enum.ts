/**
 * Módulo de um fragmento — I (mais poderoso) a V (mais fraco). Conteúdo de jogo
 * — sem tabela `tipo_*` (§10.3). Fonte: docs/core/sistema-v4.1.0.md —
 * "Fragmentos" (o poder é categorizado em módulos I a V; quanto menor o número,
 * melhor). O Módulo ∅ é negociado com o Mestre e fica fora da tabela de venda.
 */
export enum FragmentoModuloEnum {
  I = 'I',
  II = 'II',
  III = 'III',
  IV = 'IV',
  V = 'V',
}
