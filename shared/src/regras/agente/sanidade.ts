import { ClasseEnum } from '../../enums';
import { SanidadeCalcularDto, SanidadeDto } from './agente.dtos';

/**
 * Recorte de sanidade governado pela Vontade:
 *   - `limiteTraumas` = Vontade + 1 traumas não tratados; excedê-lo deixa o agente
 *     Incapacitado Mentalmente (doc — "Sanidade" > "Traumas"). Civis não têm esse
 *     limite na calculadora, então vem `null`.
 *   - `sequelasRemovidasPorMissao` = Vontade sequelas removidas ao encerrar a missão
 *     e retornar à base (doc — "Sanidade" > "Sequelas"). Vale para todas as classes.
 */
export function calcularSanidade(dto: SanidadeCalcularDto): SanidadeDto {
  return {
    limiteTraumas: dto.classe === ClasseEnum.CIVIL ? null : dto.vontade + 1,
    sequelasRemovidasPorMissao: dto.vontade,
  };
}
