import { ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import { InventarioCalcularDto } from './agente.dtos';

const NOME_MOCHILEIRO = 'Mochileiro';

/**
 * Inventário base (limite de peso). Força × 5 para agentes, Força × 3 para Civis.
 *
 * Força negativa resulta em 0 independente do valor (ambas as classes). A exceção
 * "Força 0 → 3 de inventário" (doc — "Inventário") vale apenas para agentes; para
 * Civis o inventário é estritamente Força × 3 (doc — "Jogando como um Civil"),
 * então Força 0 resulta em 0.
 *
 * "Mochileiro" (doc — "Habilidades Gerais") troca o atributo de cálculo de Força para
 * Intelecto − 1; a variante Geral Melhorada exclusiva do Engenheiro (`HABILIDADES_GERAIS_
 * MELHORADAS`) usa Intelecto cheio, sem a penalidade. Sem a habilidade na lista (ou sem
 * `intelecto` informado), o cálculo usa Força normalmente — mesmas regras de 0/negativo
 * acima, só que aplicadas ao atributo trocado.
 */
export function calcularInventario(dto: InventarioCalcularDto): number {
  const mochileiro = dto.habilidades?.find((habilidade) => habilidade.nome === NOME_MOCHILEIRO);
  const atributo =
    mochileiro && dto.intelecto !== undefined
      ? dto.intelecto - (mochileiro.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA ? 0 : 1)
      : dto.forca;

  if (atributo < 0) {
    return 0;
  }
  if (dto.classe === ClasseEnum.CIVIL) {
    return atributo * 3;
  }
  if (atributo === 0) {
    return 3;
  }
  return atributo * 5;
}
