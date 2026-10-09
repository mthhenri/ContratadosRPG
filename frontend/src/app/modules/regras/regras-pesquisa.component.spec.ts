import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { RegrasPesquisa } from "./regras-pesquisa.component";
import { RegrasPesquisaController } from "./regras-pesquisa.controller";
import { RegrasLeituraStore } from "./regras-leitura.store";
import { RegrasService } from "./regras.service";

describe("Campo de pesquisa dos livros", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        TestBed.configureTestingModule({ imports: [RegrasPesquisa], providers: [
            RegrasPesquisaController,
            { provide: RegrasService, useValue: { carregarDocumento: () => of(null) } },
        ] });
        TestBed.inject(RegrasLeituraStore).alterarTermoPesquisa("");
    });
    afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

    function preparar() {
        const fixture = TestBed.createComponent(RegrasPesquisa); fixture.detectChanges();
        const campo: HTMLInputElement = fixture.nativeElement.querySelector("input");
        const pesquisa = TestBed.inject(RegrasPesquisaController);
        const digitar = (valor: string) => {
            campo.value = valor; campo.dispatchEvent(new Event("input")); fixture.detectChanges();
        };
        return { fixture, campo, pesquisa, digitar };
    }

    it("espera 300 ms após a última alteração, sem pesquisar as letras intermediárias", () => {
        const { pesquisa, digitar } = preparar();
        digitar("vi"); vi.advanceTimersByTime(200); digitar("vida");
        vi.advanceTimersByTime(299); expect(pesquisa.termo()).toBe("");
        vi.advanceTimersByTime(1); expect(pesquisa.termo()).toBe("vida");
    });

    it("limpa imediatamente pelo × e cancela o termo pendente, mantendo foco no input", () => {
        const { fixture, pesquisa, campo, digitar } = preparar(); digitar("vida");
        fixture.nativeElement.querySelector('[aria-label="Limpar campo de pesquisa"]').click();
        fixture.detectChanges(); vi.advanceTimersByTime(500);
        expect(campo.value).toBe(""); expect(pesquisa.termo()).toBe("");
        expect(document.activeElement).toBe(campo);
    });

    it("Esc limpa antes da espera e Enter aplica o termo pendente uma vez", () => {
        const { campo, pesquisa, digitar } = preparar(); digitar("vida");
        campo.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        vi.advanceTimersByTime(500); expect(pesquisa.termo()).toBe("");
        digitar("defesa");
        campo.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        expect(pesquisa.termo()).toBe("defesa");
        vi.advanceTimersByTime(500); expect(pesquisa.termo()).toBe("defesa");
    });

    it("não grava uma pesquisa pendente após destruir o hospedeiro", () => {
        const { digitar } = preparar(); digitar("vida");
        const memoria = TestBed.inject(RegrasLeituraStore);
        TestBed.resetTestingModule(); vi.advanceTimersByTime(500);
        expect(memoria.termoPesquisa()).toBe("");
    });
});
