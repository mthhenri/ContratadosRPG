import { describe, expectTypeOf, it } from "vitest";
import type { CenaTipoEnum } from "../../enums";
import type {
    CenaDocumentoFocoInternoDefinirDto,
    CenaDocumentoFocoLimparDto,
    CenaTipoAlterarDto,
    CenaTipoInternoAlterarDto,
} from "./index";

describe("contrato de limpeza do foco da cena", () => {
    it("limpa por cena e representa ausência de vínculo explicitamente com null", () => {
        expectTypeOf<CenaDocumentoFocoLimparDto>().toEqualTypeOf<{ readonly cenaId: number }>();
        expectTypeOf<CenaDocumentoFocoInternoDefinirDto>().toEqualTypeOf<{
            readonly cenaId: number;
            readonly id: number | null;
        }>();
    });
});

describe("contrato da troca de tipo da cena", () => {
    it("recebe o id da rota e o tipo novo do enum", () => {
        expectTypeOf<CenaTipoAlterarDto>().toEqualTypeOf<{
            readonly id: number;
            readonly tipo: CenaTipoEnum;
        }>();
        expectTypeOf<CenaTipoInternoAlterarDto>().toEqualTypeOf<{
            readonly id: number;
            readonly tipo: CenaTipoEnum;
        }>();
    });
});
