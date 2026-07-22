import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import { ContraAtaqueCalcularDto, DefesaCalcularDto, DefesaDto, ProficienciaCalcularDto } from './agente.dtos';

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

/**
 * Contra-Ataque: bônus de Reação somado à Defesa ao reagir com a habilidade "Contra-Ataque"
 * (doc — "Habilidades Gerais [Melhoradas]"). Três variantes conforme a origem da habilidade na
 * ficha:
 *   - Geral (qualquer classe): Luta ÷ 2
 *   - Lutador (Melhorada): Luta inteira
 *   - Vanguarda (Melhorada): Luta ÷ 2 ou Vigor ÷ 2 — usa o maior, já que não há campo de escolha
 *     explícita no modelo de dados e um jogador racional sempre tomaria a opção maior
 * `null` quando a ficha não tem a habilidade "Contra-Ataque" (a UI mostra o placeholder "—"
 * nesse caso, sem chamar esta função).
 */
export function calcularContraAtaque(dto: ContraAtaqueCalcularDto): number | null {
  const habilidade = dto.habilidades.find((habilidade) => habilidade.nome === 'Contra-Ataque');
  if (!habilidade) {
    return null;
  }
  if (habilidade.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA) {
    if (habilidade.origem === ArquetipoEnum.LUTADOR) {
      return dto.luta;
    }
    if (habilidade.origem === ArquetipoEnum.VANGUARDA) {
      return Math.max(Math.floor(dto.luta / 2), Math.floor(dto.vigor / 2));
    }
  }
  return Math.floor(dto.luta / 2);
}
