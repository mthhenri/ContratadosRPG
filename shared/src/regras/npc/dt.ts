import type { NpcDtAtributoCalcularDto } from "../../dtos/ficha";

/** Rótulo da fórmula de `calcularDtAtributo`, para a UI não reescrever a regra (m4-21). */
export const ROTULO_FORMULA_DT_NPC = "10 + Nível + ATR×2";

/** Guia de mestre — NPC > DTs de Atributos. Calculada por contexto, nunca persistida. */
export function calcularDtAtributo(dto: NpcDtAtributoCalcularDto): number {
    return 10 + dto.nivel + dto.valorAtributo * 2;
}
