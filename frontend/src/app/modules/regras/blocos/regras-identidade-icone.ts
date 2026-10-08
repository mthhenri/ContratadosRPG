import { IconeNome } from "../../../shared/icone/icone.component";

const ICONES_IDENTIDADE: Readonly<Record<string, IconeNome>> = {
    combatente: "combatente", especialista: "especialista", suporte: "suporte",
    lutador: "lutador", mercenario: "mercenario", vanguarda: "vanguarda",
    engenheiro: "engenheiro", assassino: "assassino", academico: "academico",
    paramedico: "paramedico", diplomata: "diplomata", comandante: "comandante",
    "experimento bestial": "bestial", "experimento artificial": "artificial",
    "experimento hibrido": "hibrido", bestial: "bestial", artificial: "artificial",
    hibrido: "hibrido", civil: "civil", npc: "npc",
};

/** Identidade do catálogo aprovado, sem substituir nomes desconhecidos por outro domínio. */
export function recuperarIconeIdentidade(nome: string): IconeNome | undefined {
    return ICONES_IDENTIDADE[nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()];
}
