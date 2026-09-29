import { describe, expectTypeOf, it } from "vitest";
import type { CenaDocumentoFocoInternoDefinirDto, CenaDocumentoFocoLimparDto } from "./index";

describe("contrato de limpeza do foco da cena", () => {
    it("limpa por cena e representa ausência de vínculo explicitamente com null", () => {
        expectTypeOf<CenaDocumentoFocoLimparDto>().toEqualTypeOf<{ readonly cenaId: number }>();
        expectTypeOf<CenaDocumentoFocoInternoDefinirDto>().toEqualTypeOf<{
            readonly cenaId: number;
            readonly id: number | null;
        }>();
    });
});
