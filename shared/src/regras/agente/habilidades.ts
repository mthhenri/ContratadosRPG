import { ClasseEnum } from '../../enums';
import { dadosAgente } from '../dados';
import { LimiteHabilidadesTurnoCalcularDto } from './agente.dtos';

/** Limite inicial de habilidades por turno de um agente (doc — "Habilidades"). */
const LIMITE_HABILIDADES_TURNO_BASE = 4;

/** Limite fixo de habilidades por turno de um Civil (doc — "Jogando como um Civil"). */
const LIMITE_HABILIDADES_TURNO_CIVIL = 3;

/**
 * Limite de Habilidades por Turno. Para agentes, parte de 4 e soma os ganhos
 * "Habilidade(s) por Turno" da progressão até o Nível informado (+1 nos Níveis
 * 2/4/6/8/12/14/16/18 e +2 nos Níveis 10 e 20 — lidos da tabela `dadosAgente`,
 * fonte única migrada na m1-01). Civis têm limite fixo de 3.
 */
export function calcularLimiteHabilidadesPorTurno(dto: LimiteHabilidadesTurnoCalcularDto): number {
  if (dto.classe === ClasseEnum.CIVIL) {
    return LIMITE_HABILIDADES_TURNO_CIVIL;
  }

  let ganhos = 0;
  for (let nivelAtual = 1; nivelAtual <= dto.nivel; nivelAtual++) {
    const beneficios = dadosAgente[nivelAtual] ?? [];
    for (const beneficio of beneficios) {
      if (beneficio.includes('2 Habilidades por Turno')) {
        ganhos += 2;
      } else if (beneficio.includes('Habilidade por Turno')) {
        ganhos += 1;
      }
    }
  }

  return LIMITE_HABILIDADES_TURNO_BASE + ganhos;
}
