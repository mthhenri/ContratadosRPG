import type {
    NpcBloquearCalcularDto, NpcDefesaBaseCalcularDto, NpcEsquivarCalcularDto,
} from "../../dtos/ficha";

/** Guia de mestre — "Guia de Criação de NPCs" > Construção Mecânica > Defesa. */
export function calcularDefesaBase(dto: NpcDefesaBaseCalcularDto): number {
    return 10 + dto.nivel;
}

/** Snapshot de Bloquear: Defesa Base + Vigor. */
export function calcularBloquear(dto: NpcBloquearCalcularDto): number {
    return dto.defesaBase + dto.vigor;
}

/** Snapshot de Esquivar: Defesa Base + Destreza. */
export function calcularEsquivar(dto: NpcEsquivarCalcularDto): number {
    return dto.defesaBase + dto.destreza;
}
