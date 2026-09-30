import type { FichaNpcMorrendoResolverDto } from "../../dtos/ficha";

/** NPC entra em Morrendo a zero; cura sozinha não o retira (guia > NPC > Vida). */
export function resolverMorrendo(dto: FichaNpcMorrendoResolverDto): boolean {
    return dto.vidaAtual <= 0 || dto.morrendo;
}
