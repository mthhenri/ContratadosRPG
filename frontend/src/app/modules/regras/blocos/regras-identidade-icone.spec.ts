import { recuperarIconeIdentidade } from "./regras-identidade-icone";

describe("ícones de identidade do leitor", () => {
  it("preserva todos os nomes e aliases do leitor anterior", () => {
    const anteriores = {
      Combatente: "combatente", Especialista: "especialista", Suporte: "suporte",
      Lutador: "lutador", "Mercenário": "mercenario", Vanguarda: "vanguarda",
      Engenheiro: "engenheiro", Assassino: "assassino", "Acadêmico": "academico",
      "Paramédico": "paramedico", Diplomata: "diplomata", Comandante: "comandante",
      "Experimento Bestial": "bestial", "Experimento Artificial": "artificial",
      "Experimento Híbrido": "hibrido", Bestial: "bestial", Artificial: "artificial",
      "Híbrido": "hibrido", Civil: "civil", NPC: "npc",
    };
    for (const [rotulo, icone] of Object.entries(anteriores)) {
      expect(recuperarIconeIdentidade(`  ${rotulo.toUpperCase()}  `)).toBe(icone);
    }
    expect(recuperarIconeIdentidade("Experimento")).toBeUndefined();
    expect(recuperarIconeIdentidade("Desconhecido")).toBeUndefined();
  });
});
