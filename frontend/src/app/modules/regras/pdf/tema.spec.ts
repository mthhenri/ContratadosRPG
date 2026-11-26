import type { NormalizadoDocumento } from "@contratados-rpg/shared/livro";
import { razaoContraste } from "../../../core/services/tema.service";
import { comporLivro } from "./compositor";
import { PALETA_PDF, type Rgb, rgbDe, temaDoPdf } from "./paleta";
import { PincelFalso } from "./pincel-falso";

const hex = (cor: Rgb) => `#${cor.map((canal) => canal.toString(16).padStart(2, "0")).join("")}`;

describe("Tema do PDF", () => {
    it("segue a base de quem exporta: papel claro ou terminal escuro", () => {
        expect(temaDoPdf("claro").fundo).toEqual([255, 255, 255]);
        expect(temaDoPdf("escuro").fundo).toEqual([10, 12, 15]);
    });

    it("usa a cor de destaque da pessoa, sem mudar o vermelho da Vida", () => {
        const tema = temaDoPdf("escuro", "#4c8dd0");
        expect(rgbDe(PALETA_PDF.destaque, tema)).toEqual([76, 141, 208]);
        expect(rgbDe(PALETA_PDF.vida, tema)).toEqual([213, 48, 48]);
    });

    it("deixa passar a cor fixa que não é do tema", () => {
        expect(rgbDe([1, 2, 3], temaDoPdf("escuro"))).toEqual([1, 2, 3]);
    });

    it("mantém o texto legível sobre o fundo e sobre as caixas nas duas bases", () => {
        for (const tema of [temaDoPdf("claro"), temaDoPdf("escuro")]) {
            for (const fundo of [tema.fundo, tema.superficie, tema.zebra]) {
                for (const texto of [tema.texto, tema.secundario]) {
                    expect(razaoContraste(hex(texto), hex(fundo))).toBeGreaterThan(4.5);
                }
            }
            expect(razaoContraste(hex(tema.sobreEscuro), hex(tema.ameacaFundo)))
                .toBeGreaterThan(4.5);
        }
    });

    it("pinta o fundo de todas as páginas antes do resto", () => {
        const documento: NormalizadoDocumento = {
            tipo: "documento", id: "sistema", titulo: "Sistema", versao: "1",
            filhos: [{ tipo: "secao", nivel: 1, glifo: "⬢", titulo: "Um", ancora: "um",
                filhos: [{ tipo: "paragrafo", trechos: [{ tipo: "texto", texto: "Texto." }] }] }],
        };
        const pincel = new PincelFalso();
        const { paginas } = comporLivro(documento, { pincel });
        expect(pincel.fundos).toEqual(Array.from({ length: paginas }, (_, indice) => indice + 1));
    });
});
