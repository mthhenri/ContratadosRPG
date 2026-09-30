import { CategoriaNpcEnum } from "../../enums";
import type { NpcVidaMaximaCalcularDto } from "../../dtos/ficha";

/** Guia de mestre — "Guia de Criação de NPCs" > Construção Mecânica > Vida. */
const VIDA: Readonly<Record<CategoriaNpcEnum, {
    readonly base: number;
    readonly multiplicador: number;
}>> = {
    [CategoriaNpcEnum.CIVIL]: { base: 10, multiplicador: 3 },
    [CategoriaNpcEnum.OPERATIVO]: { base: 15, multiplicador: 10 },
    [CategoriaNpcEnum.VETERANO]: { base: 25, multiplicador: 20 },
    [CategoriaNpcEnum.ELITE]: { base: 40, multiplicador: 35 },
    [CategoriaNpcEnum.LENDARIO]: { base: 60, multiplicador: 60 },
};

/** Gera o snapshot inicial; nunca substitui a Vida máxima editada do NPC. */
export function calcularVidaMaxima(dto: NpcVidaMaximaCalcularDto): number {
    const { base, multiplicador } = VIDA[dto.categoria];
    return base + (dto.nivel + dto.vigor) * multiplicador;
}
