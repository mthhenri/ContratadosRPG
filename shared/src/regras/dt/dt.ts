import { DtAtributoCalcularDto } from './dt.dtos';

/**
 * DT (Dificuldade de Teste) de um atributo, quando você é o causador do teste:
 *
 *   DT = 10 + Nível + (Atributo × 2)
 *
 * Usada sempre que o padrão "DT [ATRIBUTO]" aparecer e o causador for o próprio
 * agente (ex.: Sangramento testa Vigor contra a DT de Força de quem aplicou).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "DTs de Atributos". Sem divergências vs
 * `contratados-calculadora/src/script.js` (`calcDT`).
 */
export function calcularDtAtributo(dto: DtAtributoCalcularDto): number {
  return 10 + dto.nivel + dto.atributo * 2;
}
