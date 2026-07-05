/**
 * Mapa de nível (0–20) para a lista de benefícios ganhos naquele nível. Usado
 * pelas fórmulas de progressão de `regras/agente` (m1-02). Fonte:
 * docs/core/sistema-v4.1.0.md — "Níveis e Melhorias de Agente".
 */
export type BeneficiosPorNivel = Readonly<Record<number, readonly string[]>>;

/**
 * Divergências corrigidas em relação a `contratados-calculadora/src/script.js`
 * (documento vence — proibição #27):
 * - Níveis 5, 10, 15, 20: o site antigo escrevia "outra classe/arquétipo da sua
 *   classe", faltando a palavra "outro" antes de "arquétipo".
 * - Níveis 7, 14: o site antigo escrevia "Fortificação de Personalidade",
 *   faltando "sua" antes de "Personalidade".
 */
export const dadosAgente: BeneficiosPorNivel = {
  0: [],
  1: ['+1 Atributo', '+1 Habilidade Geral', '+1 Habilidade de Classe ou Arquétipo'],
  2: ['+2 Atributos', '+1 Habilidade por Turno', '+1 Habilidade de Classe'],
  3: [
    '+1 Atributo',
    '+1 Habilidade Geral',
    '+1 Habilidade de Classe ou Arquétipo',
    '+1D6+1 de dano furtivo',
  ],
  4: ['+2 Atributos', '+1 Habilidade Geral', '+1 Habilidade por Turno'],
  5: [
    '+1 Atributo',
    '+1 Habilidade de outra classe/outro arquétipo da sua classe',
    '+1 Habilidade de Classe ou Arquétipo',
  ],
  6: [
    '+2 Atributos',
    '+1 Habilidade Geral',
    '+1 Habilidade por Turno',
    '+1 Habilidade de Classe',
    '+1D6+1 de dano furtivo',
  ],
  7: ['+1 Atributo', '+1 Habilidade de Classe ou Arquétipo', '+1 Fortificação de sua Personalidade'],
  8: ['+2 Atributos', '+1 Habilidade Geral', '+1 Habilidade por Turno'],
  9: [
    '+1 Atributo',
    '+1 Habilidade Geral',
    '+1 Habilidade de Classe ou Arquétipo',
    '+1D6+1 de dano furtivo',
  ],
  10: [
    '+2 Atributos',
    '+2 Habilidades por Turno',
    '+1 Habilidade de outra classe/outro arquétipo da sua classe',
    '+1 Habilidade de Classe',
  ],
  11: ['+1 Atributo', '+1 Habilidade Geral', '+1 Habilidade de Classe ou Arquétipo'],
  12: ['+2 Atributos', '+1 Habilidade por Turno', '+1D6+1 de dano furtivo'],
  13: ['+1 Atributo', '+1 Habilidade Geral', '+1 Habilidade de Classe ou Arquétipo'],
  14: [
    '+2 Atributos',
    '+1 Habilidade Geral',
    '+1 Habilidade por Turno',
    '+1 Habilidade de Classe',
    '+1 Fortificação de sua Personalidade',
  ],
  15: [
    '+1 Atributo',
    '+1 Habilidade de outra classe/outro arquétipo da sua classe',
    '+1 Habilidade de Classe ou Arquétipo',
    '+1D6+1 de dano furtivo',
  ],
  16: ['+2 Atributos', '+1 Habilidade Geral', '+1 Habilidade por Turno'],
  17: ['+1 Atributo', '+1 Habilidade de Classe ou Arquétipo'],
  18: [
    '+2 Atributos',
    '+1 Habilidade Geral',
    '+1 Habilidade por Turno',
    '+1 Habilidade de Classe',
    '+1D6+1 de dano furtivo',
  ],
  19: ['+1 Atributo', '+1 Habilidade Geral', '+1 Habilidade de Classe ou Arquétipo'],
  20: [
    '+2 Atributos',
    '+2 Habilidades por Turno',
    '+1 Habilidade de outra classe/outro arquétipo da sua classe',
  ],
};
