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
 * Contra-Ataque: Defesa Final ao reagir com a habilidade "Contra-Ataque" — Defesa Base + bônus de
 * Reação (doc — "Defesa": "a defesa base é complementada com as Habilidades e Fragmentos [...]
 * você poderá somar os bônus de reação, sendo ele Esquiva, Bloqueio ou Contra-Ataque"), mesmo
 * padrão de `calcularDefesa` para `esquiva`/`bloqueio`. O bônus em si varia por três variantes
 * conforme a origem da habilidade na ficha (doc — "Habilidades Gerais [Melhoradas]"):
 *   - Geral (qualquer classe): Luta ÷ 2
 *   - Lutador (Melhorada): Luta inteira
 *   - Vanguarda (Melhorada): Luta ÷ 2 ou Vigor ÷ 2 — usa o maior, já que não há campo de escolha
 *     explícita no modelo de dados e um jogador racional sempre tomaria a opção maior
 * `null` quando a ficha não tem a habilidade "Contra-Ataque" ou quando a classe não possui Defesa
 * (Civil, `dto.defesa === null`) — a UI mostra o placeholder "—" nesse caso.
 */
export function calcularContraAtaque(dto: ContraAtaqueCalcularDto): number | null {
  if (dto.defesa === null) {
    return null;
  }
  const habilidade = dto.habilidades.find((habilidade) => habilidade.nome === 'Contra-Ataque');
  if (!habilidade) {
    return null;
  }
  if (habilidade.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA) {
    if (habilidade.origem === ArquetipoEnum.LUTADOR) {
      return dto.defesa + dto.luta;
    }
    if (habilidade.origem === ArquetipoEnum.VANGUARDA) {
      return dto.defesa + Math.max(Math.floor(dto.luta / 2), Math.floor(dto.vigor / 2));
    }
  }
  return dto.defesa + Math.floor(dto.luta / 2);
}
