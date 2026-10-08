import { TestBed } from "@angular/core/testing";
import { RegrasConsultaService } from "./regras-consulta.service";

describe("RegrasConsultaService", () => {
    it("abre, solicita restauração em cada abertura e fecha", () => {
        const consulta = TestBed.inject(RegrasConsultaService);
        expect(consulta.aberto()).toBe(false);
        consulta.abrir();
        expect(consulta.aberto()).toBe(true);
        expect(consulta.solicitacao()).toBe(1);
        consulta.abrir();
        expect(consulta.solicitacao()).toBe(2);
        consulta.fechar();
        expect(consulta.aberto()).toBe(false);
    });
});
