import { describe, expect, it } from "vitest";
import { CategoriaNpcEnum } from "../../enums";
import type { FichaNpcDadosDto } from "../../dtos/ficha";
import { rolarFormula } from "../rolagem";
import { comporFormulaTesteAtributoNpc, obterCompetenciasPorCategoria,
    rolarTesteAtributoNpc, validarAjustesTesteNpc, validarCompetenciasNpc } from "./testes";

const dados: FichaNpcDadosDto = {
    identidadeNarrativa: { nome: "Veterano", funcao: "Teste" }, cooperacao: 5,
    vidaMaxima: 80, vidaAtual: 80, defesaBase: 16, bloquear: 17, esquivar: 17,
    energia: { maxima: 0, atual: 0, recargaPorTurno: null },
    sanidade: { sequelas: [], traumas: [] }, habilidades: [],
    condutaCombate: { gatilhosFuga: "Perigo", prioridadesAlvo: "Aliados", reacaoFerimentoSevero: "Abrigo" },
    categoria: CategoriaNpcEnum.VETERANO, nivel: 6,
    atributos: { destreza: 1, forca: 1, luta: 3, pontaria: 1, vigor: 1,
        intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1 },
    competencias: ["luta", "medicina", "sentidos"],
};
const sequencia = (...valores: number[]) => () => valores.shift()!;

describe("NPC — teste explícito e Competências (m4-19)", () => {
    it.each([[18, 28], [20, 32]])("D20 mantido %i com D6=4 totaliza %i", (d20, total) => {
        const resultado = rolarTesteAtributoNpc({ dados, atributo: "luta" }, sequencia(d20, 11, 8, 4));
        expect(resultado?.total).toBe(total);
        expect(resultado?.dados[1].valores).toEqual([4]);
    });
    it("sem Competência, não soma dado de Categoria", () => {
        expect(rolarTesteAtributoNpc({ dados: { ...dados, competencias: undefined }, atributo: "luta" },
            sequencia(18, 11, 8))?.total).toBe(24);
    });
    it.each([[CategoriaNpcEnum.CIVIL, 0, 0, 0], [CategoriaNpcEnum.OPERATIVO, 2, 1, 4],
        [CategoriaNpcEnum.VETERANO, 3, 1, 6], [CategoriaNpcEnum.ELITE, 4, 2, 6],
        [CategoriaNpcEnum.LENDARIO, 5, 3, 6]])("tabela da Categoria %s", (categoria, quantidade, contagem, faces) => {
        expect(obterCompetenciasPorCategoria({ categoria })).toEqual({ quantidade, dados: contagem, faces });
    });
    it("crítico de Competência não existe; fixo, nível e atributos não dobram", () => {
        const ajustado = { ...dados, modificadoresTeste: { luta: 5 }, dadosTeste: { luta: -2 } };
        expect(rolarTesteAtributoNpc({ dados: ajustado, atributo: "luta" }, sequencia(19, 6))?.total).toBe(36);
        expect(rolarTesteAtributoNpc({ dados: ajustado, atributo: "luta" }, sequencia(20, 6))?.total).toBe(39);
        expect(ajustado.atributos.luta).toBe(3);
    });
    it.each([0, -1])("pool %i mantém o menor com Competência baseada no atributo original", (pool) => {
        const ajustado = { ...dados, dadosTeste: { luta: pool - 3 } };
        const resultado = rolarTesteAtributoNpc({ dados: ajustado, atributo: "luta" },
            pool === 0 ? sequencia(20, 7, 4) : sequencia(20, 9, 7, 4));
        expect(resultado?.dados[0].desvantagem).toBe(true);
        expect(resultado?.dados[0].mantidos).toEqual([7]);
        expect(resultado?.total).toBe(17);
        expect(resultado?.atributos.some((contribuicao) => contribuicao.rotulo === "CRÍTICO")).toBe(false);
    });
    it("margem ampliada e repetições independentes aplicam +2 só uma vez por teste", () => {
        const resultado = rolarTesteAtributoNpc({ dados, atributo: "luta", margemCritico: 2, repeticoes: 2 },
            sequencia(19, 19, 18, 4, 18, 17, 16, 6));
        expect(resultado?.subResultados?.map((item) => item.total)).toEqual([31, 30]);
    });
    it("somente a ação NPC identifica teste com dois pools; a fórmula livre continua genérica", () => {
        const formula = comporFormulaTesteAtributoNpc({ dados, atributo: "luta" });
        expect(rolarFormula({ formula, atributos: dados.atributos, nivel: dados.nivel },
            sequencia(20, 11, 8, 4))?.total).toBe(30);
    });
    it("aceita legado, mas configuração/criação exige seleção canônica", () => {
        const legado = { ...dados, competencias: undefined };
        expect(validarCompetenciasNpc(legado)).toEqual([]);
        expect(validarCompetenciasNpc(legado, true)).not.toEqual([]);
        expect(validarCompetenciasNpc(dados, true)).toEqual([]);
        expect(validarCompetenciasNpc({ ...dados, competencias: ["luta", "luta", "sentidos"] })).not.toEqual([]);
        expect(validarCompetenciasNpc({ ...dados, atributos: { ...dados.atributos, luta: 0 } })).not.toEqual([]);
        expect(validarCompetenciasNpc({ ...dados, categoria: CategoriaNpcEnum.CIVIL })).not.toEqual([]);
    });
    it("ajustes permitem negativos, recusam fração, chave estranha e mapa não objeto", () => {
        expect(validarAjustesTesteNpc({ ...dados, dadosTeste: { luta: -20 }, modificadoresTeste: { luta: 99 } })).toEqual([]);
        for (const mapa of [{ luta: 1.5 }, { outro: 2 }, null, []]) {
            expect(validarAjustesTesteNpc({ ...dados, dadosTeste: mapa } as FichaNpcDadosDto)).not.toEqual([]);
        }
    });
});
