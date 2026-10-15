import { describe, expect, it } from "vitest";
import { montarCronologiaTranscricao, resolverTextoTranscricao } from "./transcricao-tempo.util";

describe("contrato temporal de transcrição", () => {
    it("projeta offset sem alterar tempos brutos e preserva falas simultâneas", () => {
        const segmentos = [
            { identificador: "b", faixaIdentificador: "b", inicioMilissegundos: 5000,
                fimMilissegundos: 7000, deslocamentoMilissegundos: 2000 },
            { identificador: "a", faixaIdentificador: "a", inicioMilissegundos: 7000,
                fimMilissegundos: 9000, deslocamentoMilissegundos: 0 },
        ];
        const cronologia = montarCronologiaTranscricao(segmentos);
        expect(cronologia.map((segmento) => segmento.identificador)).toEqual(["a", "b"]);
        expect(cronologia[1]).toMatchObject({ inicioSessaoMilissegundos: 7000,
            fimSessaoMilissegundos: 9000, inicioMilissegundos: 5000 });
        expect(segmentos[0]).not.toHaveProperty("inicioSessaoMilissegundos");
    });
    it("preserva horário efetivo negativo e diferencia correção vazia", () => {
        expect(montarCronologiaTranscricao([{ identificador: "a", faixaIdentificador: "a",
            inicioMilissegundos: 1, fimMilissegundos: 10, deslocamentoMilissegundos: -20,
        }])[0].inicioSessaoMilissegundos).toBe(-19);
        expect(resolverTextoTranscricao({ textoOriginal: "Bruto", textoCorrigido: "" })).toBe("");
        expect(resolverTextoTranscricao({ textoOriginal: "Bruto", textoCorrigido: null }))
            .toBe("Bruto");
    });
    it.each([NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER])("recusa tempo inválido %s", (inicio) => {
        expect(() => montarCronologiaTranscricao([{ identificador: "a", faixaIdentificador: "a",
            inicioMilissegundos: inicio, fimMilissegundos: 10, deslocamentoMilissegundos: 0,
        }])).toThrow();
    });
    it("recusa intervalo invertido e overflow da soma", () => {
        expect(() => montarCronologiaTranscricao([{ identificador: "a", faixaIdentificador: "a",
            inicioMilissegundos: 11, fimMilissegundos: 10, deslocamentoMilissegundos: 0,
        }])).toThrow();
        expect(() => montarCronologiaTranscricao([{ identificador: "a", faixaIdentificador: "a",
            inicioMilissegundos: Number.MAX_SAFE_INTEGER, fimMilissegundos: Number.MAX_SAFE_INTEGER,
            deslocamentoMilissegundos: 1,
        }])).toThrow();
    });
});
