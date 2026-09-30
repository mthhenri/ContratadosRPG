import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { FichaService } from "./ficha.service";
import { criarFichaNpcTeste } from "./testing/ficha-npc.fixture";

describe("FichaService — consulta e edição de NPC", () => {
    beforeEach(() => TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
    }));
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it("recupera o documento pela rota própria, sem interpretar o NPC como jogador", () => {
        const ficha = criarFichaNpcTeste();
        const recebido = vi.fn();
        TestBed.inject(FichaService).recuperarFichaNpc(ficha.id).subscribe(recebido);
        const requisicao = TestBed.inject(HttpTestingController).expectOne("/ficha/npc/8");
        expect(requisicao.request.method).toBe("GET");
        requisicao.flush({ sucesso: true, dados: ficha, mensagem: "ok" });
        expect(recebido).toHaveBeenCalledExactlyOnceWith(ficha);
    });

    it("envia snapshots e documento completos na edição tipada", () => {
        const ficha = criarFichaNpcTeste();
        const alteracao = { nome: ficha.nome, dados: ficha.dados };
        const recebido = vi.fn();
        TestBed.inject(FichaService).alterarFichaNpc(ficha.id, alteracao).subscribe(recebido);
        const requisicao = TestBed.inject(HttpTestingController).expectOne("/ficha/npc/8");
        expect(requisicao.request.method).toBe("PUT");
        expect(requisicao.request.body).toEqual(alteracao);
        requisicao.flush({ sucesso: true, dados: ficha, mensagem: "ok" });
        expect(recebido).toHaveBeenCalledExactlyOnceWith(ficha);
    });

    it("ajusta Vida e Morrendo pela vitalidade própria sem enviar um documento inteiro", () => {
        const ficha = criarFichaNpcTeste();
        const recebido = vi.fn();
        TestBed.inject(FichaService).alterarVitalidadeNpc(ficha.id,
            { vidaAtual: 12, morrendo: false }).subscribe(recebido);
        const requisicao = TestBed.inject(HttpTestingController)
            .expectOne("/ficha/npc/8/vitalidade");
        expect(requisicao.request.method).toBe("PATCH");
        expect(requisicao.request.body).toEqual({ vidaAtual: 12, morrendo: false });
        requisicao.flush({ sucesso: true, dados: ficha, mensagem: "ok" });
        expect(recebido).toHaveBeenCalledExactlyOnceWith(ficha);
    });
});
