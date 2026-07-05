import { ClasseEnum } from '../../enums';
import { DefesaCalcularDto, DefesaDto, ProficienciaCalcularDto } from './agente.dtos';

/**
 * Valores defensivos do agente:
 *   - Defesa Base = 10 + Nível (doc — "Defesa")
 *   - Esquiva = Defesa Base + Destreza (doc — "Regras Gerais": Esquivar soma Destreza)
 *   - Bloqueio = Defesa Base + Vigor (doc — Bloquear reage com Vigor)
 *
 * Civis não possuem defesa (doc — "Jogando como um Civil" > "Defesa e Reações"):
 * ataques furtivos são acerto garantido e reações exigem teste de atributo.
 * Retorna `null` para a classe Civil.
 */
export function calcularDefesa(dto: DefesaCalcularDto): DefesaDto | null {
  if (dto.classe === ClasseEnum.CIVIL) {
    return null;
  }
  const defesa = 10 + dto.nivel;
  return {
    defesa,
    esquiva: defesa + dto.destreza,
    bloqueio: defesa + dto.vigor,
  };
}

/**
 * Proficiência do agente: +1 em todos os testes por Nível (doc — "Progressão":
 * a cada Nível recebe +1 de Proficiência; inicia em 0 no Nível 0). Civis não
 * progridem em Nível e não possuem proficiência — retorna `null`.
 */
export function calcularProficiencia(dto: ProficienciaCalcularDto): number | null {
  if (dto.classe === ClasseEnum.CIVIL) {
    return null;
  }
  return dto.nivel;
}
