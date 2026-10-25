import { describe, expect, it } from "vitest";
import {
  CategoriaNpcEnum,
  TipoCampanhaMembroPapelEnum,
} from "@contratados-rpg/shared/enums";
import {
  consultarAtributosCriacao,
  validarFichaNpc,
} from "@contratados-rpg/shared/regras/npc";
import { validarDadosNpc } from "../../src/modules/ficha/ficha-npc-validacao.util";
import { CENARIO_DEV } from "./cenario-dev";

describe("NPCs padrão de desenvolvimento", () => {
  it("fornece três categorias em cada campanha, com posse exclusiva do mestre", () => {
    expect(CENARIO_DEV.npcs).toHaveLength(6);
    for (const campanha of CENARIO_DEV.campanhas) {
      const mestre = CENARIO_DEV.membros.find(
        (membro) =>
          membro.campanha === campanha.chave &&
          membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
      );
      const npcs = CENARIO_DEV.npcs.filter(
        (npc) => npc.campanha === campanha.chave,
      );
      expect(npcs.map(({ dados }) => dados.categoria)).toEqual([
        CategoriaNpcEnum.CIVIL,
        CategoriaNpcEnum.OPERATIVO,
        CategoriaNpcEnum.ELITE,
      ]);
      expect(npcs.every(({ usuario }) => usuario === mestre?.usuario)).toBe(
        true,
      );
    }
  });

  it.each(CENARIO_DEV.npcs.map((npc) => [npc.nome, npc] as const))(
    "%s respeita a criação completa, os recursos e o orçamento de atributos",
    (_nome, npc) => {
      const { dados } = npc;
      expect(() => validarDadosNpc(dados, true)).not.toThrow();
      expect(validarFichaNpc(dados).violacoes).toEqual([]);
      expect(
        consultarAtributosCriacao({
          categoria: dados.categoria,
          lutaCivilLiberada: false,
          pontariaCivilLiberada: false,
          atributos: dados.atributos,
        }).violacoes,
      ).toEqual([]);
      expect(dados.vidaAtual).toBe(dados.vidaMaxima);
      expect(dados.energia.atual).toBe(dados.energia.maxima);
      expect(dados.identidadeNarrativa.nome).toBe(npc.nome);
      expect(dados.inventario?.length).toBeGreaterThan(0);
      expect(
        Object.values(dados.condutaCombate).every((texto) => texto.length > 20),
      ).toBe(true);
      expect(dados.sanidade).toEqual({ sequelas: [], traumas: [] });
      if (dados.categoria === CategoriaNpcEnum.CIVIL) {
        expect(dados.energia.maxima).toBe(0);
        expect(dados.patenteEquivalente).toBeUndefined();
      }
      if (dados.categoria === CategoriaNpcEnum.ELITE)
        expect(dados.energia.recargaPorTurno).toBeGreaterThan(0);
    },
  );
});
