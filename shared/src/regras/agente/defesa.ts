import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import type { FichaAtributosDto } from '../../dtos/ficha';
import { calcularStatItem, resolverDadosItem, type CarrinhoItemDto } from '../compras';
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

/** Bônus de Esquiva/Bloqueio/Defesa vindos do equipamento (m3-43) — ver `calcularBonusDefesaEquipamento`. */
export interface BonusDefesaEquipamentoDto {
  readonly esquiva: number;
  readonly bloqueio: number;
  readonly defesa: number;
}

/**
 * Bônus de Esquiva/Bloqueio/Defesa vindos de **itens de Proteções equipados** (`item.equipado ===
 * true`) — mods do catálogo por nome ("Flexível": +1 Esquivar/compra; "Resistente": +1 Bloquear/
 * compra — a 1ª compra vale 1 aplicação mesmo já nascendo em ■■, não dobra) e efeito `DEFESA` de
 * mods custom (`variante` Esquiva/Bloqueio/Defesa), via
 * `calcularStatItem` (fonte única — zero motor duplicado aqui). Quem consome soma isto **por cima**
 * do valor manual/calculado de cada stat, nunca escreve de volta no `derivados` (mesma filosofia
 * "manual + equipamento" de `resistencia.ts`/`amplificador.ts`).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "⬥ Modificações" de Proteções e Escudos (Flexível/Resistente).
 */
export function calcularBonusDefesaEquipamento(itens: readonly CarrinhoItemDto[]): BonusDefesaEquipamentoDto {
  let esquiva = 0;
  let bloqueio = 0;
  let defesa = 0;

  itens
    .filter((item) => item.equipado === true)
    .forEach((item) => {
      const stat = calcularStatItem({ item });
      esquiva += stat?.bonusEsquiva ?? 0;
      bloqueio += stat?.bonusBloqueio ?? 0;
      defesa += stat?.bonusDefesa ?? 0;
    });

  return { esquiva, bloqueio, defesa };
}

/**
 * Ajuste de **dados** em testes de atributo vindo de **itens equipados** (hoje só Armadura Pesada —
 * doc: "Penalidade: [...] −1 dado em Destreza"). Soma **por cima** do ajuste manual de `dadosTeste`
 * na ficha, nunca escreve nele (mesma filosofia "manual + equipamento" de
 * `calcularBonusDefesaEquipamento`/`resistencia.ts`/`amplificador.ts`) — quem consome mescla este
 * resultado com `dadosTeste` antes de chamar `calcularAtributosParaDados`.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Proteções e Escudos" (coluna "Penalidade").
 */
export function calcularAjusteDadosEquipamento(
  itens: readonly CarrinhoItemDto[],
): Partial<Record<keyof FichaAtributosDto, number>> {
  let destreza = 0;

  itens
    .filter((item) => item.equipado === true)
    .forEach((item) => {
      const penalidade = resolverDadosItem(item)?.penalidadeDadoDestreza;
      if (penalidade) {
        destreza -= penalidade;
      }
    });

  return destreza !== 0 ? { destreza } : {};
}
