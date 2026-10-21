import { ClasseEnum } from "@contratados-rpg/shared/enums";
import type { IconeNome } from "../../../shared/icone/icone.component";
import { ICONE_ARQUETIPO, ICONE_CLASSE } from "../../../shared/icone/icones-dominio";

const ICONES_IDENTIDADE: Readonly<Record<string, IconeNome>> = {
    ...Object.fromEntries(Object.entries(ICONE_CLASSE)
        .map(([nome, icone]) => [nome.toLowerCase().replaceAll("_", " "), icone])),
    ...Object.fromEntries(Object.entries(ICONE_ARQUETIPO)
        .map(([nome, icone]) => [nome.toLowerCase(), icone])),
    bestial: ICONE_CLASSE[ClasseEnum.EXPERIMENTO_BESTIAL],
    artificial: ICONE_CLASSE[ClasseEnum.EXPERIMENTO_ARTIFICIAL],
    hibrido: ICONE_CLASSE[ClasseEnum.EXPERIMENTO_HIBRIDO],
    npc: "npc",
};

/** Identidade do catálogo aprovado, sem substituir nomes desconhecidos por outro domínio. */
export function recuperarIconeIdentidade(nome: string): IconeNome | undefined {
    return ICONES_IDENTIDADE[nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()];
}
