/**
 * Severidade de uma lesão física sofrida por um agente. Determina quantos pontos
 * de atributo a lesão remove e a DT inicial da condição "Morrendo" que ela
 * dispara. Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Lesões":
 * - `LEVE`   — dano ≥ Vida máxima num único golpe → remove 1 ponto de atributo (Morrendo DT 10)
 * - `GRAVE`  — dano ≥ 2× Vida máxima num único golpe → remove 3 pontos de atributo (Morrendo DT 15)
 * - `MORTAL` — dano ≥ 3× Vida máxima num único golpe → remove 5 pontos de atributo (Morrendo DT 20)
 *
 * A severidade é guardada por lesão porque não é derivável dos pontos restantes:
 * uma lesão pode ser parcialmente tratada (pontos reduzidos) sem mudar de tier.
 * O documento vence o código (proibição #27).
 */
export enum SeveridadeLesaoEnum {
  LEVE = 'LEVE',
  GRAVE = 'GRAVE',
  MORTAL = 'MORTAL',
}
