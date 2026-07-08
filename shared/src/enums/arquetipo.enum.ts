/**
 * Arquétipos de agente — a especialização escolhida dentro de uma classe base
 * (Combatente / Especialista / Suporte). Cada classe base tem exatamente três
 * arquétipos. Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 *
 * O arquétipo é **mutuamente exclusivo** com tomar uma subclasse (Experimento):
 * ao escolher um Experimento o agente abre mão do arquétipo. Como as subclasses
 * (e o registro Civil) já são valores de `ClasseEnum`, a ficha guarda o arquétipo
 * apenas quando `classe` é uma das três classes base — caso contrário é `null`.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Classes e Arquétipos". O documento vence
 * o código (proibição #27).
 */
export enum ArquetipoEnum {
  // Combatente
  LUTADOR = 'LUTADOR',
  MERCENARIO = 'MERCENARIO',
  VANGUARDA = 'VANGUARDA',
  // Especialista
  ENGENHEIRO = 'ENGENHEIRO',
  ASSASSINO = 'ASSASSINO',
  ACADEMICO = 'ACADEMICO',
  // Suporte
  PARAMEDICO = 'PARAMEDICO',
  DIPLOMATA = 'DIPLOMATA',
  COMANDANTE = 'COMANDANTE',
}
