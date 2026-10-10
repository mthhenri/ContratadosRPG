import { TestBed } from "@angular/core/testing";
import { RegrasModificacoesRender } from "./regras-modificacoes.component";

describe("RegrasModificacoesRender", () => {
    it("mostra a nota excepcional de custo/peso antes dos itens", () => {
        const fixture = TestBed.createComponent(RegrasModificacoesRender);
        fixture.componentRef.setInput("bloco", {
            tipo: "modificacoes", categoria: "Explosivos", cabecalho: [], linhas: [], itens: [],
            nota: [{ tipo: "texto", texto: "Modificações de Explosivos custam 250 $." }],
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector("app-regras-nota")?.textContent)
            .toContain("Modificações de Explosivos custam 250 $.");
    });
    it("desenha o empilhamento com o primitivo e torna Bloqueia legível", () => {
        const fixture = TestBed.createComponent(RegrasModificacoesRender);
        fixture.componentRef.setInput("bloco", {
            tipo: "modificacoes", categoria: "Corpo a Corpo", cabecalho: [], linhas: [], itens: [{
                nome: "Pesada", empilhamento: "■■■□□",
                efeito: [{ tipo: "texto", texto: "Efeito preservado" }],
                bloqueia: [{ tipo: "texto", texto: "Veloz" }],
            }],
        });
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        const empilhamento = raiz.querySelector("app-empilhamento");
        expect(empilhamento?.querySelectorAll(".empilhamento__caixa--inicial").length).toBe(3);
        expect(empilhamento?.querySelectorAll(".empilhamento__caixa--vazio").length).toBe(2);
        expect(empilhamento?.textContent?.trim()).toBe("");
        expect(raiz.querySelector(".regras-modificacoes__bloqueia")?.textContent)
            .toContain("Bloqueia: Veloz");
        expect(raiz.textContent).toContain("Efeito preservado");
    });
    it("mostra custo e peso da categoria e o peso próprio só quando difere", () => {
        const fixture = TestBed.createComponent(RegrasModificacoesRender);
        const texto = [{ tipo: "texto" as const, texto: "x" }];
        const item = (nome: string) => ({ nome, empilhamento: "■□", efeito: texto, bloqueia: texto });
        fixture.componentRef.setInput("bloco", {
            tipo: "modificacoes", categoria: "Corpo a Corpo", cabecalho: [], linhas: [],
            itens: [item("Balanceada"), item("Pesada"), item("Furtiva")],
        });
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        expect(raiz.querySelector(".regras-modificacoes__resumo")?.textContent)
            .toBe("Custo $ 750 por modificação · +0,2 peso por modificação");
        const pesos = Array.from(raiz.querySelectorAll(".regras-modificacoes__peso"))
            .map((peso) => peso.textContent);
        expect(pesos).toEqual(["+0,5 peso", "sem peso"]);
    });
    it("Armazenamento custa $ 300 e é sem peso por padrão", () => {
        const fixture = TestBed.createComponent(RegrasModificacoesRender);
        fixture.componentRef.setInput("bloco", {
            tipo: "modificacoes", categoria: "Armazenamento", cabecalho: [], linhas: [], itens: [],
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector(".regras-modificacoes__resumo")?.textContent)
            .toBe("Custo $ 300 por modificação · sem peso");
    });
});
