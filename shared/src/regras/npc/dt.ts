import type { NpcDtAtributoCalcularDto } from "../../dtos/ficha";

/** Guia de mestre — NPC > DTs de Atributos. Calculada por contexto, nunca persistida. */
export function calcularDtAtributo(dto: NpcDtAtributoCalcularDto): number {
    return 10 + dto.nivel + dto.valorAtributo * 2;
}
