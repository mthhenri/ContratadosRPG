import { descreverCondicao, separarCondicoesTexto } from "./condicoes";

describe("descrições de condições", () => {
    it("consulta nomes sem depender de maiúsculas e acentos e não inventa condição livre", () => {
        expect(descreverCondicao("  MORRENDO ")).toContain("Medicina");
        expect(descreverCondicao("Vulneravel")).toContain("-5 Defesa");
        expect(descreverCondicao("Efeito definido pela mesa")).toBe("");
        expect(descreverCondicao("constructor")).toBe("");
    });

    it("preserva texto e distingue condições de partes de palavras", () => {
        const texto = "Inconsciente, em chamas e Morrendo; atordoamento e cansados ficam intactos.";
        const partes = separarCondicoesTexto(texto);
        expect(partes.join("")).toBe(texto);
        expect(partes.filter((parte) => descreverCondicao(parte)))
            .toEqual(["Inconsciente", "em chamas", "Morrendo"]);
    });
});
