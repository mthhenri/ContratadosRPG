import { CategoriaNpcEnum } from "../../enums";
import type { NpcEnergiaCalcularDto, NpcEnergiaDto } from "../../dtos/ficha";

/**
 * Guia de mestre — "Guia de Criação de NPCs" > Construção Mecânica > Energia.
 * Civil retorna 0; Reserva Fixa retorna número; Pool + Recarga retorna { pool, recarga }.
 * Na criação, o consumidor grava máxima/atual e recargaPorTurno (null para Reserva/Civil).
 * Em jogo, recarregar nunca ultrapassa a Pool máxima. Não há automação de turnos aqui.
 */
export function calcularEnergia(dto: NpcEnergiaCalcularDto): number | NpcEnergiaDto {
    switch (dto.categoria) {
        case CategoriaNpcEnum.CIVIL:
            return 0;
        case CategoriaNpcEnum.OPERATIVO:
            return 8 + dto.destreza * 2;
        case CategoriaNpcEnum.VETERANO:
            return 12 + dto.destreza * 3;
        case CategoriaNpcEnum.ELITE:
            return { pool: 18 + dto.destreza * 3, recarga: dto.destreza };
        case CategoriaNpcEnum.LENDARIO:
            return { pool: 25 + dto.destreza * 4, recarga: dto.destreza * 2 };
    }
}
